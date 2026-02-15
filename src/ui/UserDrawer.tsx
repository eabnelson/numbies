import { ArrowUp, Camera, ChevronLeft, QrCode, X } from '@tamagui/lucide-icons'
import { useConvex, useMutation, useQuery } from 'convex/react'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { Avatar, Input, Text, useTheme, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { usePrivyAuth } from '~/src/auth/privy/usePrivyAuth'
import { chainConfig } from '~/src/blockchain/chainConfig'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { getUserAvatarUrl } from '../utils/avatar'
import { formatAmount, formatRelativeTime } from '../utils/formatters'
import { AddContactDrawer } from './AddContactDrawer'
import { AppSheet, SheetScrollView } from './AppSheet'
import { ContactDetailView } from './ContactDetailView'
import { ContactsList } from './ContactsList'
import { ImageCropper } from './ImageCropper'
import { QRScannerDrawer } from './QRScannerDrawer'

type UserDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPayRequest?: (request: {
    requestId: Id<'requests'>
    amount: string
    recipientUsername: string
    recipientAvatarUrl?: string
    recipientUserId: Id<'users'>
    note?: string
  }) => void
  onSendToContact?: (contact: {
    contactId: string
    name: string
    address: string
    avatarUrl: string
  }) => void
  onRequestFromContact?: (contact: {
    contactId: string
    name: string
    address: string
    avatarUrl: string
  }) => void
}

// Validate username format
const validateUsername = (username: string): string | null => {
  if (!username.trim()) return null
  if (username.length > 15) return 'Must be 15 characters or less'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Only A-Z, 0-9, _'
  return null
}

