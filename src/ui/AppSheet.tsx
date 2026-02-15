import { BlurView } from 'expo-blur'
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Animated,
  type GestureResponderEvent,
  PanResponder,
  type PanResponderGestureState,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack, type YStackProps } from 'tamagui'

const DISMISS_THRESHOLD = 0.1

// Context to allow child ScrollViews to signal they're scrolling
type ScrollLockContextType = {
  setScrolling: (isScrolling: boolean) => void
  isScrollingRef: React.MutableRefObject<boolean>
}

const ScrollLockContext = createContext<ScrollLockContextType | null>(null)

export function useSheetScrollLock() {
  return useContext(ScrollLockContext)
}

// Detect if device supports touch (mobile web + tablets)
const isTouchDevice =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  'ontouchstart' in window

type AppSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** Percentage of screen height (0-100). Default 80 */
  snapPoint?: number
  /** Position of the sheet. Default 'bottom' */
  position?: 'top' | 'bottom'
  /** Whether the sheet can be dismissed by tapping overlay or swiping. Default true */
  dismissible?: boolean
  /** Background color overlay on the sheet content */
  tintColor?: YStackProps['bg']
  /** Opacity of the tint color. Default 0.15 */
  tintOpacity?: number
  /** Disable safe area padding. Default false */
  disableSafeArea?: boolean
}

