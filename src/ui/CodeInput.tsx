import { useCallback, useRef } from 'react'
import { Pressable, Text, TextInput, useWindowDimensions } from 'react-native'
import { useTheme, XStack, YStack } from 'tamagui'

const CODE_LENGTH = 6
const SLOT_KEYS = Array.from({ length: CODE_LENGTH }, (_, i) => `slot-${i}`)

type CodeInputProps = {
  value: string
  onChange: (code: string) => void
}

export function CodeInput({ value, onChange }: CodeInputProps) {
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const inputRef = useRef<TextInput>(null)

  // Pad value with placeholder dots for empty slots
  const displayChars = value.padEnd(CODE_LENGTH, '·').split('')

  // Calculate font size - code is always 6 chars + spaces
  const availableWidth = screenWidth - 32
  const charWidthRatio = 0.7
  const maxFontSize =
    availableWidth / (CODE_LENGTH * charWidthRatio + (CODE_LENGTH - 1) * 0.3)
  const fontSize = Math.min(80, Math.max(40, maxFontSize))

  const handlePress = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleChangeText = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH)
      onChange(digits)
    },
    [onChange],
  )

  return (
    <Pressable
      onPress={handlePress}
      style={{ outline: 'none', width: '100%' } as object}
    >
      <YStack items="center" width="100%" px="$2">
        <XStack items="center" justify="center" width="100%" gap="$2">
          {SLOT_KEYS.map((key, index) => {
            const char = displayChars[index]
            const isPlaceholder = index >= value.length
            return (
              <Text
                key={key}
                style={{
                  fontSize,
                  fontWeight: '700',
                  color: isPlaceholder ? theme.color8.val : theme.color12.val,
                  minWidth: fontSize * 0.6,
                  textAlign: 'center',
                }}
              >
                {char}
              </Text>
            )
          })}
        </XStack>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={CODE_LENGTH}
          style={
            {
              position: 'absolute',
              opacity: 0,
              height: 1,
              width: 1,
              caretColor: 'transparent',
            } as object
          }
        />
      </YStack>
    </Pressable>
  )
}
