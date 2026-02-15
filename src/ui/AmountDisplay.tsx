import { Text, useWindowDimensions } from 'react-native'
import { useTheme, XStack, YStack } from 'tamagui'
import {
  calculateResponsiveFontSize,
  formatExpression,
} from '../utils/formatters'

type AmountDisplayProps = {
  expression: string
  successLabel?: string
}

export function AmountDisplay({
  expression,
  successLabel,
}: AmountDisplayProps) {
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()

  // Just format the expression with commas
  const displayText = formatExpression(expression)
  const fullText = `$${displayText}`

  // Calculate font size based on character count and screen width
  const fontSize = calculateResponsiveFontSize(fullText, screenWidth, {
    min: 32,
    max: 80,
  })
  // Success label is smaller than amount
  const labelFontSize = Math.min(48, Math.max(24, fontSize * 0.6))

  return (
    <YStack items="center" justify="center" px="$2" width="100%">
      <XStack items="baseline" justify="center" width="100%" flexWrap="nowrap">
        <Text
          style={{
            fontSize,
            fontWeight: '700',
            color: theme.color12.val,
          }}
        >
          $
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize,
            lineHeight: fontSize,
            fontWeight: '700',
            color: theme.color12.val,
          }}
        >
          {displayText}
        </Text>
      </XStack>
      {successLabel && (
        <Text
          style={{
            fontSize: labelFontSize,
            fontWeight: '700',
            color: 'black',
            marginTop: 8,
            textTransform: 'uppercase',
          }}
        >
          {successLabel}
        </Text>
      )}
    </YStack>
  )
}
