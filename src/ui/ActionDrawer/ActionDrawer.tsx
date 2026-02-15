import { useConvex } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { useSplitCalculator } from '~/src/hooks/useSplitCalculator'
import { evaluateExpression } from '~/src/utils/mathExpression'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { AddContactDrawer } from '../AddContactDrawer'
import { AmountDisplay } from '../AmountDisplay'
import { AppSheet } from '../AppSheet'
import { ConfirmationDisplay } from '../ConfirmationDisplay'
import { MathKeypad } from '../MathKeypad'
import { NoteInput } from '../NoteInput'
import { QRScannerDrawer } from '../QRScannerDrawer'
import {
  type Recipient,
  RecipientSearchBar,
  type SearchResult,
  UserSearchResults,
} from '../RecipientSearchBar'
import { SplitAmountDisplay } from '../SplitAmountDisplay'
import { getModeConfig } from './config'
import type { ActionDrawerProps, ActionMode, PrefilledRequest } from './types'

/** Props passed to the renderActionButton function */
export type ActionButtonRenderProps = {
  mode: ActionMode
  disabled: boolean
  loading: boolean
  confirming: boolean
  pendingConfirm: boolean
  success: boolean
  transactionError: string | null
  hasInsufficientBalance: boolean
  onPress: () => void
}

type ActionDrawerInternalProps = ActionDrawerProps & {
  /** Balance string for display (send mode only) */
  balance?: string
  /** Whether balance is loading */
  balanceLoading?: boolean
  /** Whether action is in progress (e.g., sending transaction) */
  isExecuting?: boolean
  /** Execute the action (send tokens or create request) */
  onExecute: (params: ExecuteParams) => Promise<void>
  /** Prefilled request data (send mode only) */
  prefilledRequest?: PrefilledRequest | null
  /** Callback when prefilled request is cleared */
  onClearPrefilled?: () => void
  /** Render function for the action button */
  renderActionButton?: (props: ActionButtonRenderProps) => React.ReactNode
}

export type ExecuteParams = {
  recipients: Recipient[]
  splits: Array<{ userId: Id<'users'>; amount: number }>
  note: string
  totalAmount: number
  activeRequestId?: Id<'requests'> | null
}