export function UserDrawer({
  open,
  onOpenChange,
  onPayRequest,
  onSendToContact,
  onRequestFromContact,
}: UserDrawerProps) {
  const theme = useTheme()
  const { dbUser, needsUsername, setUsername, updateAvatarUrl } = useAuth()
  const { logout } = usePrivyAuth()
  const convex = useConvex()

  // Get pending requests, payments, and contacts
  const _requestCount = useQuery(
    api.requests.getPendingCount,
    dbUser?._id ? { userId: dbUser._id } : 'skip',
  )
  const requests = useQuery(
    api.requests.getByUserWithDetails,
    dbUser?._id ? { userId: dbUser._id } : 'skip',
  )
  const payments = useQuery(
    api.payments.getByUserWithDetails,
    dbUser?._id ? { userId: dbUser._id } : 'skip',
  )
  const contacts = useQuery(
    api.contacts.getByUserId,
    dbUser?._id ? { userId: dbUser._id } : 'skip',
  )
  const rejectRequest = useMutation(api.requests.reject)
  const dismissRequest = useMutation(api.requests.dismiss)
  const cancelRequest = useMutation(api.requests.cancel)

  const [showReceived, setShowReceived] = useState(false)
  const [showSent, setShowSent] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [selectedContact, setSelectedContact] = useState<{
    _id: Id<'contacts'>
    address: string
    note: string
    avatarUrl: string
  } | null>(null)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [addContactAddress, setAddContactAddress] = useState<string | null>(
    null,
  )
  const [usernameInput, setUsernameInput] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isTaken, setIsTaken] = useState(false)
  const [isCurrent, setIsCurrent] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl)
  const updateAvatar = useMutation(api.users.updateAvatar)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine if we're in editing mode (either explicitly editing or needs username)
  const showEditInput = isEditing || needsUsername

  // Keep trying to focus input while user needs username (Privy modal may steal focus)
  useEffect(() => {
    if (!open || !needsUsername) return

    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }, 200)

    return () => clearInterval(interval)
  }, [open, needsUsername])

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setUsernameInput('')
      setError('')
      setIsAvailable(false)
      setIsTaken(false)
      setIsCurrent(false)
      setShowReceived(false)
      setShowSent(false)
      setShowContacts(false)
      setSelectedContact(null)
      setQrScannerOpen(false)
      setAddContactAddress(null)
      setSelectedImageUri(null)
    }
  }, [open])

  // Check username availability with debounce using imperative query
  const checkUsernameAvailability = useCallback(
    (username: string) => {
      // Clear any pending check
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }

      // Validate format first
      const validationError = validateUsername(username)
      if (validationError) {
        setError(validationError)
        setIsAvailable(false)
        setIsTaken(false)
        setIsChecking(false)
        return
      }

      // If username is the same as current, show "current username" message
      if (username === dbUser?.username) {
        setError('')
        setIsAvailable(false)
        setIsTaken(false)
        setIsCurrent(true)
        setIsChecking(false)
        return
      }

      setIsCurrent(false)

      setIsChecking(true)
      setError('')
      setIsTaken(false)

      // Debounce the query
      checkTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await convex.query(api.users.checkUsernameAvailable, {
            username,
          })
          setIsAvailable(result.available)
          setIsTaken(!result.available)
        } catch {
          setError('Failed to check availability')
          setIsAvailable(false)
          setIsTaken(false)
        } finally {
          setIsChecking(false)
        }
      }, 300)
    },
    [dbUser?.username, convex],
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [])

  const handleUsernameChange = (value: string) => {
    setUsernameInput(value)
    setError('')
    setIsAvailable(false)
    setIsTaken(false)
    setIsCurrent(false)
    if (value.trim()) {
      checkUsernameAvailability(value)
    }
  }

  const handleSave = async () => {
    const validationError = validateUsername(usernameInput)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setError('')
      setIsSaving(true)
      await setUsername(usernameInput)
      setIsEditing(false)
      setUsernameInput('')
      setIsAvailable(false)
      setIsTaken(false)
      setIsCurrent(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Username taken, try another')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    onOpenChange(false)
    logout()
  }

  // Upload image blob to Convex
  const uploadImageBlob = useCallback(
    async (blob: Blob) => {
      if (!dbUser?.privyId) return

      setIsUploadingAvatar(true)
      try {
        // Get upload URL from Convex
        const uploadUrl = await generateUploadUrl()

        // Upload to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'image/jpeg' },
          body: blob,
        })

        if (!uploadResponse.ok) {
          throw new Error('Upload failed')
        }

        const { storageId } = await uploadResponse.json()

        // Update user's avatar and get the new URL
        const newAvatarUrl = await updateAvatar({
          privyId: dbUser.privyId,
          storageId,
        })

        // Update avatar in AuthContext so all components see it immediately
        if (newAvatarUrl) {
          updateAvatarUrl(newAvatarUrl)
        }
      } catch (error) {
        console.error('Failed to upload avatar:', error)
      } finally {
        setIsUploadingAvatar(false)
      }
    },
    [dbUser?.privyId, generateUploadUrl, updateAvatar, updateAvatarUrl],
  )

  // Handle file input change (web) - show cropper
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Create blob URL for the cropper
      const uri = URL.createObjectURL(file)
      setSelectedImageUri(uri)

      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [],
  )

  // Handle cropped image from cropper (web only)
  const handleCropSave = useCallback(
    async (blob: Blob) => {
      // Revoke blob URL if it was a web blob URL
      if (selectedImageUri?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImageUri)
      }
      setSelectedImageUri(null)
      await uploadImageBlob(blob)
    },
    [selectedImageUri, uploadImageBlob],
  )

  const handleCropCancel = useCallback(() => {
    // Revoke blob URL if it was a web blob URL
    if (selectedImageUri?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageUri)
    }
    setSelectedImageUri(null)
  }, [selectedImageUri])

  // Avatar picker - uses file input + custom cropper on web, expo-image-picker with built-in cropper on native
  const handleAvatarPress = useCallback(async () => {
    if (isUploadingAvatar || !dbUser?.privyId) return

    // On web, trigger file input (then show custom cropper)
    if (Platform.OS === 'web') {
      fileInputRef.current?.click()
      return
    }

    // On native, use expo-image-picker with built-in circular cropper
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      console.log('Permission denied')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Use iOS built-in cropper
      aspect: [1, 1], // Square aspect ratio
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return

    // Upload the cropped image directly
    const response = await fetch(result.assets[0].uri)
    const blob = await response.blob()
    await uploadImageBlob(blob)
  }, [isUploadingAvatar, dbUser?.privyId, uploadImageBlob])

  const handleStartEditing = () => {
    setUsernameInput('')
    setIsEditing(true)
    setIsAvailable(false)
    setIsTaken(false)
    setIsCurrent(false)
    setError('')
    // Focus input after state update renders the input
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleCancelEditing = () => {
    setIsEditing(false)
    setUsernameInput('')
    setError('')
    setIsAvailable(false)
    setIsTaken(false)
    setIsCurrent(false)
  }

  const handleBlur = async () => {
    // Auto-save if username is available and valid
    if (isAvailable && !error && !isChecking && usernameInput.trim()) {
      await handleSave()
    } else if (!needsUsername) {
      // Only cancel editing if user already has a username
      handleCancelEditing()
    }
  }

  // If closing without a username, show error and keep open
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && needsUsername) {
      setError('Username required')
      return
    }
    onOpenChange(isOpen)
  }

  // Get avatar URL - use stored URL if available, otherwise generate from ID
  const avatarUrl = getUserAvatarUrl(
    dbUser?._id || 'numbies',
    dbUser?.avatarUrl,
  )

  // Request handlers
  const handleRejectRequest = async (requestId: Id<'requests'>) => {
    if (!dbUser?.privyId) return
    await rejectRequest({ privyId: dbUser.privyId, requestId })
  }

  const handleDismissRequest = async (requestId: Id<'requests'>) => {
    if (!dbUser?.privyId) return
    await dismissRequest({ privyId: dbUser.privyId, requestId })
  }

  const handleCancelRequest = async (requestId: Id<'requests'>) => {
    if (!dbUser?.privyId) return
    await cancelRequest({ privyId: dbUser.privyId, requestId })
  }

  const handlePayRequest = (
    request: NonNullable<typeof requests>['asRecipient'][number],
  ) => {
    if (!request.requester) return
    onPayRequest?.({
      requestId: request._id,
      amount: request.amount,
      recipientUsername: request.requester.username || '',
      recipientAvatarUrl: request.requester.avatarUrl,
      recipientUserId: request.requesterId,
      note: request.note,
    })
    onOpenChange(false)
  }

  // Filter requests for badge counts (only pending)
  // asRequester = requests YOU sent (money you'll receive)
  // asRecipient = requests others sent to you (money they want from you)
  const pendingRequestsYouSent = (requests?.asRequester || []).filter(
    (r) => r.status === 'pending',
  )
  const pendingRequestsToYou = (requests?.asRecipient || []).filter(
    (r) => r.status === 'pending',
  )

  // Filter requests for display
  // "received" shows requests BY you - pending/rejected (not cancelled, not dismissed)
  const pendingRequestsYouSentForDisplay = (requests?.asRequester || [])
    .filter(
      (r) =>
        r.status !== 'cancelled' &&
        r.status !== 'completed' &&
        !r.dismissedByRequester,
    )
    .sort((a, b) => b._creationTime - a._creationTime)

  // "sent" shows requests FROM others - pending/cancelled (not rejected, not completed)
  const pendingRequestsFromOthers = (requests?.asRecipient || [])
    .filter((r) => r.status !== 'rejected' && r.status !== 'completed')
    .sort((a, b) => b._creationTime - a._creationTime)

  // Completed requests (for the "completed" section)
  const completedRequestsYouSent = (requests?.asRequester || []).filter(
    (r) => r.status === 'completed',
  )
  const completedRequestsFromOthers = (requests?.asRecipient || []).filter(
    (r) => r.status === 'completed',
  )

  // Combine completed items (payments + completed requests) sorted by time
  const receivedCompleted = [
    ...(payments?.received || []).map((p) => ({
      ...p,
      itemType: 'payment' as const,
    })),
    ...completedRequestsYouSent.map((r) => ({
      ...r,
      itemType: 'request' as const,
    })),
  ].sort((a, b) => b._creationTime - a._creationTime)

  const sentCompleted = [
    ...(payments?.sent || []).map((p) => ({
      ...p,
      itemType: 'payment' as const,
    })),
    ...completedRequestsFromOthers.map((r) => ({
      ...r,
      itemType: 'request' as const,
    })),
  ].sort((a, b) => b._creationTime - a._creationTime)

  // Render completed item row (payment or completed request)
  const renderCompletedItem = (
    item: (typeof receivedCompleted)[number],
    isReceived: boolean,
  ) => {
    const isPayment = item.itemType === 'payment'

    // For sent payments, check if it's to a contact (no recipient, has contact)
    const contact = isPayment
      ? (item as { contact?: { _id: string; note: string; avatarUrl: string } })
          .contact
      : null

    const otherUser = isReceived
      ? isPayment
        ? (item as (typeof receivedCompleted)[number] & { sender?: unknown })
            .sender
        : (item as (typeof receivedCompleted)[number] & { recipient?: unknown })
            .recipient
      : isPayment
        ? (item as (typeof receivedCompleted)[number] & { recipient?: unknown })
            .recipient
        : (item as (typeof receivedCompleted)[number] & { requester?: unknown })
            .requester

    // For contact payments (sent to contacts, not users), use contact info
    const isContactPayment = !isReceived && isPayment && !otherUser && contact
    const displayId = isContactPayment
      ? contact._id
      : (otherUser as { _id?: string } | undefined)?._id || 'numbies'
    const displayAvatar = isContactPayment
      ? contact.avatarUrl
      : (otherUser as { avatarUrl?: string } | undefined)?.avatarUrl
    const displayName = isContactPayment
      ? contact.note
      : (otherUser as { username?: string } | undefined)?.username

    const itemAvatarUrl = getUserAvatarUrl(displayId, displayAvatar)

    // Get transaction hash for payments (web only - opens explorer)
    const transactionHash = isPayment
      ? (item as { transactionHash?: string }).transactionHash
      : undefined
    const canOpenExplorer =
      Platform.OS === 'web' && isPayment && transactionHash

    const handlePress = () => {
      if (canOpenExplorer && transactionHash) {
        window.open(
          `${chainConfig.explorerUrl}/tx/${transactionHash}`,
          '_blank',
        )
      }
    }

    return (
      <XStack
        key={item._id}
        items="center"
        justify="space-between"
        py="$3"
        onPress={canOpenExplorer ? handlePress : undefined}
        cursor={canOpenExplorer ? 'pointer' : undefined}
        pressStyle={canOpenExplorer ? { opacity: 0.7 } : undefined}
      >
        <XStack items="center" gap="$2">
          <Avatar circular size="$4">
            <Avatar.Image src={itemAvatarUrl} />
            <Avatar.Fallback bg="$color5" />
          </Avatar>
          <YStack>
            <Text fontSize="$5" fontWeight="600">
              {isContactPayment
                ? `  ${displayName || 'Contact'}`
                : `@${displayName || 'unknown'}`}
            </Text>
            {item.note && (
              <Text fontSize="$3" opacity={0.5} numberOfLines={1}>
                {item.note}
              </Text>
            )}
          </YStack>
        </XStack>
        <YStack items="flex-end">
          <Text
            fontSize="$5"
            fontWeight="600"
            color={isReceived ? '$brandGreen' : '$brandBlue'}
          >
            ${formatAmount(item.amount)}
          </Text>
          <Text fontSize="$3" opacity={0.5}>
            {formatRelativeTime(item._creationTime)}
          </Text>
        </YStack>
      </XStack>
    )
  }

  // Render request row for "received" screen (requests BY you)
  const renderRequestByYou = (
    request: (typeof pendingRequestsYouSentForDisplay)[number],
  ) => {
    const otherUser = request.recipient
    const itemAvatarUrl = getUserAvatarUrl(
      otherUser?._id || 'numbies',
      otherUser?.avatarUrl,
    )
    const isPending = request.status === 'pending'
    const isRejected = request.status === 'rejected'

    return (
      <XStack key={request._id} items="center" justify="space-between" py="$3">
        <XStack items="center" gap="$3">
          <Avatar circular size="$4">
            <Avatar.Image src={itemAvatarUrl} />
            <Avatar.Fallback bg="$color5" />
          </Avatar>
          <YStack>
            <Text fontSize="$5" fontWeight="600">
              @{otherUser?.username || 'unknown'}
            </Text>
            {request.note && (
              <Text fontSize="$3" opacity={0.5} numberOfLines={1}>
                {request.note}
              </Text>
            )}
          </YStack>
        </XStack>
        <XStack items="center" gap="$2">
          <YStack items="flex-end">
            <Text fontSize="$5" fontWeight="600">
              ${formatAmount(request.amount)}
            </Text>
            {isRejected ? (
              <Text fontSize="$3" color="$brandRed">
                rejected
              </Text>
            ) : (
              <Text fontSize="$3" opacity={0.5}>
                {formatRelativeTime(request._creationTime)}
              </Text>
            )}
          </YStack>
          {/* X button: cancel if pending, dismiss if rejected */}
          {(isPending || isRejected) && (
            <XStack
              onPress={() =>
                isPending
                  ? handleCancelRequest(request._id)
                  : handleDismissRequest(request._id)
              }
              cursor="pointer"
              pressStyle={{ opacity: 0.3 }}
              opacity={0.5}
              px="$1"
            >
              <X size={18} color="$color12" strokeWidth={3} />
            </XStack>
          )}
        </XStack>
      </XStack>
    )
  }

  // Render request row for "sent" screen (requests FROM others)
  const renderRequestFromOther = (
    request: (typeof pendingRequestsFromOthers)[number],
  ) => {
    const otherUser = request.requester
    const itemAvatarUrl = getUserAvatarUrl(
      otherUser?._id || 'numbies',
      otherUser?.avatarUrl,
    )
    const isPending = request.status === 'pending'
    const isCancelled = request.status === 'cancelled'

    return (
      <XStack key={request._id} items="center" justify="space-between" py="$3">
        {/* Left: X button (reject) + Avatar + Username */}
        <XStack items="center" gap="$2">
          {isPending && (
            <XStack
              onPress={() => handleRejectRequest(request._id)}
              cursor="pointer"
              pressStyle={{ opacity: 0.3 }}
              opacity={0.5}
              pr="$2"
            >
              <X size={18} color="$color12" strokeWidth={3} />
            </XStack>
          )}
          <XStack items="center" gap="$2">
            <Avatar circular size="$4">
              <Avatar.Image src={itemAvatarUrl} />
              <Avatar.Fallback bg="$color5" />
            </Avatar>
            <YStack>
              <Text fontSize="$5" fontWeight="600">
                @{otherUser?.username || 'unknown'}
              </Text>
              {request.note && (
                <Text fontSize="$3" opacity={0.5} numberOfLines={1}>
                  {request.note}
                </Text>
              )}
            </YStack>
          </XStack>
        </XStack>
        {/* Right: Amount + Date + ArrowUp (pay) */}
        <XStack items="center" gap="$2">
          <YStack items="flex-end">
            <Text fontSize="$5" fontWeight="600">
              ${formatAmount(request.amount)}
            </Text>
            {isCancelled ? (
              <Text fontSize="$3" opacity={0.5}>
                cancelled
              </Text>
            ) : (
              <Text fontSize="$3" opacity={0.5}>
                {formatRelativeTime(request._creationTime)}
              </Text>
            )}
          </YStack>
          {isPending && (
            <XStack
              onPress={() => handlePayRequest(request)}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              pl="$2"
            >
              <ArrowUp size={24} color="$brandBlue" strokeWidth={3} />
            </XStack>
          )}
        </XStack>
      </XStack>
    )
  }

  const hasReceivedContent =
    pendingRequestsYouSentForDisplay.length > 0 || receivedCompleted.length > 0
  const hasSentContent =
    pendingRequestsFromOthers.length > 0 || sentCompleted.length > 0

  const content = showReceived ? (
    // Received Screen
    <YStack flex={1} p={16}>
      <XStack items="center" gap="$2" mb="$4">
        <XStack
          onPress={() => setShowReceived(false)}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
          p="$1"
          items="center"
          justify="center"
        >
          <ChevronLeft size={32} color={theme.brandGreen.val} />
        </XStack>
        <Text
          fontSize="$8"
          fontWeight="900"
          textTransform="uppercase"
          letterSpacing={3}
          color="$brandGreen"
        >
          received
        </Text>
      </XStack>

      <SheetScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack>
          {!hasReceivedContent ? (
            <Text
              fontSize="$4"
              opacity={0.5}
              mt="$8"
              style={{ textAlign: 'center' }}
            >
              No received payments yet
            </Text>
          ) : (
            <>
              {/* Requests BY you section */}
              {pendingRequestsYouSentForDisplay.length > 0 && (
                <>
                  <Text
                    fontSize="$3"
                    opacity={0.5}
                    style={{ textAlign: 'center' }}
                    mt="$2"
                  >
                    requested by you
                  </Text>
                  {pendingRequestsYouSentForDisplay.map(renderRequestByYou)}
                </>
              )}
              {/* Completed section */}
              {receivedCompleted.length > 0 && (
                <>
                  {pendingRequestsYouSentForDisplay.length > 0 && (
                    <Text
                      fontSize="$3"
                      opacity={0.5}
                      style={{ textAlign: 'center' }}
                      mt="$4"
                    >
                      completed
                    </Text>
                  )}
                  {receivedCompleted.map((item) =>
                    renderCompletedItem(item, true),
                  )}
                </>
              )}
            </>
          )}
        </YStack>
      </SheetScrollView>
    </YStack>
  ) : showSent ? (
    // Sent Screen
    <YStack flex={1} p={16}>
      <XStack items="center" gap="$2" mb="$4">
        <XStack
          onPress={() => setShowSent(false)}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
          p="$1"
          items="center"
          justify="center"
        >
          <ChevronLeft size={32} color={theme.brandBlue.val} />
        </XStack>
        <Text
          fontSize="$8"
          fontWeight="900"
          textTransform="uppercase"
          letterSpacing={3}
          color="$brandBlue"
        >
          sent
        </Text>
      </XStack>

      <SheetScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack>
          {!hasSentContent ? (
            <Text
              fontSize="$4"
              opacity={0.5}
              mt="$8"
              style={{ textAlign: 'center' }}
            >
              No sent payments yet
            </Text>
          ) : (
            <>
              {/* Requests FROM others section */}
              {pendingRequestsFromOthers.length > 0 && (
                <>
                  <Text
                    fontSize="$3"
                    opacity={0.5}
                    style={{ textAlign: 'center' }}
                    mt="$2"
                  >
                    requested from you
                  </Text>
                  {pendingRequestsFromOthers.map(renderRequestFromOther)}
                </>
              )}
              {/* Completed section */}
              {sentCompleted.length > 0 && (
                <>
                  {pendingRequestsFromOthers.length > 0 && (
                    <Text
                      fontSize="$3"
                      opacity={0.5}
                      style={{ textAlign: 'center' }}
                      mt="$4"
                    >
                      completed
                    </Text>
                  )}
                  {sentCompleted.map((item) =>
                    renderCompletedItem(item, false),
                  )}
                </>
              )}
            </>
          )}
        </YStack>
      </SheetScrollView>
    </YStack>
  ) : selectedContact ? (
    // Contact Detail Screen
    <ContactDetailView
      contact={selectedContact}
      onBack={() => setSelectedContact(null)}
      onDeleted={() => {
        setSelectedContact(null)
      }}
      onSend={(contact) => {
        onSendToContact?.({
          contactId: contact._id,
          name: contact.note,
          address: contact.address,
          avatarUrl: contact.avatarUrl,
        })
        onOpenChange(false)
      }}
      onRequest={(contact) => {
        onRequestFromContact?.({
          contactId: contact._id,
          name: contact.note,
          address: contact.address,
          avatarUrl: contact.avatarUrl,
        })
        onOpenChange(false)
      }}
    />
  ) : showContacts ? (
    // Contacts List Screen
    <ContactsList
      onBack={() => setShowContacts(false)}
      onSelect={(contact) => setSelectedContact(contact)}
      onQRPress={() => setQrScannerOpen(true)}
    />
  ) : (
    // Main User Screen
    <YStack flex={1} p={16}>
      <XStack items="center" gap="$4" height="$6">
        <Pressable
          onPress={handleAvatarPress}
          style={{ position: 'relative', cursor: 'pointer' } as object}
        >
          <Avatar circular size="$6">
            <Avatar.Image src={avatarUrl} />
            <Avatar.Fallback bg="$color5" />
          </Avatar>
          {/* Camera icon overlay */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
            pointerEvents="none"
          >
            <Camera size={14} color="white" />
          </View>
          {/* Hidden file input for web */}
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleFileChange as unknown as React.ChangeEventHandler<HTMLInputElement>
              }
              style={{ display: 'none' }}
            />
          )}
        </Pressable>

        {showEditInput ? (
          <XStack items="center" flex={1}>
            <Text fontSize="$7" fontWeight="800" letterSpacing={1}>
              @
            </Text>
            <Input
              flex={1}
              ref={inputRef}
              size="$7"
              borderWidth={0}
              backgroundColor="transparent"
              paddingHorizontal={0}
              paddingVertical={0}
              style={{
                fontWeight: '800',
                outline: 'none',
                boxShadow: 'none',
                letterSpacing: 1,
              }}
              focusStyle={{ borderWidth: 0, outlineWidth: 0 }}
              focusVisibleStyle={{ borderWidth: 0, outlineWidth: 0 }}
              value={usernameInput}
              onChange={(e) =>
                handleUsernameChange((e.target as HTMLInputElement).value)
              }
              onBlur={handleBlur}
              placeholder={needsUsername ? 'EnterUsername' : 'NewUsername'}
            />
          </XStack>
        ) : (
          <XStack flex={1} items="center" justify="space-between">
            <Text
              fontSize="$7"
              fontWeight="800"
              letterSpacing={1}
              onPress={handleStartEditing}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
            >
              @{dbUser?.username || ''}
            </Text>
            <XStack
              onPress={() => setQrScannerOpen(true)}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
              p="$2"
            >
              <QrCode size={24} color="$color12" />
            </XStack>
          </XStack>
        )}
      </XStack>

      {showEditInput && (
        <XStack mt="$4" mx={-16}>
          <YStack
            width="25%"
            height={80}
            bg="rgba(24, 143, 237, 0.15)"
            pressStyle={{ opacity: 0.8 }}
            onPress={handleCancelEditing}
            cursor="pointer"
            justify="center"
            items="center"
          >
            <Text
              fontSize="$5"
              fontWeight="800"
              color="$brandBlue"
              textTransform="uppercase"
              letterSpacing={2}
            >
              Cancel
            </Text>
          </YStack>
          <YStack
            width="75%"
            height={80}
            bg="rgba(7, 104, 66, 0.3)"
            opacity={(isAvailable || isCurrent) && !isSaving ? 1 : 0.4}
            pressStyle={{ opacity: 0.8 }}
            onPress={
              (isAvailable || isCurrent) && !isSaving
                ? isCurrent
                  ? handleCancelEditing
                  : handleSave
                : undefined
            }
            cursor={
              (isAvailable || isCurrent) && !isSaving ? 'pointer' : 'default'
            }
            justify="center"
            items="center"
          >
            <Text
              fontSize="$5"
              fontWeight="800"
              letterSpacing={2}
              color="$brandGreen"
              textTransform="uppercase"
              numberOfLines={1}
            >
              {isTaken
                ? 'Taken'
                : error
                  ? error
                  : isSaving
                    ? 'Saving...'
                    : 'Save'}
            </Text>
          </YStack>
        </XStack>
      )}

      {/* Received Row - hidden during editing */}
      {!showEditInput && (
        <XStack
          items="center"
          justify="space-between"
          mt="$4"
          py="$3"
          onPress={() => setShowReceived(true)}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
        >
          <Text
            fontSize="$7"
            textTransform="uppercase"
            fontWeight="900"
            letterSpacing={3}
          >
            received
          </Text>
          {pendingRequestsYouSent.length > 0 && (
            <YStack
              bg="rgba(7, 104, 66, 0.3)"
              px="$3"
              py="$1"
              style={{ borderRadius: 100 }}
            >
              <Text fontSize="$7" fontWeight="800" color="$brandGreen">
                {pendingRequestsYouSent.length}
              </Text>
            </YStack>
          )}
        </XStack>
      )}

      {/* Sent Row - hidden during editing */}
      {!showEditInput && (
        <XStack
          items="center"
          justify="space-between"
          py="$3"
          onPress={() => setShowSent(true)}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
        >
          <Text
            fontSize="$7"
            textTransform="uppercase"
            fontWeight="900"
            letterSpacing={3}
          >
            sent
          </Text>
          {pendingRequestsToYou.length > 0 && (
            <YStack
              bg="rgba(24, 143, 237, 0.3)"
              px="$3"
              py="$1"
              style={{ borderRadius: 100 }}
            >
              <Text fontSize="$7" fontWeight="800" color="$brandBlue">
                {pendingRequestsToYou.length}
              </Text>
            </YStack>
          )}
        </XStack>
      )}

      {/* Contacts Row - hidden during editing */}
      {!showEditInput && (
        <XStack
          items="center"
          justify="space-between"
          py="$3"
          onPress={() => setShowContacts(true)}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
        >
          <Text
            fontSize="$7"
            textTransform="uppercase"
            fontWeight="900"
            letterSpacing={3}
          >
            contacts
          </Text>
          {contacts && contacts.length > 0 && (
            <YStack bg="$color5" px="$3" py="$1" style={{ borderRadius: 100 }}>
              <Text fontSize="$7" fontWeight="800" color="$color11">
                {contacts.length}
              </Text>
            </YStack>
          )}
        </XStack>
      )}

      <YStack flex={1} />

      {!showEditInput && (
        <XStack justify="space-between" items="center">
          <Text
            fontSize="$3"
            opacity={0.5}
            fontWeight="800"
            color="$brandBlue"
            textTransform="uppercase"
            letterSpacing={1}
          >
            {dbUser?.phoneNumber || dbUser?.email || ''}
          </Text>
          <Text
            fontSize="$3"
            fontWeight="800"
            color="$brandBlue"
            opacity={0.5}
            onPress={handleLogout}
            cursor="pointer"
            textTransform="uppercase"
          >
            logout
          </Text>
        </XStack>
      )}
    </YStack>
  )

  // Handle scanned username from QR scanner
  const handleUsernameScanned = useCallback((_username: string) => {
    // Close the QR scanner
    setQrScannerOpen(false)
    // In UserDrawer context, we don't have a direct way to add a user as a contact
    // The QR scanner from UserDrawer is mainly for showing your own QR / scanning addresses
    // For now, we just close the scanner - username contacts go through SendDrawer/ReceiveDrawer
  }, [])

  // Handle scanned address from QR scanner
  const handleAddressScanned = useCallback((address: string) => {
    // Close QR scanner and open AddContactDrawer
    setQrScannerOpen(false)
    setAddContactAddress(address)
  }, [])

  // Handle contact saved from AddContactDrawer
  const handleContactSaved = useCallback(
    (_contact: {
      _id: string
      address: string
      note: string
      avatarUrl: string
    }) => {
      // After saving, optionally navigate to the contact detail
      // For now, just close the add contact drawer
      setAddContactAddress(null)
    },
    [],
  )

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={handleOpenChange}
        snapPoint={80}
        dismissible={!needsUsername}
        tintColor={
          showReceived ? '$brandGreen' : showSent ? '$brandBlue' : undefined
        }
        tintOpacity={0.3}
      >
        <View style={{ flex: 1 }}>{content}</View>
      </AppSheet>

      {/* QR Scanner Drawer */}
      <QRScannerDrawer
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        mode="user"
        onUsernameScanned={handleUsernameScanned}
        onAddressScanned={handleAddressScanned}
      />

      {/* Add Contact Drawer (for scanned addresses) */}
      {addContactAddress && (
        <AddContactDrawer
          open={!!addContactAddress}
          onOpenChange={(isOpen) => {
            if (!isOpen) setAddContactAddress(null)
          }}
          address={addContactAddress}
          onSaved={handleContactSaved}
        />
      )}

      {/* Image Cropper (web only - native uses expo-image-picker's built-in cropper) */}
      {Platform.OS === 'web' && selectedImageUri && (
        <ImageCropper
          open={!!selectedImageUri}
          imageUri={selectedImageUri}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      )}
    </>
  )
}
