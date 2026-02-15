import { useMutation, useQuery } from 'convex/react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '~/src/auth/AuthContext'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ActionButton } from './ActionButton'
import {
  ActionDrawer,
  type ExecuteParams,
  type RequestDrawerProps,
} from './ActionDrawer'

export function ReceiveDrawer(props: RequestDrawerProps) {
  const { bottom } = useSafeAreaInsets()
  const { dbUser } = useAuth()
  const defaultToken = useQuery(api.tokens.getDefault)
  const createRequest = useMutation(api.requests.create)

  const handleExecute = async ({ splits, note }: ExecuteParams) => {
    if (!dbUser?._id || !defaultToken?._id)
      throw new Error('Not ready to request')
    await Promise.all(
      splits.map((split) =>
        createRequest({
          privyId: dbUser.privyId,
          requesterId: dbUser._id,
          tokenId: defaultToken._id,
          recipientId: split.userId as unknown as Id<'users'>,
          amount: split.amount.toFixed(2),
          note: note || undefined,
        }),
      ),
    )
  }

  return (
    <ActionDrawer
      {...props}
      mode="request"
      onExecute={handleExecute}
      renderActionButton={(p) => (
        <ActionButton
          mode={p.mode}
          disabled={p.disabled}
          loading={false}
          confirming={p.confirming}
          onPress={p.onPress}
          height={Platform.OS === 'web' ? 100 : 72 + bottom}
          confirm={p.pendingConfirm && !p.confirming}
          success={p.success}
          errorMessage={p.transactionError ?? undefined}
        />
      )}
    />
  )
}
