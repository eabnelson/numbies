import { Pressable } from 'react-native'
import type { ColorTokens } from 'tamagui'
import { Avatar, Text, XStack } from 'tamagui'
import type { Id } from '../../convex/_generated/dataModel'

type RecipientChipProps = {
  userId: Id<'users'>
  username: string
  avatarUrl: string
  onRemove: (userId: Id<'users'>) => void
  borderColor?: ColorTokens
}

export function RecipientChip({
  userId,
  username,
  avatarUrl,
  onRemove,
  borderColor = '$color10',
}: RecipientChipProps) {
  return (
    <XStack
      items="center"
      gap="$2"
      px="$2"
      py="$1"
      borderWidth={2}
      borderColor={borderColor}
      style={{ borderRadius: 16 }}
    >
      <Avatar circular size="$2">
        <Avatar.Image src={avatarUrl} />
        <Avatar.Fallback bg="$color5" />
      </Avatar>
      <Text fontSize="$3" fontWeight="600">
        @{username}
      </Text>
      <Pressable
        onPress={() => onRemove(userId)}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.3 : 0.5,
          paddingHorizontal: 4,
        })}
      >
        <Text fontSize="$3" fontWeight="800">
          ✕
        </Text>
      </Pressable>
    </XStack>
  )
}
