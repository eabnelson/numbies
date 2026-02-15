import { Keyboard, Platform, Pressable, Text } from 'react-native'
import { useTheme, XStack, YStack } from 'tamagui'
import { evaluateExpression } from '~/src/utils/mathExpression'

// Re-export for backward compatibility
export { evaluateExpression }

const MAX_AMOUNT = 10_000_000

type MathKeypadProps = {
  value: string
  onChange: (value: string) => void
  accentColor?: string
}

export function MathKeypad({ value, onChange, accentColor }: MathKeypadProps) {
  const theme = useTheme()
  const backspaceColor = accentColor || theme.color10.val

  const handlePress = (key: string) => {
    // Dismiss iOS keyboard when using custom keypad
    if (Platform.OS !== 'web') {
      Keyboard.dismiss()
    }

    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }

    // Operators
    const operators = ['+', '-', '×', '÷']
    const isOperator = operators.includes(key)
    const lastChar = value.slice(-1)
    const lastIsOperator = operators.includes(lastChar)

    // Don't allow operator at start (except minus for negative)
    if (isOperator && !value && key !== '-') return

    // Don't allow consecutive operators (replace instead)
    if (isOperator && lastIsOperator) {
      onChange(value.slice(0, -1) + key)
      return
    }

    // Don't allow multiple decimals in the same number
    if (key === '.') {
      // Find the last number segment
      const segments = value.split(/[+\-×÷]/)
      const lastSegment = segments[segments.length - 1]
      if (lastSegment.includes('.')) return
    }

    // Limit to 2 decimal places per number segment
    if (/\d/.test(key)) {
      const segments = value.split(/[+\-×÷]/)
      const lastSegment = segments[segments.length - 1]
      const decimalIndex = lastSegment.indexOf('.')
      if (decimalIndex !== -1 && lastSegment.length - decimalIndex > 2) return
    }

    // Check if result would exceed max
    const newValue = value + key
    const result = evaluateExpression(newValue)
    if (result > MAX_AMOUNT) return

    onChange(newValue)
  }

  const renderKey = (key: string, isOperator = false) => {
    const isBackspace = key === '⌫'

    return (
      <Pressable
        style={{
          flex: 1,
          height: isOperator ? 44 : 56,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={() => handlePress(key)}
        accessibilityLabel={
          key === '⌫'
            ? 'backspace'
            : key === '×'
              ? 'multiply'
              : key === '÷'
                ? 'divide'
                : key === '+'
                  ? 'plus'
                  : key === '-'
                    ? 'minus'
                    : key
        }
        accessibilityRole="button"
      >
        <Text
          style={{
            fontSize: isOperator ? 28 : 32,
            fontWeight: isOperator ? '800' : '600',
            color: isBackspace ? backspaceColor : theme.color12.val,
          }}
        >
          {key}
        </Text>
      </Pressable>
    )
  }

  return (
    <YStack gap="$2" width="100%" pb="$3">
      {/* Row 1: Operators (smaller, no background, bolder) */}
      <XStack gap="$1" px="$2" mb="$2">
        {renderKey('+', true)}
        {renderKey('-', true)}
        {renderKey('÷', true)}
        {renderKey('×', true)}
      </XStack>
      {/* Row 2: 1 2 3 */}
      <XStack gap="$1" px="$2">
        {renderKey('1')}
        {renderKey('2')}
        {renderKey('3')}
      </XStack>
      {/* Row 3: 4 5 6 */}
      <XStack gap="$1" px="$2">
        {renderKey('4')}
        {renderKey('5')}
        {renderKey('6')}
      </XStack>
      {/* Row 4: 7 8 9 */}
      <XStack gap="$1" px="$2">
        {renderKey('7')}
        {renderKey('8')}
        {renderKey('9')}
      </XStack>
      {/* Row 5: . 0 ⌫ (3 columns to match above) */}
      <XStack gap="$1" px="$2">
        {renderKey('.')}
        {renderKey('0')}
        {renderKey('⌫')}
      </XStack>
    </YStack>
  )
}
