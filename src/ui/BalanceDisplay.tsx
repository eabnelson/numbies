import { Pressable, Text, useWindowDimensions } from 'react-native'
import { useTheme, YStack } from 'tamagui'
import {
  abbreviateBalance,
  calculateResponsiveFontSize,
  formatWithCommas,
  parseBalance,
} from '../utils/formatters'

// Re-export for backwards compatibility
export { abbreviateBalance }

type BalanceDisplayProps = {
  balance: string
  onPress: () => void
}

export function BalanceDisplay({ balance, onPress }: BalanceDisplayProps) {
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()

  // Cap width for font calculation to prevent oversized text on large screens
  const maxLayoutWidth = 480
  const layoutWidth = Math.min(screenWidth, maxLayoutWidth)

  // Format balance: drop .00 if whole number, add commas
  const formatFullBalance = (bal: string): string => {
    const num = parseBalance(bal)
    // Drop .00 for whole numbers
    if (num % 1 === 0) {
      return formatWithCommas(String(Math.floor(num)))
    }
    return formatWithCommas(num.toFixed(2))
  }

  const fullText = `$${formatFullBalance(balance)}`

  // Calculate font size based on character count and screen width
  // Use a conservative charWidthRatio (0.65) to prevent truncation on web
  const fontSize = calculateResponsiveFontSize(fullText, layoutWidth, {
    min: 32,
    max: 120,
    padding: 48,
    charWidthRatio: 0.65,
  })

  return (
    <Pressable
      onPress={onPress}
      style={{ outline: 'none', width: '100%' } as object}
    >
      <YStack items="center" justify="center" width="100%" px="$2">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.3}
          style={{
            fontSize,
            lineHeight: fontSize * 1.1,
            fontWeight: '700',
            color: theme.color12.val,
            textAlign: 'center',
            width: '100%',
          }}
        >
          {fullText}
        </Text>
      </YStack>
    </Pressable>
  )
}
