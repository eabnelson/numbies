import { QrCode } from '@tamagui/lucide-icons'
import { useConvex } from 'convex/react'
import { useCallback, useRef } from 'react'
import { Pressable } from 'react-native'
import type { ColorTokens } from 'tamagui'
import { Avatar, Input, Text, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { truncateAddress } from '../utils/formatters'
import { SheetScrollView } from './AppSheet'
import { RecipientChip } from './RecipientChip'

// Check if text is a valid Ethereum address
const isEthereumAddress = (text: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(text.trim())
}

export type Recipient = {
  userId: Id<'users'>
  username: string
  avatarUrl: string
  // For contact-based recipients (Ethereum addresses)
  isContact?: boolean
  address?: string
}

export type UserSearchResult = {
  type: 'user'
  _id: Id<'users'>
  username: string
  avatarUrl: string
  paymentCount: number
}

export type ContactSearchResult = {
  type: 'contact'
  _id: string
  note: string
  address: string
  avatarUrl: string
}

export type SearchResult = UserSearchResult | ContactSearchResult

type RecipientSearchBarProps = {
  mode: 'send' | 'request'
  recipients: Recipient[]
  onRecipientsChange: (recipients: Recipient[]) => void
  labelColor?: ColorTokens
  currentUserId?: Id<'users'>
  searchText: string
  onSearchTextChange: (text: string) => void
  onSearchResultsChange: (results: SearchResult[]) => void
  isAddingMore?: boolean
  onAddingMoreChange?: (adding: boolean) => void
  onSplitEvenly?: () => void
  onQRPress?: () => void
  /** Called when an Ethereum address is pasted but no contact exists for it */
  onAddressDetected?: (address: string) => void
}

export function RecipientSearchBar({
  mode,
  recipients,
  onRecipientsChange,
  labelColor = '$color12',
  currentUserId,
  searchText,
  onSearchTextChange,
  onSearchResultsChange,
  isAddingMore = false,
  onAddingMoreChange,
  onSplitEvenly,
  onQRPress,
  onAddressDetected,
}: RecipientSearchBarProps) {
  const { dbUser } = useAuth()
  const convex = useConvex()
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setShowAddMore = (value: boolean) => {
    onAddingMoreChange?.(value)
  }

  const performSearch = useCallback(
    async (text: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      if (!text.trim()) {
        onSearchResultsChange([])
        return
      }

      // Check if it's an Ethereum address
      if (isEthereumAddress(text)) {
        const address = text.trim().toLowerCase()

        // Check if already added as recipient
        if (recipients.some((r) => r.address?.toLowerCase() === address)) {
          onSearchTextChange('')
          onSearchResultsChange([])
          return
        }

        // Look up contact by address
        if (dbUser?._id) {
          try {
            const contact = await convex.query(api.contacts.getByAddress, {
              userId: dbUser._id,
              address,
            })

            if (contact) {
              // Contact exists - add as recipient
              const newRecipient: Recipient = {
                userId: contact._id as unknown as Id<'users'>,
                username: contact.note,
                avatarUrl: contact.avatarUrl,
                isContact: true,
                address: contact.address,
              }
              onRecipientsChange([...recipients, newRecipient])
              onSearchTextChange('')
              onSearchResultsChange([])
              onAddingMoreChange?.(false)
            } else {
              // No contact - trigger add contact flow
              onAddressDetected?.(address)
              onSearchTextChange('')
              onSearchResultsChange([])
            }
          } catch (error) {
            console.error('Contact lookup failed:', error)
            // On error, trigger add contact flow anyway
            onAddressDetected?.(address)
            onSearchTextChange('')
            onSearchResultsChange([])
          }
        }
        return
      }

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await convex.query(api.users.searchUsersAndContacts, {
            prefix: text,
            limit: 10,
            excludeUserId: currentUserId,
          })
          // Filter out already-selected recipients
          const filteredResults = results.filter((r) => {
            if (r.type === 'user') {
              return !recipients.some((selected) => selected.userId === r._id)
            }
            // For contacts, filter by address
            return !recipients.some(
              (selected) => selected.address === r.address,
            )
          })
          onSearchResultsChange(filteredResults as SearchResult[])
        } catch (error) {
          console.error('Search failed:', error)
          onSearchResultsChange([])
        }
      }, 300)
    },
    [
      convex,
      recipients,
      currentUserId,
      dbUser?._id,
      onSearchResultsChange,
      onSearchTextChange,
      onRecipientsChange,
      onAddingMoreChange,
      onAddressDetected,
    ],
  )

  // biome-ignore lint/suspicious/noExplicitAny: Tamagui Input onChange type
  const handleInputChange = (e: any) => {
    const text = e.target?.value ?? e.nativeEvent?.text ?? ''
    onSearchTextChange(text)
    performSearch(text)
  }

  const handleRemoveRecipient = (userId: Id<'users'>) => {
    onRecipientsChange(recipients.filter((r) => r.userId !== userId))
  }

  const label = mode === 'send' ? 'To:' : 'From:'

  // Single recipient - show chip inline with label + plus button (or search input if adding more)
  if (recipients.length === 1) {
    const recipient = recipients[0]

    // If adding more, show chip + inline search input (replaces plus button)
    if (isAddingMore || searchText.trim().length > 0) {
      return (
        <XStack items="center" px="$4" height="$6" gap="$2">
          <Text fontSize="$8" fontWeight="600" color={labelColor}>
            {label}
          </Text>
          <RecipientChip
            userId={recipient.userId}
            username={recipient.username}
            avatarUrl={recipient.avatarUrl}
            onRemove={(id) => {
              handleRemoveRecipient(id)
              setShowAddMore(false)
            }}
            borderColor={labelColor}
          />
          <Input
            flex={1}
            size="$8"
            borderWidth={0}
            backgroundColor="transparent"
            paddingHorizontal={0}
            paddingVertical={0}
            style={{
              fontWeight: '600',
              outline: 'none',
              boxShadow: 'none',
            }}
            focusStyle={{ borderWidth: 0, outlineWidth: 0 }}
            focusVisibleStyle={{ borderWidth: 0, outlineWidth: 0 }}
            value={searchText}
            onChange={handleInputChange}
            onBlur={() => {
              if (!searchText.trim()) {
                setShowAddMore(false)
              }
            }}
            autoCapitalize="none"
            placeholder="search"
            autoFocus
          />
          {onQRPress && (
            <Pressable
              onPress={onQRPress}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <QrCode size={24} color="$color12" />
            </Pressable>
          )}
        </XStack>
      )
    }

    // Not adding more - show chip + plus button
    return (
      <XStack items="center" px="$4" height="$6" gap="$2">
        <Text fontSize="$8" fontWeight="600" color={labelColor}>
          {label}
        </Text>
        <RecipientChip
          userId={recipient.userId}
          username={recipient.username}
          avatarUrl={recipient.avatarUrl}
          onRemove={handleRemoveRecipient}
          borderColor={labelColor}
        />
        <Text
          fontSize="$8"
          fontWeight="700"
          color={labelColor}
          onPress={() => setShowAddMore(true)}
          cursor="pointer"
          pressStyle={{ opacity: 0.5 }}
          px="$2"
        >
          +
        </Text>
        <XStack flex={1} />
        {onQRPress && (
          <Pressable
            onPress={onQRPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <QrCode size={24} color="$color12" />
          </Pressable>
        )}
      </XStack>
    )
  }

  // No recipients OR multiple recipients - show search input
  // (When multiple, chips are shown in the split list instead)
  return (
    <XStack items="center" px="$4" height="$6" gap="$2">
      <Text fontSize="$8" fontWeight="600" color={labelColor}>
        {label}
      </Text>
      <XStack items="center" flex={1}>
        <Input
          flex={1}
          size="$8"
          borderWidth={0}
          backgroundColor="transparent"
          paddingHorizontal={0}
          paddingVertical={0}
          style={{
            fontWeight: '600',
            outline: 'none',
            boxShadow: 'none',
          }}
          focusStyle={{ borderWidth: 0, outlineWidth: 0 }}
          focusVisibleStyle={{ borderWidth: 0, outlineWidth: 0 }}
          value={searchText}
          onChange={handleInputChange}
          autoCapitalize="none"
          placeholder="search"
        />
      </XStack>
      {onSplitEvenly && (
        <XStack
          items="center"
          px="$3"
          py="$1"
          borderWidth={2}
          borderColor={labelColor}
          style={{ borderRadius: 16 }}
          onPress={onSplitEvenly}
          cursor="pointer"
          pressStyle={{ opacity: 0.5 }}
        >
          <Text fontSize="$3" fontWeight="600" color={labelColor}>
            split
          </Text>
        </XStack>
      )}
      {onQRPress && (
        <Pressable
          onPress={onQRPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <QrCode size={24} color="$color12" />
        </Pressable>
      )}
    </XStack>
  )
}

// Separate component for search results (replaces amount display)
type UserSearchResultsProps = {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
  searchText?: string
  hasSearchCompleted?: boolean
}

export function UserSearchResults({
  results,
  onSelect,
  searchText = '',
  hasSearchCompleted = false,
}: UserSearchResultsProps) {
  const hasSearched = searchText.trim().length > 0
  const showNoResults =
    results.length === 0 && hasSearched && hasSearchCompleted

  return (
    <SheetScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <YStack py="$2">
        {showNoResults && (
          <YStack flex={1} justify="center" items="center" py="$8">
            <Text color="$color10" fontSize="$4">
              No results found
            </Text>
          </YStack>
        )}
        {results.map((result) => (
          <Pressable
            key={result._id}
            onPress={() => onSelect(result)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack items="center" gap="$3" px="$4" py="$3">
              <Avatar circular size="$5">
                <Avatar.Image src={result.avatarUrl} />
                <Avatar.Fallback bg="$color5" />
              </Avatar>
              {result.type === 'user' ? (
                <YStack>
                  <Text fontSize="$6" fontWeight="600">
                    @{result.username}
                  </Text>
                  {result.paymentCount > 0 && (
                    <Text fontSize="$3" color="$color10">
                      {result.paymentCount} payment
                      {result.paymentCount === 1 ? '' : 's'}
                    </Text>
                  )}
                </YStack>
              ) : (
                <YStack flex={1}>
                  <XStack items="center" gap="$2">
                    <Text fontSize="$6" fontWeight="600">
                      {result.note}
                    </Text>
                    <Text fontSize="$3" color="$color10" fontWeight="500">
                      contact
                    </Text>
                  </XStack>
                  <Text
                    fontSize="$3"
                    color="$color10"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {truncateAddress(result.address)}
                  </Text>
                </YStack>
              )}
            </XStack>
          </Pressable>
        ))}
      </YStack>
    </SheetScrollView>
  )
}
