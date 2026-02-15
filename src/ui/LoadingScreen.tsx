import { useEffect, useRef } from 'react'
import { Animated, Platform, Text, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, YStack } from 'tamagui'
import { calculateResponsiveFontSize } from '../utils/formatters'

export function LoadingScreen() {
  const theme = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const pulseAnim = useRef(new Animated.Value(0.3)).current

  const isWeb = Platform.OS === 'web'
  const topTotalHeight = isWeb ? 100 : top + 100
  const bottomTotalHeight = isWeb ? 100 : bottom + 100

  // Pulse animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [pulseAnim])

  const displayText = '$NUMBIES.XYZ'
  // Cap width for font calculation to prevent oversized text on large screens
  const maxLayoutWidth = 480
  const layoutWidth = Math.min(screenWidth, maxLayoutWidth)
  const fontSize = calculateResponsiveFontSize(displayText, layoutWidth, {
    min: 32,
    max: 72,
    padding: 48,
    charWidthRatio: 0.65,
  })

  return (
    <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
      {/* Top: Pulsing Request Button */}
      <Animated.View
        style={
          {
            position: isWeb ? 'fixed' : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: topTotalHeight,
            backgroundColor: 'rgba(7, 104, 66, 0.3)',
            opacity: pulseAnim,
          } as object
        }
      />

      {/* Center: $numbies.xyz */}
      <YStack
        flex={1}
        justify="center"
        items="center"
        px="$4"
        pb={isWeb ? 85 : 0}
      >
        <Text
          style={{
            fontSize,
            fontWeight: '700',
            color: theme.color8.val,
            textAlign: 'center',
          }}
        >
          {displayText}
        </Text>
      </YStack>

      {/* Bottom: Pulsing Send Button */}
      <Animated.View
        style={
          {
            position: isWeb ? 'fixed' : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: bottomTotalHeight,
            backgroundColor: 'rgba(24, 143, 237, 0.3)',
            opacity: pulseAnim,
          } as object
        }
      />
    </YStack>
  )
}
