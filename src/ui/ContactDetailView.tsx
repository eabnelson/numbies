import { ChevronLeft, Copy, Trash2 } from '@tamagui/lucide-icons'
import { useMutation, useQuery } from 'convex/react'
import * as Clipboard from 'expo-clipboard'
import { useCallback, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Input, Text, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { truncateAddress } from '../utils/formatters'

// Note validation constants (matching convex/contacts.ts)
const NOTE_MIN_LENGTH = 1
const NOTE_MAX_LENGTH = 20
const NOTE_REGEX = /^[A-Za-z0-9_ ]*$/ // Allow empty during typing, validation on save

type Contact = {
  _id: Id<'contacts'>
  address: string
  note: string
  avatarUrl: string
}

type ContactDetailViewProps = {
  contact: Contact
  onBack: () => void
  /** Called after contact is deleted */
  onDeleted?: () => void
  /** Called when user wants to send to this contact */
  onSend?: (contact: Contact) => void
  /** Called when user wants to request from this contact */
  onRequest?: (contact: Contact) => void
}

export function ContactDetailView({
  contact,
  onBack,
  onDeleted,
  onSend,
  onRequest,
}: ContactDetailViewProps) {
  const { bottom } = useSafeAreaInsets()
  const { dbUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const updateContact = useMutation(api.contacts.update)
  const removeContact = useMutation(api.contacts.remove)

  // Get fresh contact data (in case it was updated)
  const freshContact = useQuery(api.contacts.getById, {
    contactId: contact._id,
  })
  const displayContact = freshContact ?? contact

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    await Clipboard.setStringAsync(displayContact.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [displayContact.address])

  // Handle note input change with validation
  const handleNoteChange = (e: {
    target?: { value?: string }
    nativeEvent?: { text?: string }
  }) => {
    const text = e.target?.value ?? e.nativeEvent?.text ?? ''

    // Check for invalid characters
    if (!NOTE_REGEX.test(text)) {
      setError('A-Z, 0-9, spaces, _ only')
      // Clear error after 2 seconds
      setTimeout(() => setError(null), 2000)
      return
    }

    // Enforce max length
    if (text.length <= NOTE_MAX_LENGTH) {
      setNoteInput(text)
      setError(null)
    }
  }

  // Start editing mode
  const handleStartEditing = () => {
    setNoteInput(displayContact.note)
    setIsEditing(true)
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Cancel editing
  const handleCancelEditing = () => {
    setIsEditing(false)
    setNoteInput('')
    setError(null)
  }

  // Save note
  const handleSave = async () => {
    const trimmedNote = noteInput.trim()

    // Validate note
    if (trimmedNote.length < NOTE_MIN_LENGTH) {
      setError('Note cannot be empty')
      return
    }

    if (trimmedNote.length > NOTE_MAX_LENGTH) {
      setError(`Note must be ${NOTE_MAX_LENGTH} characters or less`)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (!dbUser?.privyId) return
      await updateContact({
        privyId: dbUser.privyId,
        contactId: contact._id,
        note: trimmedNote,
      })
      setIsEditing(false)
      setNoteInput('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Handle blur - auto-save if valid
  const handleBlur = async () => {
    const trimmedNote = noteInput.trim()
    if (
      trimmedNote.length >= NOTE_MIN_LENGTH &&
      trimmedNote.length <= NOTE_MAX_LENGTH &&
      NOTE_REGEX.test(trimmedNote)
    ) {
      await handleSave()
    } else {
      handleCancelEditing()
    }
  }

  // Delete contact
  const handleDelete = async () => {
    if (!dbUser?.privyId) return
    setIsDeleting(true)
    try {
      await removeContact({ privyId: dbUser.privyId, contactId: contact._id })
      onDeleted?.()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete contact')
      }
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <YStack flex={1} px={16} pt={16}>
      {/* Header with back button and delete icon */}
      <XStack items="center" justify="space-between" mb="$4">
        <XStack items="center" gap="$2">
          <XStack
            onPress={onBack}
            cursor="pointer"
            pressStyle={{ opacity: 0.7 }}
            p="$1"
            items="center"
            justify="center"
          >
            <ChevronLeft size={32} color="$color12" />
          </XStack>
          <Text
            fontSize="$8"
            fontWeight="900"
            textTransform="uppercase"
            letterSpacing={3}
          >
            contact
          </Text>
        </XStack>

        {/* Delete icon */}
        <XStack
          onPress={() => setShowDeleteConfirm(true)}
          cursor="pointer"
          pressStyle={{ opacity: 0.7 }}
          p="$2"
          opacity={0.8}
        >
          <Trash2 size={24} color="$red10" />
        </XStack>
      </XStack>

      {/* Avatar, Name, and Address */}
      <XStack items="center" gap="$4" py="$2">
        <Avatar circular size="$6">
          <Avatar.Image src={displayContact.avatarUrl} />
          <Avatar.Fallback bg="$color5" />
        </Avatar>

        <YStack flex={1} gap="$1">
          {isEditing ? (
            <Input
              ref={inputRef}
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
              value={noteInput}
              onChange={handleNoteChange}
              onBlur={handleBlur}
              placeholder="Enter note"
              maxLength={NOTE_MAX_LENGTH}
              autoCapitalize="none"
            />
          ) : (
            <Text
              fontSize="$7"
              fontWeight="700"
              onPress={handleStartEditing}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
            >
              {displayContact.note}
            </Text>
          )}

          {/* Address with inline copy - hidden when editing */}
          {!isEditing && (
            <XStack
              items="center"
              gap="$2"
              onPress={copyAddress}
              cursor="pointer"
              pressStyle={{ opacity: 0.7 }}
            >
              {copied ? (
                <Text fontSize="$3" fontWeight="600" color="$brandGreen">
                  Copied!
                </Text>
              ) : (
                <>
                  <Text fontSize="$3" color="$color10">
                    {truncateAddress(displayContact.address)}
                  </Text>
                  <Copy size={14} color="$color10" />
                </>
              )}
            </XStack>
          )}
        </YStack>
      </XStack>

      {/* Edit buttons when editing - replaces bottom buttons */}
      {isEditing && (
        <XStack mx={-16}>
          <YStack
            width="25%"
            height={80}
            bg="rgba(24, 143, 237, 0.3)"
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
            opacity={
              noteInput.trim().length >= NOTE_MIN_LENGTH && !isSaving ? 1 : 0.4
            }
            pressStyle={{ opacity: 0.8 }}
            onPress={
              noteInput.trim().length >= NOTE_MIN_LENGTH && !isSaving
                ? handleSave
                : undefined
            }
            cursor={
              noteInput.trim().length >= NOTE_MIN_LENGTH && !isSaving
                ? 'pointer'
                : 'default'
            }
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
              {error ? error : isSaving ? 'Saving...' : 'Save'}
            </Text>
          </YStack>
        </XStack>
      )}

      {/* Spacer */}
      <YStack flex={1} />

      {/* Action Buttons - Send/Request or Delete Confirmation - hidden when editing */}
      {!isEditing && (
        <XStack mx={-16} mb={Platform.OS === 'web' ? 0 : -bottom}>
          {showDeleteConfirm ? (
            <>
              <YStack
                width="50%"
                height={Platform.OS === 'web' ? 80 : 80 + bottom}
                pb={Platform.OS === 'web' ? 0 : bottom / 2}
                bg="rgba(24, 143, 237, 0.3)"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => setShowDeleteConfirm(false)}
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
                width="50%"
                height={Platform.OS === 'web' ? 80 : 80 + bottom}
                pb={Platform.OS === 'web' ? 0 : bottom / 2}
                bg="rgba(255, 59, 48, 0.3)"
                pressStyle={{ opacity: isDeleting ? 1 : 0.8 }}
                onPress={isDeleting ? undefined : handleDelete}
                cursor={isDeleting ? 'default' : 'pointer'}
                justify="center"
                items="center"
              >
                <Text
                  fontSize="$5"
                  fontWeight="800"
                  color="$red10"
                  textTransform="uppercase"
                  letterSpacing={2}
                  opacity={isDeleting ? 0.5 : 1}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </YStack>
            </>
          ) : (
            <>
              <YStack
                width="50%"
                height={Platform.OS === 'web' ? 80 : 80 + bottom}
                pb={Platform.OS === 'web' ? 0 : bottom / 2}
                bg="rgba(7, 104, 66, 0.3)"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => onRequest?.(displayContact)}
                cursor="pointer"
                justify="center"
                items="center"
              >
                <Text
                  fontSize="$5"
                  fontWeight="900"
                  color="$brandGreen"
                  textTransform="uppercase"
                  letterSpacing={4}
                >
                  Request
                </Text>
              </YStack>
              <YStack
                width="50%"
                height={Platform.OS === 'web' ? 80 : 80 + bottom}
                pb={Platform.OS === 'web' ? 0 : bottom / 2}
                bg="rgba(24, 143, 237, 0.3)"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => onSend?.(displayContact)}
                cursor="pointer"
                justify="center"
                items="center"
              >
                <Text
                  fontSize="$5"
                  fontWeight="900"
                  color="$brandBlue"
                  textTransform="uppercase"
                  letterSpacing={4}
                >
                  Send
                </Text>
              </YStack>
            </>
          )}
        </XStack>
      )}
    </YStack>
  )
}
