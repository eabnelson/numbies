import { Pressable, Text, View } from 'react-native'
import { Spinner, useTheme } from 'tamagui'
import { MarqueeBanner } from './MarqueeBanner'

type ActionButtonProps = {
  mode: 'send' | 'request'
  disabled?: boolean
  loading?: boolean
  confirming?: boolean
  onPress: () => void
  height?: number
  confirm?: boolean
  success?: boolean
  errorMessage?: string
}

export function ActionButton({
  mode,
  disabled = false,
  loading = false,
  confirming = false,
  onPress,
  height = 100,
  confirm = false,
  success = false,
  errorMessage,
}: ActionButtonProps) {
  const theme = useTheme()

  const isSend = mode === 'send'
  const isSmallText = errorMessage
  const confirmingLabel = isSend ? 'SENDING' : 'REQUESTING'
  const label = errorMessage
    ? errorMessage.toUpperCase()
    : success
      ? 'SUCCESS'
      : confirming
        ? confirmingLabel
        : confirm
          ? 'CONFIRM'
          : isSend
            ? 'SEND'
            : 'REQUEST'
  const bgColor = isSend ? theme.brandBlue.val : theme.brandGreen.val
  const textColor = 'rgba(255, 255, 255, 0.8)'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading || success}
      style={({ pressed }) => ({
        width: '100%',
        height,
        backgroundColor: bgColor,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Spinner color={textColor} />
        </View>
      ) : confirming ? (
        <MarqueeBanner text={confirmingLabel} textColor={textColor} />
      ) : (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text
            style={{
              fontSize: isSmallText ? 24 : 40,
              fontWeight: '900',
              letterSpacing: isSmallText ? 8 : 26,
              textAlign: 'center',
              marginLeft: isSmallText ? 10 : 28,
              color: textColor,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
