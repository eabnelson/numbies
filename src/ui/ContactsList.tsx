import { ChevronLeft, QrCode } from '@tamagui/lucide-icons'
import { useQuery } from 'convex/react'
import { Avatar, Text, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { truncateAddress } from '../utils/formatters'
import { SheetScrollView } from './AppSheet'

type Contact = {
  _id: Id<'contacts'>
  address: string
  note: string
  avatarUrl: string
}

type ContactsListProps = {
  onBack: () => void
  onSelect: (contact: Contact) => void
  onQRPress?: () => void
}

export function ContactsList({
  onBack,
  onSelect,
  onQRPress,
}: ContactsListProps) {
  const { dbUser } = useAuth()

  const contacts = useQuery(
    api.contacts.getByUserId,
    dbUser?._id ? { userId: dbUser._id } : 'skip',
  )

  return (
    <YStack flex={1} p={16}>
      {/* Header with back button */}
      <XStack items="center" gap="$2" mb="$4">
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
          contacts
        </Text>
      </XStack>

      <SheetScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack>
          {contacts === undefined ? (
            // Loading state
            <Text
              fontSize="$4"
              opacity={0.5}
              mt="$8"
              style={{ textAlign: 'center' }}
            >
              Loading...
            </Text>
          ) : contacts.length === 0 ? (
            // Empty state
            <YStack items="center" mt="$8" gap="$3">
              <Text
                fontSize="$5"
                fontWeight="600"
                opacity={0.5}
                style={{ textAlign: 'center' }}
              >
                no contacts
              </Text>
              {onQRPress && (
                <XStack
                  onPress={onQRPress}
                  cursor="pointer"
                  pressStyle={{ opacity: 0.7 }}
                  p="$2"
                >
                  <QrCode size={24} color="$color10" />
                </XStack>
              )}
            </YStack>
          ) : (
            // Contact list
            contacts.map((contact) => (
              <XStack
                key={contact._id}
                items="center"
                py="$3"
                gap="$3"
                onPress={() => onSelect(contact)}
                cursor="pointer"
                pressStyle={{ opacity: 0.7 }}
              >
                <Avatar circular size="$4">
                  <Avatar.Image src={contact.avatarUrl} />
                  <Avatar.Fallback bg="$color5" />
                </Avatar>
                <YStack flex={1}>
                  <Text fontSize="$5" fontWeight="600">
                    {contact.note}
                  </Text>
                  <Text fontSize="$3" opacity={0.5}>
                    {truncateAddress(contact.address)}
                  </Text>
                </YStack>
              </XStack>
            ))
          )}
        </YStack>
      </SheetScrollView>
    </YStack>
  )
}