export function ActionDrawer({
  open,
  onOpenChange,
  mode,
  balance = '0',
  balanceLoading = false,
  isExecuting = false,
  onExecute,
  prefilledRequest,
  onClearPrefilled,
  prefilledUsername,
  onClearPrefilledUsername,
  prefilledContact,
  onClearPrefilledContact,
  renderActionButton,
}: ActionDrawerInternalProps) {
  const config = getModeConfig(mode)
  const { top } = useSafeAreaInsets()
  const convex = useConvex()
  const { dbUser } = useAuth()

  // Core state
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  // Drawer state
  const [loading, setLoading] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successAmount, setSuccessAmount] = useState('')
  const [transactionError, setTransactionError] = useState<string | null>(null)

  // Search state
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isAddingMore, setIsAddingMore] = useState(false)
  const [hasSearchCompleted, setHasSearchCompleted] = useState(false)

  // Split editing state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [editingUserAmount, setEditingUserAmount] = useState('')

  // Request fulfillment state (send mode only)
  const [activeRequestId, setActiveRequestId] = useState<Id<'requests'> | null>(
    null,
  )

  // QR and contact state
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [scannedAddress, setScannedAddress] = useState('')

  // Timeout refs for auto-resolve
  const inputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userAmountTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const prevSelectedUserIdRef = useRef<string | null>(null)

  // Computed values
  const totalAmount = evaluateExpression(amount)
  const isValidAmount = totalAmount > 0
  const hasRecipients = recipients.length > 0
  const isSearching = searchText.trim().length > 0 || isAddingMore
  const hasMultipleRecipients = recipients.length >= 2

  // Balance check (send mode only)
  const numericBalance = Number.parseFloat(balance) || 0
  const hasInsufficientBalance =
    config.checkBalance &&
    isValidAmount &&
    !balanceLoading &&
    totalAmount > numericBalance

  // Split calculator
  const { splits, setRecipientAmount, resetSplits, hasUnevenSplits } =
    useSplitCalculator({
      recipients,
      total: totalAmount,
      onTotalChange: (newTotal) => {
        setAmount(String(newTotal))
      },
    })

  // Initialize from prefilled request (send mode only)
  useEffect(() => {
    if (prefilledRequest && open) {
      const recipient: Recipient = {
        userId: prefilledRequest.recipientUserId,
        username: prefilledRequest.recipientUsername,
        avatarUrl:
          prefilledRequest.recipientAvatarUrl ||
          `https://api.dicebear.com/9.x/glass/png?seed=${prefilledRequest.recipientUserId}`,
      }
      setRecipients([recipient])
      const formattedAmount = prefilledRequest.amount.replace(/\.00$/, '')
      setAmount(formattedAmount)
      setNote(prefilledRequest.note || '')
      setActiveRequestId(prefilledRequest.requestId)
    }
  }, [prefilledRequest, open])

  // Initialize from prefilled username
  useEffect(() => {
    if (prefilledUsername && open) {
      setSearchText(prefilledUsername)
      setIsAddingMore(true)
      onClearPrefilledUsername?.()
    }
  }, [prefilledUsername, open, onClearPrefilledUsername])

  // Initialize from prefilled contact
  useEffect(() => {
    if (prefilledContact && open) {
      const recipient: Recipient = {
        userId: prefilledContact.contactId as Id<'users'>,
        username: prefilledContact.name,
        avatarUrl: prefilledContact.avatarUrl,
        isContact: true,
        address: prefilledContact.address,
      }
      setRecipients([recipient])
      onClearPrefilledContact?.()
    }
  }, [prefilledContact, open, onClearPrefilledContact])

  // Auto-resolve math expression after 1.5s (for total)
  useEffect(() => {
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current)
    }

    if (amount && /[+\-×÷]/.test(amount)) {
      inputTimeoutRef.current = setTimeout(() => {
        const resolved = evaluateExpression(amount)
        if (resolved <= 0) {
          setAmount('')
        } else {
          const formatted =
            resolved % 1 === 0 ? String(resolved) : resolved.toFixed(2)
          setAmount(formatted)
        }
      }, 1500)
    }

    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current)
      }
    }
  }, [amount])

  // Auto-resolve user amount after 1.5s
  useEffect(() => {
    if (userAmountTimeoutRef.current) {
      clearTimeout(userAmountTimeoutRef.current)
    }

    if (
      selectedUserId &&
      editingUserAmount &&
      /[+\-×÷]/.test(editingUserAmount)
    ) {
      userAmountTimeoutRef.current = setTimeout(() => {
        const resolved = evaluateExpression(editingUserAmount)
        if (resolved > 0) {
          const formatted =
            resolved % 1 === 0 ? String(resolved) : resolved.toFixed(2)
          setEditingUserAmount(formatted)
          setRecipientAmount(selectedUserId as Id<'users'>, resolved)
        }
      }, 1500)
    }

    return () => {
      if (userAmountTimeoutRef.current) {
        clearTimeout(userAmountTimeoutRef.current)
      }
    }
  }, [editingUserAmount, selectedUserId, setRecipientAmount])

  // When selecting a user, initialize their editing amount
  useEffect(() => {
    if (selectedUserId !== prevSelectedUserIdRef.current) {
      prevSelectedUserIdRef.current = selectedUserId
      if (selectedUserId) {
        const split = splits.find((s) => s.userId === selectedUserId)
        if (split) {
          setEditingUserAmount(
            split.amount % 1 === 0
              ? String(split.amount)
              : split.amount.toFixed(2),
          )
        }
      } else {
        setEditingUserAmount('')
      }
    }
  }, [selectedUserId, splits])

  // Reset all state
  const resetState = () => {
    setRecipients([])
    setAmount('')
    setNote('')
    setSearchText('')
    setSearchResults([])
    setSelectedUserId(null)
    setActiveRequestId(null)
    setPendingConfirm(false)
    setSuccess(false)
    setSuccessAmount('')
    setTransactionError(null)
    resetSplits()
  }

  // Parse transaction error to user-friendly message
  const parseTransactionError = (error: Error): string => {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('rejected') ||
      msg.includes('cancelled') ||
      msg.includes('user denied') ||
      msg.includes('user rejected')
    ) {
      return 'Cancelled'
    }
    return 'Failed'
  }

  // Handle action (send or request)
  const handleAction = async () => {
    if (!hasRecipients || !isValidAmount || !dbUser?._id) return

    // First press: show confirm
    if (!pendingConfirm) {
      setPendingConfirm(true)
      return
    }

    // Second press: execute action
    setLoading(true)
    setTransactionError(null)

    try {
      await onExecute({
        recipients,
        splits: splits.map((s) => ({ userId: s.userId, amount: s.amount })),
        note,
        totalAmount,
        activeRequestId,
      })

      // Show success state
      setSuccessAmount(String(totalAmount))
      setSuccess(true)
      setLoading(false)

      // Auto-close after 2 seconds
      setTimeout(() => {
        onOpenChange(false)
        resetState()
        onClearPrefilled?.()
      }, 2000)
    } catch (error) {
      console.error(`${mode} failed:`, error)
      const errorMessage = parseTransactionError(
        error instanceof Error ? error : new Error('Action failed'),
      )
      setTransactionError(errorMessage)
      setPendingConfirm(false)
      setLoading(false)

      // Clear error after 3 seconds
      setTimeout(() => {
        setTransactionError(null)
      }, 3000)
    }
  }

  // Handle drawer close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState()
      onClearPrefilled?.()
    }
    onOpenChange(isOpen)
  }

  // Handle recipient selection from search
  const handleSelectRecipient = (result: SearchResult) => {
    let newRecipient: Recipient
    if (result.type === 'user') {
      newRecipient = {
        userId: result._id,
        username: result.username,
        avatarUrl: result.avatarUrl,
      }
    } else {
      newRecipient = {
        userId: result._id as Id<'users'>,
        username: result.note,
        avatarUrl: result.avatarUrl,
        isContact: true,
        address: result.address,
      }
    }
    setRecipients([...recipients, newRecipient])
    setSearchText('')
    setSearchResults([])
    setIsAddingMore(false)
  }

  // Handle keypad input
  const handleKeypadChange = (value: string) => {
    if (selectedUserId) {
      setEditingUserAmount(value)
      const parsed = evaluateExpression(value)
      if (parsed > 0 && !/[+\-×÷]/.test(value)) {
        setRecipientAmount(selectedUserId as Id<'users'>, parsed)
      }
    } else {
      setAmount(value)
    }
  }

  const currentKeypadValue = selectedUserId ? editingUserAmount : amount

  // Handle user selection in split view
  const handleSelectUser = (userId: string | null) => {
    if (userId) {
      const split = splits.find((s) => s.userId === userId)
      if (split) {
        setEditingUserAmount(
          split.amount % 1 === 0
            ? String(split.amount)
            : split.amount.toFixed(2),
        )
      }
    } else {
      setEditingUserAmount('')
    }
    setSelectedUserId(userId)
  }

  // QR handlers
  const handleQRPress = () => setQrScannerOpen(true)

  const handleUsernameScanned = async (username: string) => {
    setQrScannerOpen(false)
    try {
      const user = await convex.query(api.users.getByUsername, { username })
      if (user) {
        const newRecipient: Recipient = {
          userId: user._id,
          username: user.username,
          avatarUrl: user.avatarUrl,
        }
        if (!recipients.some((r) => r.userId === user._id)) {
          setRecipients([...recipients, newRecipient])
        }
      } else {
        setSearchText(username)
        setIsAddingMore(true)
      }
    } catch (error) {
      console.error('Failed to look up user:', error)
      setSearchText(username)
      setIsAddingMore(true)
    }
  }

  const handleAddressScanned = (address: string) => {
    setQrScannerOpen(false)
    setScannedAddress(address)

    if (Platform.OS === 'web') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      setTimeout(() => setAddContactOpen(true), 150)
    } else {
      let opened = false
      const openDrawer = () => {
        if (!opened) {
          opened = true
          setAddContactOpen(true)
        }
      }
      const subscription = Keyboard.addListener('keyboardDidHide', () => {
        subscription.remove()
        openDrawer()
      })
      Keyboard.dismiss()
      setTimeout(() => {
        subscription.remove()
        openDrawer()
      }, 300)
    }
  }

  const handleQRError = (message: string) => {
    console.log('QR scan error:', message)
  }

  const handleContactSaved = (contact: {
    _id: string
    address: string
    note: string
    avatarUrl: string
  }) => {
    const newRecipient: Recipient = {
      userId: contact._id as Id<'users'>,
      username: contact.note,
      avatarUrl: contact.avatarUrl,
      isContact: true,
      address: contact.address,
    }
    setRecipients([...recipients, newRecipient])
    setAddContactOpen(false)
    setScannedAddress('')
    setIsAddingMore(false)
  }

  // Abbreviate balance for display
  const abbreviateBalance = (bal: string): string => {
    const num = Number.parseFloat(bal)
    if (Number.isNaN(num)) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(2)
  }

  // Action button props differ by mode
  const actionButtonDisabled =
    !hasRecipients ||
    !isValidAmount ||
    (config.checkBalance && hasInsufficientBalance) ||
    isExecuting ||
    loading

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      snapPoint={100}
      position={config.position}
      tintColor={config.tintColor}
      tintOpacity={0.3}
      disableSafeArea={config.disableSafeArea}
    >
      <YStack
        flex={1}
        pt={config.disableSafeArea && Platform.OS !== 'web' ? top + 8 : '$2'}
      >
        {/* Recipient Search Bar - hidden during success */}
        {!success && (
          <RecipientSearchBar
            mode={mode === 'send' ? 'send' : 'request'}
            recipients={recipients}
            onRecipientsChange={setRecipients}
            labelColor={config.labelColor}
            currentUserId={dbUser?._id}
            searchText={searchText}
            onSearchTextChange={(text) => {
              setSearchText(text)
              setHasSearchCompleted(false)
            }}
            onSearchResultsChange={(results) => {
              setSearchResults(results)
              setHasSearchCompleted(true)
            }}
            isAddingMore={isAddingMore}
            onAddingMoreChange={setIsAddingMore}
            onSplitEvenly={
              hasMultipleRecipients && hasUnevenSplits
                ? () => {
                    resetSplits()
                    setSelectedUserId(null)
                  }
                : undefined
            }
            onQRPress={handleQRPress}
            onAddressDetected={handleAddressScanned}
          />
        )}

        {/* Content Area */}
        {success ? (
          <ConfirmationDisplay
            amount={successAmount}
            label={config.successLabel}
          />
        ) : isSearching ? (
          <UserSearchResults
            results={searchResults}
            onSelect={handleSelectRecipient}
            searchText={searchText}
            hasSearchCompleted={hasSearchCompleted}
          />
        ) : hasMultipleRecipients ? (
          <SplitAmountDisplay
            splits={splits}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            onRemoveRecipient={(userId) => {
              setRecipients(recipients.filter((r) => r.userId !== userId))
            }}
            labelColor={config.labelColor}
            totalExpression={amount}
            userExpression={editingUserAmount}
          />
        ) : (
          <Pressable
            style={{ flex: 1, justifyContent: 'center', paddingVertical: 16 }}
            onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}
          >
            <AmountDisplay expression={amount} />
          </Pressable>
        )}

        {/* Note Input & Keypad - hidden during success */}
        {!success && (
          <>
            <NoteInput
              value={note}
              onChange={setNote}
              labelColor={config.labelColor}
              rightText={
                config.showBalance && !balanceLoading
                  ? `$${abbreviateBalance(balance)}`
                  : undefined
              }
            />
            <MathKeypad
              value={currentKeypadValue}
              onChange={handleKeypadChange}
              accentColor={config.accentColor}
            />

            {/* Action Button - rendered by wrapper via render prop */}
            {renderActionButton?.({
              mode,
              disabled: actionButtonDisabled,
              loading: false,
              confirming: isExecuting || loading,
              pendingConfirm,
              success,
              transactionError,
              hasInsufficientBalance,
              onPress: handleAction,
            })}
          </>
        )}
      </YStack>

      {/* QR Scanner Drawer */}
      <QRScannerDrawer
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        mode={config.qrScannerMode}
        onUsernameScanned={handleUsernameScanned}
        onAddressScanned={handleAddressScanned}
        onError={handleQRError}
      />

      {/* Add Contact Drawer */}
      <AddContactDrawer
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        address={scannedAddress}
        onSaved={handleContactSaved}
      />
    </AppSheet>
  )
}
