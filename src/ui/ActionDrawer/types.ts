import type { Id } from '../../../convex/_generated/dataModel'

/**
 * ActionDrawer mode - determines appearance and behavior
 */
export type ActionMode = 'send' | 'request'

/**
 * Prefilled request data (for fulfilling payment requests in send mode)
 */
export type PrefilledRequest = {
  requestId: Id<'requests'>
  amount: string
  recipientUsername: string
  recipientAvatarUrl?: string
  recipientUserId: Id<'users'>
  note?: string
}

/**
 * Prefilled contact data (for sending/requesting from contacts)
 */
export type PrefilledContact = {
  contactId: string
  name: string
  address: string
  avatarUrl: string
}

/**
 * Common props for ActionDrawer
 */
export type ActionDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ActionMode
  prefilledUsername?: string | null
  onClearPrefilledUsername?: () => void
  prefilledContact?: PrefilledContact | null
  onClearPrefilledContact?: () => void
}

/**
 * Send-specific props (extends ActionDrawerProps)
 */
export type SendDrawerProps = Omit<ActionDrawerProps, 'mode'> & {
  prefilledRequest?: PrefilledRequest | null
  onClearPrefilled?: () => void
}

/**
 * Request-specific props (extends ActionDrawerProps)
 */
export type RequestDrawerProps = Omit<ActionDrawerProps, 'mode'>

/**
 * Recipient for send/request flows
 */
export type Recipient = {
  userId: Id<'users'>
  username: string
  avatarUrl: string
  isContact?: boolean
  address?: string
}

/**
 * Drawer state (managed by useDrawerState hook)
 */
export type DrawerState = {
  loading: boolean
  pendingConfirm: boolean
  success: boolean
  successAmount: string
  transactionError: string | null
}

/**
 * Split amount for a recipient
 */
export type RecipientSplit = {
  userId: Id<'users'>
  username: string
  avatarUrl: string
  amount: number
}
