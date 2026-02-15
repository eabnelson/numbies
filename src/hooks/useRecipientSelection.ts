import { useConvex } from 'convex/react'
import { useCallback, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import type { Recipient, SearchResult } from '~/src/ui/RecipientSearchBar'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type UseRecipientSelectionOptions = {
  currentUserId?: Id<'users'>
  onAddressDetected?: (address: string) => void
}

export function useRecipientSelection(
  _options: UseRecipientSelectionOptions = {},
) {
  const convex = useConvex()

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isAddingMore, setIsAddingMore] = useState(false)
  const [hasSearchCompleted, setHasSearchCompleted] = useState(false)

  // QR scanner and add contact drawer state
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [scannedAddress, setScannedAddress] = useState('')

  // Computed values
  const hasRecipients = recipients.length > 0
  const isSearching = searchText.trim().length > 0 || isAddingMore
  const hasMultipleRecipients = recipients.length >= 2

  // Handle selecting a recipient from search results
  const handleSelectRecipient = useCallback((result: SearchResult) => {
    let newRecipient: Recipient
    if (result.type === 'user') {
      newRecipient = {
        userId: result._id,
        username: result.username,
        avatarUrl: result.avatarUrl,
      }
    } else {
      // Contact result - use contact ID and mark as contact
      newRecipient = {
        userId: result._id as Id<'users'>, // This is actually a contact ID
        username: result.note, // Use the note as the display name
        avatarUrl: result.avatarUrl,
        isContact: true,
        address: result.address,
      }
    }
    setRecipients((prev) => [...prev, newRecipient])
    setSearchText('')
    setSearchResults([])
    setIsAddingMore(false)
  }, [])

  // Handle removing a recipient
  const handleRemoveRecipient = useCallback((userId: Id<'users'> | string) => {
    setRecipients((prev) => prev.filter((r) => r.userId !== userId))
  }, [])

  // Handle search text change
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text)
    setHasSearchCompleted(false)
  }, [])

  // Handle search results change
  const handleSearchResultsChange = useCallback((results: SearchResult[]) => {
    setSearchResults(results)
    setHasSearchCompleted(true)
  }, [])

  // Handle QR button press
  const handleQRPress = useCallback(() => {
    setQrScannerOpen(true)
  }, [])

  // Handle username scanned from QR code
  const handleUsernameScanned = useCallback(
    async (username: string) => {
      // Close QR scanner
      setQrScannerOpen(false)

      // Look up the user by exact username match
      try {
        const user = await convex.query(api.users.getByUsername, { username })
        if (user) {
          // User found - add them directly as a recipient
          const newRecipient: Recipient = {
            userId: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl,
          }
          // Check if already added
          setRecipients((prev) => {
            if (prev.some((r) => r.userId === user._id)) {
              return prev
            }
            return [...prev, newRecipient]
          })
        } else {
          // User not found - fall back to search
          setSearchText(username)
          setIsAddingMore(true)
        }
      } catch (error) {
        console.error('Failed to look up user:', error)
        // Fall back to search on error
        setSearchText(username)
        setIsAddingMore(true)
      }
    },
    [convex],
  )

  // Handle Ethereum address scanned from QR code or pasted
  const handleAddressScanned = useCallback((address: string) => {
    // Close QR scanner and open AddContactDrawer
    setQrScannerOpen(false)
    setScannedAddress(address)

    // Dismiss keyboard first, then open drawer
    if (Platform.OS === 'web') {
      // On web (including mobile browsers), blur active element to dismiss keyboard
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      // Wait for keyboard to dismiss
      setTimeout(() => {
        setAddContactOpen(true)
      }, 150)
    } else {
      // On native, use Keyboard API
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
      // Fallback in case keyboard wasn't open
      setTimeout(() => {
        subscription.remove()
        openDrawer()
      }, 300)
    }
  }, [])

  // Handle QR scan error
  const handleQRError = useCallback((message: string) => {
    console.log('QR scan error:', message)
  }, [])

  // Handle contact saved from AddContactDrawer
  const handleContactSaved = useCallback(
    (contact: {
      _id: string
      address: string
      note: string
      avatarUrl: string
    }) => {
      // Add the contact as a recipient
      const newRecipient: Recipient = {
        userId: contact._id as Id<'users'>, // This is actually a contact ID
        username: contact.note, // Use the note as the display name
        avatarUrl: contact.avatarUrl,
        isContact: true,
        address: contact.address,
      }
      setRecipients((prev) => [...prev, newRecipient])
      setAddContactOpen(false)
      setScannedAddress('')
    },
    [],
  )

  // Reset all state
  const reset = useCallback(() => {
    setRecipients([])
    setSearchText('')
    setSearchResults([])
    setIsAddingMore(false)
    setHasSearchCompleted(false)
    setQrScannerOpen(false)
    setAddContactOpen(false)
    setScannedAddress('')
  }, [])

  // Initialize from prefilled username (e.g., from deep links)
  const initFromUsername = useCallback((username: string) => {
    setSearchText(username)
    setIsAddingMore(true)
  }, [])

  // Initialize from prefilled contact
  const initFromContact = useCallback(
    (contact: {
      contactId: string
      name: string
      address: string
      avatarUrl: string
    }) => {
      const recipient: Recipient = {
        userId: contact.contactId as Id<'users'>,
        username: contact.name,
        avatarUrl: contact.avatarUrl,
        isContact: true,
        address: contact.address,
      }
      setRecipients([recipient])
    },
    [],
  )

  // Initialize from prefilled request (for send mode)
  const initFromRequest = useCallback(
    (request: {
      recipientUserId: Id<'users'>
      recipientUsername: string
      recipientAvatarUrl?: string
    }) => {
      const recipient: Recipient = {
        userId: request.recipientUserId,
        username: request.recipientUsername,
        avatarUrl:
          request.recipientAvatarUrl ||
          `https://api.dicebear.com/9.x/glass/png?seed=${request.recipientUserId}`,
      }
      setRecipients([recipient])
    },
    [],
  )

  return {
    // State
    recipients,
    searchText,
    searchResults,
    isAddingMore,
    hasSearchCompleted,
    qrScannerOpen,
    addContactOpen,
    scannedAddress,

    // Computed
    hasRecipients,
    isSearching,
    hasMultipleRecipients,

    // Setters
    setRecipients,
    setSearchText,
    setSearchResults,
    setIsAddingMore,
    setQrScannerOpen,
    setAddContactOpen,

    // Handlers
    handleSelectRecipient,
    handleRemoveRecipient,
    handleSearchTextChange,
    handleSearchResultsChange,
    handleQRPress,
    handleUsernameScanned,
    handleAddressScanned,
    handleQRError,
    handleContactSaved,

    // Initialization
    initFromUsername,
    initFromContact,
    initFromRequest,
    reset,
  }
}
