// Type augmentation for Tamagui v4 style props
// This fixes TypeScript not recognizing style props like padding, backgroundColor, etc.

import '@tamagui/core'
import type { ViewStyle, TextStyle } from 'react-native'

declare module '@tamagui/core' {
  interface StackStyleBase extends ViewStyle {}
  interface TextStylePropsBase extends TextStyle {}
}

declare module 'tamagui' {
  interface StackStyleBase extends ViewStyle {}
  interface TextStylePropsBase extends TextStyle {}
}
