import { Platform } from 'react-native'
import type { ColorTokens } from 'tamagui'
import { Input, Text, XStack } from 'tamagui'

const MAX_LENGTH = 20

type NoteInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  labelColor?: ColorTokens
  rightText?: string
}

export function NoteInput({
  value,
  onChange,
  placeholder = 'optional',
  labelColor = '$color10',
  rightText,
}: NoteInputProps) {
  // biome-ignore lint/suspicious/noExplicitAny: Tamagui Input onChange type
  const handleChange = (e: any) => {
    const text = e.target?.value ?? e.nativeEvent?.text ?? ''
    if (text.length <= MAX_LENGTH) {
      onChange(text)
    }
  }

  return (
    <XStack
      items="center"
      px="$4"
      height="$6"
      overflow={Platform.OS !== 'web' ? 'hidden' : undefined}
    >
      <Text fontSize="$8" fontWeight="600" color={labelColor}>
        Note:
      </Text>
      <Input
        flex={1}
        ml="$2"
        size="$8"
        height="$6"
        minHeight="$6"
        maxHeight="$6"
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
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={MAX_LENGTH}
      />
      {rightText && (
        <Text fontSize="$5" fontWeight="600" color="$placeholderColor">
          {rightText}
        </Text>
      )}
    </XStack>
  )
}
