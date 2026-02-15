import { Pressable, Text as RNText, useWindowDimensions } from 'react-native'
import type { ColorTokens } from 'tamagui'
import { Text, useTheme, XStack, YStack } from 'tamagui'
import type { Id } from '../../convex/_generated/dataModel'
import type { RecipientSplit } from '../hooks/useSplitCalculator'
import {
  calculateResponsiveFontSize,
  formatAmount,
  formatExpression,
} from '../utils/formatters'
import { SheetScrollView } from './AppSheet'
import { RecipientChip } from './RecipientChip'

type SplitAmountDisplayProps = {
  splits: RecipientSplit[]
  selectedUserId: string | null
  onSelectUser: (userId: string | null) => void
  onRemoveRecipient: (userId: Id<'users'>) => void
  labelColor?: ColorTokens
  totalExpression: string // Expression for total amount
  userExpression: string // Expression for selected user's amount
}

export function SplitAmountDisplay({
  splits,
  selectedUserId,
  onSelectUser,
  onRemoveRecipient,
  labelColor = '$color12',
  totalExpression,
  userExpression,
}: SplitAmountDisplayProps) {
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()

  // Format the total expression like AmountDisplay
  const displayText = formatExpression(totalExpression)
  const fullText = `$${displayText}`

  // Calculate font size based on character count and screen width (smaller than AmountDisplay)
  const fontSize = calculateResponsiveFontSize(fullText, screenWidth, {
    min: 28,
    max: 48,
  })

  return (
    <YStack flex={1}>
      {/* Main Amount Display - always shows total */}
      <YStack items="center" height={56} mt={-8} px="$4">
        <Pressable
          onPress={() => onSelectUser(null)}
          disabled={selectedUserId === null}
        >
          <XStack
            items="baseline"
            justify="center"
            opacity={selectedUserId === null ? 1 : 0.5}
          >
            <RNText
              style={{
                fontSize,
                fontWeight: '700',
                color: theme.color12.val,
              }}
            >
              $
            </RNText>
            <RNText
              numberOfLines={1}
              style={{
                fontSize,
                lineHeight: fontSize,
                fontWeight: '700',
                color: theme.color12.val,
              }}
            >
              {displayText}
            </RNText>
          </XStack>
        </Pressable>
      </YStack>

      {/* Scrollable Recipients List */}
      <SheetScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <YStack px="$4" gap="$3" pt="$2" pb="$4">
          {splits.map((split) => {
            const isSelected = selectedUserId === split.userId
            // Show expression when selected, otherwise show formatted amount
            const amountText = isSelected
              ? formatExpression(userExpression)
              : formatAmount(split.amount)

            return (
              <Pressable
                key={split.userId}
                onPress={() => onSelectUser(split.userId)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <XStack items="center" justify="space-between">
                  <Text
                    fontSize="$6"
                    fontWeight="700"
                    opacity={isSelected ? 1 : 0.7}
                  >
                    ${amountText}
                  </Text>
                  <RecipientChip
                    userId={split.userId as Id<'users'>}
                    username={split.username}
                    avatarUrl={split.avatarUrl}
                    onRemove={onRemoveRecipient}
                    borderColor={labelColor}
                  />
                </XStack>
              </Pressable>
            )
          })}
        </YStack>
      </SheetScrollView>
    </YStack>
  )
}