export function AppSheet({
  open,
  onOpenChange,
  children,
  snapPoint = 80,
  position = 'bottom',
  dismissible = true,
  tintColor,
  tintOpacity = 0.15,
  disableSafeArea = false,
}: AppSheetProps) {
  const { top, bottom } = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const isTop = position === 'top'

  // Use window.innerHeight on web for accurate viewport height
  const screenHeight =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.innerHeight
      : windowHeight

  // Lock sheet height when opened to prevent re-animation from viewport changes (e.g., keyboard)
  const lockedHeightRef = useRef<number | null>(null)
  if (open && lockedHeightRef.current === null) {
    lockedHeightRef.current = (screenHeight * snapPoint) / 100
  } else if (!open) {
    lockedHeightRef.current = null
  }
  const sheetHeight =
    lockedHeightRef.current ?? (screenHeight * snapPoint) / 100
  const dismissThreshold = sheetHeight * DISMISS_THRESHOLD

  const [isVisible, setIsVisible] = useState(open)
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false)
  const translateY = useRef(new Animated.Value(0)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current

  // Web drag state
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const currentDragY = useRef(0)
  const pointerTarget = useRef<HTMLElement | null>(null)
  const pointerId = useRef<number | null>(null)

  // Track when sheet opened to prevent immediate dismiss from opening touch
  const openedAtRef = useRef(0)
  const sheetRef = useRef<View>(null)

  // Scroll lock state - prevents sheet dismiss when child ScrollView is actively scrolling
  const isScrollingRef = useRef(false)
  const setScrolling = useCallback((scrolling: boolean) => {
    isScrollingRef.current = scrolling
  }, [])
  const scrollLockContextValue = useMemo(
    () => ({ setScrolling, isScrollingRef }),
    [setScrolling],
  )

  // Don't use native driver on web
  const useNativeDriver = Platform.OS !== 'web'

  // Reset all refs when drawer opens or closes
  useEffect(() => {
    isDragging.current = false
    dragStartY.current = 0
    currentDragY.current = 0
    pointerTarget.current = null
    pointerId.current = null
    if (open) {
      openedAtRef.current = Date.now()
    }
  }, [open])

  useEffect(() => {
    const closedPosition = isTop ? -sheetHeight : sheetHeight

    if (open) {
      setIsVisible(true)
      setIsAnimatingOpen(true)
      translateY.setValue(closedPosition)
      overlayOpacity.setValue(0)

      // Use setTimeout for more reliable timing on web
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            tension: 100,
            friction: 12,
            useNativeDriver,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver,
          }),
        ]).start(() => {
          setIsAnimatingOpen(false)
        })
      }, 10)

      return () => clearTimeout(timer)
    } else if (isVisible) {
      // Handle programmatic close (when open changes to false)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: closedPosition,
          tension: 100,
          friction: 12,
          useNativeDriver,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver,
        }),
      ]).start(() => {
        setIsVisible(false)
      })
    }
  }, [
    open,
    isTop,
    sheetHeight,
    useNativeDriver,
    isVisible,
    overlayOpacity,
    translateY,
  ])

  // Shared dismiss animation
  const animateDismiss = useCallback(() => {
    const closedPosition = isTop ? -sheetHeight : sheetHeight
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: closedPosition,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsVisible(false)
      onOpenChange(false)
    })
  }, [isTop, sheetHeight, translateY, overlayOpacity, onOpenChange])

  // Shared snap back animation
  const animateSnapBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      tension: 100,
      friction: 12,
      useNativeDriver: false,
    }).start()
  }, [translateY])

  // Touch event handlers for mobile web (more reliable than pointer events on touch devices)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isTouchDevice || !open || !dismissible) return

    const handleTouchMove = (e: TouchEvent) => {
      if (dragStartY.current === 0) return

      const touch = e.touches[0]
      if (!touch) return

      const dy = touch.clientY - dragStartY.current

      // Start dragging after threshold
      if (!isDragging.current) {
        const shouldStartDrag = isTop ? dy < -10 : dy > 10
        if (shouldStartDrag) {
          isDragging.current = true
          translateY.stopAnimation()
        } else {
          return
        }
      }

      e.preventDefault()
      currentDragY.current = dy

      if (isTop) {
        if (dy < 0) translateY.setValue(dy)
      } else {
        if (dy > 0) translateY.setValue(dy)
      }
    }

    const handleTouchEnd = () => {
      dragStartY.current = 0

      if (!isDragging.current) return
      isDragging.current = false

      const dy = currentDragY.current
      const shouldDismiss = isTop
        ? dy < -dismissThreshold
        : dy > dismissThreshold

      if (shouldDismiss) {
        animateDismiss()
      } else {
        animateSnapBack()
      }
    }

    // Use passive: false to allow preventDefault
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [
    open,
    dismissible,
    isTop,
    dismissThreshold,
    translateY,
    animateDismiss,
    animateSnapBack,
  ])

  // Check if an element or its ancestors are scrollable
  const isInsideScrollable = useCallback(
    (element: HTMLElement | null): boolean => {
      while (element) {
        const style = window.getComputedStyle(element)
        const overflowY = style.overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') {
          // Check if the element actually has scrollable content
          if (element.scrollHeight > element.clientHeight) {
            return true
          }
        }
        element = element.parentElement
      }
      return false
    },
    [],
  )

  // Touch start handler for mobile web
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!dismissible || Platform.OS !== 'web' || !isTouchDevice) return
      // Block if opened too recently (prevents opening touch from triggering drag)
      if (Date.now() - openedAtRef.current < 300) return
      // Don't capture if touch started inside a scrollable element
      if (isInsideScrollable(e.target as HTMLElement)) return

      const touch = e.touches[0]
      if (!touch) return

      dragStartY.current = touch.clientY
      currentDragY.current = 0
      isDragging.current = false
    },
    [dismissible, isInsideScrollable],
  )

  // Pointer event handlers for desktop web (non-touch devices)
  useEffect(() => {
    if (Platform.OS !== 'web' || isTouchDevice || !open || !dismissible) return

    const handlePointerMove = (e: PointerEvent) => {
      if (dragStartY.current === 0 && !isDragging.current) return

      const dy = e.clientY - dragStartY.current

      if (!isDragging.current) {
        const shouldStartDrag = isTop ? dy < -10 : dy > 10
        if (shouldStartDrag) {
          isDragging.current = true
          translateY.stopAnimation()
          if (pointerTarget.current && pointerId.current !== null) {
            pointerTarget.current.setPointerCapture(pointerId.current)
          }
        } else {
          return
        }
      }

      e.preventDefault()
      currentDragY.current = dy

      if (isTop) {
        if (dy < 0) translateY.setValue(dy)
      } else {
        if (dy > 0) translateY.setValue(dy)
      }
    }

    const handlePointerUp = () => {
      pointerTarget.current = null
      pointerId.current = null
      dragStartY.current = 0

      if (!isDragging.current) return
      isDragging.current = false

      const dy = currentDragY.current
      const shouldDismiss = isTop
        ? dy < -dismissThreshold
        : dy > dismissThreshold

      if (shouldDismiss) {
        animateDismiss()
      } else {
        animateSnapBack()
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [
    open,
    dismissible,
    isTop,
    dismissThreshold,
    translateY,
    animateDismiss,
    animateSnapBack,
  ])

  // Pointer down handler for desktop web
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (
        !dismissible ||
        Platform.OS !== 'web' ||
        isTouchDevice ||
        isAnimatingOpen
      )
        return
      // Don't capture if pointer started inside a scrollable element
      if (isInsideScrollable(e.target as HTMLElement)) return

      pointerTarget.current = e.target as HTMLElement
      pointerId.current = e.pointerId
      dragStartY.current = e.clientY
      currentDragY.current = 0
      isDragging.current = false
    },
    [dismissible, isAnimatingOpen, isInsideScrollable],
  )

  // Native PanResponder - created fresh when dependencies change
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Don't capture gestures during capture phase - let children (ScrollView) handle first
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          if (!dismissible || Platform.OS === 'web') return false
          // Don't claim gesture if a child ScrollView is actively scrolling
          if (isScrollingRef.current) return false
          const { dy, dx } = gestureState
          // If horizontal movement is significant, this is likely a scroll/swipe, not a dismiss
          if (Math.abs(dx) > Math.abs(dy) * 0.5) return false
          // Increase threshold to 20px to better differentiate from scroll gestures
          if (isTop) return dy < -20
          return dy > 20
        },
        onPanResponderGrant: () => {
          translateY.stopAnimation()
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const { dy } = gestureState
          if (isTop) {
            if (dy < 0) translateY.setValue(dy)
          } else {
            if (dy > 0) translateY.setValue(dy)
          }
        },
        onPanResponderRelease: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const { dy, vy } = gestureState
          const shouldDismiss = isTop
            ? dy < -dismissThreshold || vy < -0.5
            : dy > dismissThreshold || vy > 0.5

          if (shouldDismiss) {
            const closedPosition = isTop ? -sheetHeight : sheetHeight
            Animated.parallel([
              Animated.spring(translateY, {
                toValue: closedPosition,
                tension: 100,
                friction: 12,
                useNativeDriver: true,
              }),
              Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setIsVisible(false)
              onOpenChange(false)
            })
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }).start()
          }
        },
      }),
    [
      dismissible,
      isTop,
      dismissThreshold,
      sheetHeight,
      translateY,
      overlayOpacity,
      onOpenChange,
    ],
  )

  const handleOverlayPress = useCallback(() => {
    if (!dismissible || isAnimatingOpen) return
    // Block if opened too recently (prevents opening touch from triggering overlay press)
    if (Date.now() - openedAtRef.current < 400) return

    const closedPosition = isTop ? -sheetHeight : sheetHeight
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: closedPosition,
        tension: 100,
        friction: 12,
        useNativeDriver,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start(() => {
      setIsVisible(false)
      onOpenChange(false)
    })
  }, [
    dismissible,
    isAnimatingOpen,
    isTop,
    sheetHeight,
    translateY,
    overlayOpacity,
    useNativeDriver,
    onOpenChange,
  ])

  if (!isVisible) {
    return null
  }

  return (
    <View style={styles.container} pointerEvents={open ? 'auto' : 'none'}>
      {/* Overlay */}
      {Platform.OS === 'web' ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleOverlayPress}
          pointerEvents={isAnimatingOpen ? 'none' : 'auto'}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                // @ts-expect-error - web only styles
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                opacity: overlayOpacity,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            ]}
          />
        </Pressable>
      ) : (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleOverlayPress}
          >
            <BlurView
              intensity={50}
              tint="default"
              style={StyleSheet.absoluteFill}
            />
          </Pressable>
        </Animated.View>
      )}

      {/* Sheet */}
      <Animated.View
        ref={sheetRef}
        style={[
          styles.sheet,
          isTop ? styles.sheetTop : styles.sheetBottom,
          { height: sheetHeight, transform: [{ translateY }] },
        ]}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
        // @ts-expect-error - web only events
        onTouchStart={
          Platform.OS === 'web' && isTouchDevice && dismissible
            ? handleTouchStart
            : undefined
        }
        // @ts-expect-error - web only events
        onPointerDown={
          Platform.OS === 'web' && !isTouchDevice && dismissible
            ? handlePointerDown
            : undefined
        }
      >
        <YStack flex={1} bg="$background" overflow="hidden">
          {tintColor && (
            <YStack fullscreen bg={tintColor} opacity={tintOpacity} />
          )}

          <YStack
            flex={1}
            pt={isTop ? top : 0}
            pb={isTop || disableSafeArea ? 0 : bottom}
          >
            <ScrollLockContext.Provider value={scrollLockContextValue}>
              {children}
            </ScrollLockContext.Provider>
          </YStack>
        </YStack>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxWidth: 480,
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    // @ts-expect-error - web only
    touchAction: 'none',
  },
  sheetTop: {
    top: 0,
  },
  sheetBottom: {
    bottom: 0,
  },
})

