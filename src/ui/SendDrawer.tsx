import { useConvex, useMutation, useQuery } from 'convex/react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Address } from 'viem'
import { useAuth } from '~/src/auth/AuthContext'
import { useBalance } from '~/src/blockchain/useBalance'
import {
  type BatchRecipient,
  useSendTokens,
} from '~/src/blockchain/useSendTokens'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ActionButton } from './ActionButton'
import {
  ActionDrawer,
  type ExecuteParams,
  type SendDrawerProps,
} from './ActionDrawer'

export function SendDrawer({
  open,
  onOpenChange,
  prefilledRequest,
  onClearPrefilled,
  prefilledUsername,
  onClearPrefilledUsername,
  prefilledContact,
  onClearPrefilledContact,
}: SendDrawerProps) {
  const { bottom } = useSafeAreaInsets()
  const convex = useConvex()
  const { dbUser } = useAuth()
  const { balance, loading: balanceLoading } = useBalance(
    dbUser?.walletAddress as Address | undefined,
  )
  const defaultToken = useQuery(api.tokens.getDefault)
  const { send, sendBatch, isSending, reset: resetSendState } = useSendTokens()
  const completeRequest = useMutation(api.requests.complete)
  const createPayment = useMutation(api.payments.create)

  const handleExecute = async ({
    recipients,
    splits,
    note,
    activeRequestId,
  }: ExecuteParams): Promise<void> => {
    if (!dbUser?._id || !defaultToken?._id) {
      throw new Error('Not ready to send')
    }

    // Step 1: Resolve wallet addresses for all recipients
    const recipientsWithAddresses: BatchRecipient[] = await Promise.all(
      splits.map(async (split) => {
        const recipient = recipients.find((r) => r.userId === split.userId)
        let walletAddress: string

        if (recipient?.isContact && recipient.address) {
          walletAddress = recipient.address
        } else if (recipient?.isContact) {
          const result = await convex.query(api.users.getWalletAddress, {
            contactId: split.userId as unknown as Id<'contacts'>,
          })
          walletAddress = result.walletAddress
        } else {
          const result = await convex.query(api.users.getWalletAddress, {
            userId: split.userId as Id<'users'>,
          })
          walletAddress = result.walletAddress
        }

        return {
          to: walletAddress as Address,
          amount: split.amount.toFixed(2),
          memo: note || undefined,
        }
      }),
    )

    // Step 2: Execute on-chain transfers
    let txHashes: string[]
    if (recipientsWithAddresses.length === 1) {
      const { to, amount, memo } = recipientsWithAddresses[0]
      const hash = await send(to, amount, memo)
      txHashes = [hash]
    } else {
      txHashes = await sendBatch(recipientsWithAddresses)
    }

    // Step 3: Create DB records with corresponding tx hash for each recipient
    await Promise.all(
      splits.map((split, index) => {
        const recipient = recipients.find((r) => r.userId === split.userId)
        return createPayment({
          privyId: dbUser.privyId,
          senderId: dbUser._id,
          recipientId: recipient?.isContact
            ? undefined
            : (split.userId as Id<'users'>),
          contactId: recipient?.isContact
            ? (split.userId as unknown as Id<'contacts'>)
            : undefined,
          amount: split.amount.toFixed(2),
          tokenId: defaultToken._id,
          note: note || undefined,
          transactionHash: txHashes[index],
        })
      }),
    )

    // If fulfilling a request, mark it complete
    if (activeRequestId) {
      await completeRequest({
        privyId: dbUser.privyId,
        requestId: activeRequestId,
      })
    }

    // Reset send hook state
    resetSendState()
  }

  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      mode="send"
      balance={balance}
      balanceLoading={balanceLoading}
      isExecuting={isSending}
      onExecute={handleExecute}
      prefilledRequest={prefilledRequest}
      onClearPrefilled={onClearPrefilled}
      prefilledUsername={prefilledUsername}
      onClearPrefilledUsername={onClearPrefilledUsername}
      prefilledContact={prefilledContact}
      onClearPrefilledContact={onClearPrefilledContact}
      renderActionButton={({
        mode,
        disabled,
        confirming,
        pendingConfirm,
        success,
        transactionError,
        hasInsufficientBalance,
        onPress,
      }) => (
        <ActionButton
          mode={mode}
          disabled={disabled}
          loading={false}
          confirming={confirming}
          onPress={onPress}
          height={Platform.OS === 'web' ? 100 : 72 + bottom}
          confirm={pendingConfirm && !confirming}
          success={success}
          errorMessage={
            transactionError ??
            (hasInsufficientBalance ? 'Not enough funds' : undefined)
          }
        />
      )}
    />
  )
}
