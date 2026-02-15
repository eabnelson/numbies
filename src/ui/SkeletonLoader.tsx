import { useEffect, useRef } from 'react'
import { Animated, Platform, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, YStack } from 'tamagui'

/**
 * A loading skeleton that shows while auth state is being determined
 * or balance is loading. Shows pulsing buttons and a skeleton balance.
 */
export function SkeletonLoader() {
  const theme = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const isWeb = Platform.OS === 'web'

  // Animation value for pulsing opacity
  const pulseAnim = useRef(new Animated.Value(0.2)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.2,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [pulseAnim])

  const topTotalHeight = isWeb ? 100 : top + 100
  const bottomTotalHeight = isWeb ? 100 : bottom + 100

  return (
    <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
      {/* Top: Request Button skeleton */}
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
            justifyContent: 'flex-end',
            paddingBottom: 24,
            opacity: pulseAnim,
          } as object
        }
      />

      {/* Center: Balance skeleton */}
      <YStack
        flex={1}
        justify="center"
        items="center"
        px="$4"
        pb={isWeb ? 85 : 0}
      >
        <Pressable
          style={{ outline: 'none', width: '100%' } as object}
          disabled
        >
          <YStack items="center" justify="center" width="100%" px="$2">
            <Animated.Text
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: theme.color12.val,
                opacity: pulseAnim,
              }}
            >
              $NUMBIES.XYZ
            </Animated.Text>
          </YStack>
        </Pressable>
      </YStack>

      {/* Bottom: Send Button skeleton */}
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
            justifyContent: 'flex-start',
            paddingTop: 24,
            opacity: pulseAnim,
          } as object
        }
      />
    </YStack>
  )
}
