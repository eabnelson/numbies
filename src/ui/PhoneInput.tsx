import { useCallback, useRef } from 'react'
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
} from 'react-native'
import { useTheme, XStack, YStack } from 'tamagui'
import type { Country } from '../data/countries'
import {
  formatPhoneForDisplay,
  getMaxDigits,
  stripCountryCodeIfPresent,
} from '../utils/phoneFormat'

type PhoneInputProps = {
  value: string
  country: Country
  onChange: (digits: string) => void
  onCountryPress: () => void
}

export function PhoneInput({
  value,
  country,
  onChange,
  onCountryPress,
}: PhoneInputProps) {
  const theme = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const inputRef = useRef<TextInput>(null)

  const formattedPhone = formatPhoneForDisplay(value, country)
  const displayText = formattedPhone || 'PHONE'
  const isEmpty = !value

  // Calculate font size based on content and screen width
  // Cap at 480px container width for web
  const fullText = `${country.code} ${displayText}`
  const charCount = fullText.length
  const containerWidth = Math.min(screenWidth, 480)
  const availableWidth = containerWidth - 48
  const charWidthRatio = 0.58
  const maxFontSize = availableWidth / (charCount * charWidthRatio)
  const fontSize = Math.min(52, Math.max(28, maxFontSize))

  const handlePress = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleChangeText = useCallback(
    (text: string) => {
      // Strip country code if auto-fill inserted it (e.g., +15551234567 -> 5551234567)
      const digits = stripCountryCodeIfPresent(text, country)
      const maxDigits = getMaxDigits(country)
      onChange(digits.slice(0, maxDigits))
    },
    [country, onChange],
  )

  return (
    <Pressable
      onPress={handlePress}
      style={{ outline: 'none', width: '100%' } as object}
    >
      <YStack items="center" width="100%" px="$2">
        <XStack
          items="baseline"
          justify="center"
          width="100%"
          flexWrap="nowrap"
        >
          <Pressable
            onPress={onCountryPress}
            style={{ outline: 'none' } as object}
          >
            <Text
              style={{
                fontSize,
                fontWeight: '700',
                color: theme.color12.val,
                marginRight: 8,
              }}
            >
              {country.code}
            </Text>
          </Pressable>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize,
              lineHeight: fontSize * 1.1,
              fontWeight: '700',
              color: isEmpty ? theme.color8.val : theme.color12.val,
              flexShrink: 1,
            }}
          >
            {displayText}
          </Text>
        </XStack>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          keyboardType="phone-pad"
          autoComplete={Platform.OS === 'web' ? 'off' : 'tel'}
          textContentType={Platform.OS === 'web' ? 'none' : 'telephoneNumber'}
          autoCorrect={false}
          caretHidden
          style={{
            position: 'absolute',
            opacity: 0,
            height: 1,
            width: 1,
            pointerEvents: 'none',
          }}
        />
      </YStack>
    </Pressable>
  )
}
