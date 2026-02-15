import { Copy } from '@tamagui/lucide-icons'
import { useMutation } from 'convex/react'
import * as Clipboard from 'expo-clipboard'
import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Input, Text, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { api } from '../../convex/_generated/api'
import { getContactAvatarUrl } from '../utils/avatar'
import { truncateAddress } from '../utils/formatters'
import { AppSheet } from './AppSheet'

// Note validation constants (matching convex/contacts.ts)
const NOTE_MIN_LENGTH = 1
const NOTE_MAX_LENGTH = 20
const NOTE_REGEX = /^[A-Za-z0-9_ ]*$/ // Allow empty during typing, validation on save

type AddContactDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
  /** Called after contact is successfully saved */
  onSaved?: (contact: {
    _id: string
    address: string
    note: string
    avatarUrl: string
  }) => void
}

export function AddContactDrawer({
  open,
  onOpenChange,
  address,
  onSaved,
}: AddContactDrawerProps) {
  const { bottom } = useSafeAreaInsets()
  const { dbUser } = useAuth()
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCharWarning, setShowCharWarning] = useState(false)

  const createContact = useMutation(api.contacts.create)

  const avatarUrl = getContactAvatarUrl(address)

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    await Clipboard.setStringAsync(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [address])

  // Handle note input change with validation
  const handleNoteChange = (e: {
    target?: { value?: string }
    nativeEvent?: { text?: string }
  }) => {
    const text = e.target?.value ?? e.nativeEvent?.text ?? ''

    // Check if invalid characters were attempted
    if (!NOTE_REGEX.test(text)) {
      setShowCharWarning(true)
      // Clear warning after 2 seconds
      setTimeout(() => setShowCharWarning(false), 2000)
      return
    }

    // Enforce max length
    if (text.length <= NOTE_MAX_LENGTH) {
      setNote(text)
      setError(null)
      setShowCharWarning(false)
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!dbUser?._id) return

    const trimmedNote = note.trim()

    // Validate note
    if (trimmedNote.length < NOTE_MIN_LENGTH) {
      setError('Name cannot be empty')
      return
    }

    if (trimmedNote.length > NOTE_MAX_LENGTH) {
      setError(`Name must be ${NOTE_MAX_LENGTH} characters or less`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const contact = await createContact({
        privyId: dbUser.privyId,
        userId: dbUser._id,
        address: address,
        note: trimmedNote,
      })

      // Reset state and close
      setNote('')
      setSaving(false)
      onOpenChange(false)

      // Notify parent
      if (contact && onSaved) {
        onSaved({
          _id: contact._id,
          address: contact.address,
          note: contact.note,
          avatarUrl: contact.avatarUrl,
        })
      }
    } catch (err) {
      setSaving(false)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save contact')
      }
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setNote('')
    setError(null)
    onOpenChange(false)
  }

  // Handle drawer close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNote('')
      setError(null)
      setShowCharWarning(false)
    }
    onOpenChange(isOpen)
  }

  const isNoteValid = note.trim().length >= NOTE_MIN_LENGTH
  const canSave = isNoteValid && !saving
  const charsRemaining = NOTE_MAX_LENGTH - note.length
  const showCharCounter = charsRemaining <= 5

  return (
    <AppSheet open={open} onOpenChange={handleOpenChange} snapPoint={80}>
      <YStack flex={1} px={16} pt={16}>
        {/* Header */}
        <Text
          fontSize="$8"
          fontWeight="900"
          textTransform="uppercase"
          letterSpacing={3}
          mb="$4"
        >
          add contact
        </Text>

        {/* Avatar, Name Input, and Address - matching ContactDetailView layout */}
        <XStack items="center" gap="$4" py="$2">
          <Avatar circular size="$6">
            <Avatar.Image src={avatarUrl} />
            <Avatar.Fallback bg="$color5" />
          </Avatar>

          <YStack flex={1}>
            {/* Name input - inline next to avatar like ContactDetailView edit mode */}
            <Input
              size="$7"
              borderWidth={0}
              backgroundColor="transparent"
              paddingHorizontal={0}
              paddingVertical={0}
              style={{
                fontWeight: '700',
                outline: 'none',
                boxShadow: 'none',
              }}
              focusStyle={{ borderWidth: 0, outlineWidth: 0 }}
              focusVisibleStyle={{ borderWidth: 0, outlineWidth: 0 }}
              value={note}
              onChange={handleNoteChange}
              placeholder="Enter name"
              maxLength={NOTE_MAX_LENGTH}
              autoCapitalize="none"
              autoFocus
            />
          </YStack>
        </XStack>

        {/* Character counter - only show when close to limit */}
        <XStack px="$1" mt="$1" height={20}>
          {showCharCounter && (
            <Text fontSize="$2" color="$color9">
              {charsRemaining} characters remaining
            </Text>
          )}
        </XStack>

        {/* Spacer */}
        <YStack flex={1} />

        {/* Address with copy button - centered */}
        <XStack
          items="center"
          justify="center"
          gap="$2"
          onPress={copyAddress}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
          mb="$3"
        >
          {copied ? (
            <Text fontSize="$3" fontWeight="600" color="$brandGreen">
              Copied!
            </Text>
          ) : (
            <>
              <Text fontSize="$3" color="$color10">
                {truncateAddress(address)}
              </Text>
              <Copy size={14} color="$color10" />
            </>
          )}
        </XStack>

        {/* Warning text */}
        <Text
          fontSize="$4"
          fontWeight="800"
          color="$color10"
          textTransform="uppercase"
          letterSpacing={2}
          style={{ textAlign: 'center' }}
          mb="$3"
        >
          must support tempo network
        </Text>

        {/* Action buttons - matching ContactDetailView edit mode */}
        <XStack mx={-16} mb={Platform.OS === 'web' ? 0 : -bottom}>
          <YStack
            width="25%"
            height={Platform.OS === 'web' ? 80 : 80 + bottom}
            pb={Platform.OS === 'web' ? 0 : bottom / 2}
            bg="rgba(24, 143, 237, 0.3)"
            pressStyle={{ opacity: 0.8 }}
            onPress={handleCancel}
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
            height={Platform.OS === 'web' ? 80 : 80 + bottom}
            pb={Platform.OS === 'web' ? 0 : bottom / 2}
            bg="rgba(7, 104, 66, 0.3)"
            opacity={canSave ? 1 : 0.4}
            pressStyle={{ opacity: canSave ? 0.8 : 1 }}
            onPress={canSave ? handleSave : undefined}
            cursor={canSave ? 'pointer' : 'default'}
            justify="center"
            items="center"
          >
            <Text
              fontSize="$5"
              fontWeight="800"
              color="$brandGreen"
              textTransform="uppercase"
              letterSpacing={2}
              numberOfLines={1}
            >
              {error
                ? error
                : saving
                  ? 'Saving...'
                  : showCharWarning
                    ? 'A-Z, 0-9, spaces, _ only'
                    : 'Save'}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </AppSheet>
  )
}
