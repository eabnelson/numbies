import { Platform, Text, useWindowDimensions } from 'react-native'
import { useTheme, YStack } from 'tamagui'
import {
  calculateResponsiveFontSize,
  formatWithCommas,
} from '../utils/formatters'

type ConfirmationDisplayProps = {
  amount: string
  label: string
}

export function ConfirmationDisplay({
  amount,
  label,
}: ConfirmationDisplayProps) {
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const isWeb = Platform.OS === 'web'

  // Cap width for font calculation to prevent oversized text on large screens
  const maxLayoutWidth = 480
  const layoutWidth = Math.min(screenWidth, maxLayoutWidth)

  // Format the amount with commas
  const num = Number.parseFloat(amount) || 0
  const displayText =
    num % 1 === 0
      ? formatWithCommas(String(Math.floor(num)))
      : formatWithCommas(num.toFixed(2))
  const fullText = `$${displayText}`

  // Calculate font size based on character count and screen width
  // Use a conservative charWidthRatio (0.65) to prevent truncation
  const fontSize = calculateResponsiveFontSize(fullText, layoutWidth, {
    min: 32,
    max: 80,
    padding: 48,
    charWidthRatio: 0.65,
  })
  const labelFontSize = Math.min(48, Math.max(24, fontSize * 0.6))

  return (
    <YStack
      flex={1}
      justify="center"
      items="center"
      px="$4"
      pb={isWeb ? 40 : 80}
    >
      <YStack items="center" px="$2" width="100%">
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
        <Text
          style={{
            fontSize: labelFontSize,
            fontWeight: '700',
            color: 'black',
            marginTop: 8,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </YStack>
    </YStack>
  )
}
