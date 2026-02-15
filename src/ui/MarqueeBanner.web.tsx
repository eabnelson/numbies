import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated'
import type { MarqueeBannerProps } from './MarqueeBanner'

const MeasureElement = ({
  onLayout,
  children,
}: {
  onLayout: (width: number) => void
  children: React.ReactNode
}) => (
  <Animated.ScrollView
    horizontal
    style={styles.hidden}
    pointerEvents="box-none"
  >
    <View onLayout={(ev) => onLayout(ev.nativeEvent.layout.width)}>
      {children}
    </View>
  </Animated.ScrollView>
)

const TranslatedElement = ({
  index,
  children,
  offset,
  childrenWidth,
}: {
  index: number
  children: React.ReactNode
  offset: SharedValue<number>
  childrenWidth: number
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    left: (index - 1) * childrenWidth,
    transform: [{ translateX: -offset.value }],
  }))
  return (
    <Animated.View style={[styles.absolute, animatedStyle]}>
      {children}
    </Animated.View>
  )
}

const ChildrenScroller = ({
  duration,
  childrenWidth,
  parentWidth,
  children,
}: {
  duration: number
  childrenWidth: number
  parentWidth: number
  children: React.ReactNode
}) => {
  const offset = useSharedValue(0)

  useFrameCallback((i) => {
    // Negative coefficient for left-to-right movement
    offset.value +=
      (-1 * ((i.timeSincePreviousFrame ?? 1) * childrenWidth)) / duration
    offset.value = offset.value % childrenWidth
  }, true)

  const count = Math.round(parentWidth / childrenWidth) + 2
  const indices = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {indices.map((index) => (
        <TranslatedElement
          key={`clone-${index}`}
          index={index}
          offset={offset}
          childrenWidth={childrenWidth}
        >
          {children}
        </TranslatedElement>
      ))}
    </>
  )
}

export function MarqueeBanner({ text, textColor }: MarqueeBannerProps) {
  const [parentWidth, setParentWidth] = React.useState(0)
  const [childrenWidth, setChildrenWidth] = React.useState(0)

  return (
    <View
      style={styles.container}
      onLayout={(ev) => setParentWidth(ev.nativeEvent.layout.width)}
      pointerEvents="box-none"
    >
      <View style={styles.row} pointerEvents="box-none">
        <MeasureElement onLayout={setChildrenWidth}>
          <Text style={[styles.text, { color: textColor }]}>{text} </Text>
        </MeasureElement>

        {childrenWidth > 0 && parentWidth > 0 && (
          <ChildrenScroller
            duration={700}
            parentWidth={parentWidth}
            childrenWidth={childrenWidth}
          >
            <Text style={[styles.text, { color: textColor }]}>{text} </Text>
          </ChildrenScroller>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
    zIndex: -1,
  },
  row: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  absolute: {
    position: 'absolute',
  },
  text: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 26,
    paddingRight: 10,
  },
})