// ScrollView that integrates with AppSheet to prevent scroll/dismiss conflicts
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { type ScrollViewProps, ScrollView as TamaguiScrollView } from 'tamagui'

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>

export function SheetScrollView({
  children,
  onScrollBeginDrag,
  onScrollEndDrag,
  onMomentumScrollEnd,
  ...props
}: ScrollViewProps) {
  const scrollLock = useSheetScrollLock()

  const handleScrollBeginDrag = useCallback(
    (e: ScrollEvent) => {
      scrollLock?.setScrolling(true)
      onScrollBeginDrag?.(e)
    },
    [scrollLock, onScrollBeginDrag],
  )

  const handleScrollEndDrag = useCallback(
    (e: ScrollEvent) => {
      // Small delay to ensure gesture is fully handed off
      setTimeout(() => scrollLock?.setScrolling(false), 100)
      onScrollEndDrag?.(e)
    },
    [scrollLock, onScrollEndDrag],
  )

  const handleMomentumScrollEnd = useCallback(
    (e: ScrollEvent) => {
      scrollLock?.setScrolling(false)
      onMomentumScrollEnd?.(e)
    },
    [scrollLock, onMomentumScrollEnd],
  )

  return (
    <TamaguiScrollView
      {...props}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      scrollEventThrottle={16}
    >
      {children}
    </TamaguiScrollView>
  )
}
