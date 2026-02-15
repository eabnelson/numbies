import '~/src/auth/privy/polyfills'
import '@tamagui/core/reset.css'
import '~/src/styles/base.css'
import '~/src/styles/tamagui.css'
import './_layout.css'

import { LogBox, Platform } from 'react-native'

// Suppress Tamagui's findNodeHandle deprecation warning (library issue)
if (Platform.OS !== 'web') {
  LogBox.ignoreLogs(['findNodeHandle is deprecated in StrictMode'])
}

/**
 * The root _layout.tsx filters <html /> and <body /> out on native
 */

import { LoadProgressBar, Slot } from 'one'
import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider, YStack } from 'tamagui'
import { AuthProvider } from '~/src/auth/AuthContext'
import { AuthHandler } from '~/src/auth/AuthHandler'
import { AppPrivyProvider } from '~/src/auth/privy/PrivyProvider'
import { ConvexClientProvider } from '~/src/convex/ConvexClientProvider'
import config from '../config/tamagui.config'

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <AppPrivyProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ConvexClientProvider>
            <TamaguiProvider
              disableInjectCSS
              config={config}
              defaultTheme="light"
            >
              <AuthProvider>
                <AuthHandler>{children}</AuthHandler>
              </AuthProvider>
            </TamaguiProvider>
          </ConvexClientProvider>
        </GestureHandlerRootView>
      </AppPrivyProvider>
    </SafeAreaProvider>
  )
}

export default function Layout() {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-visual"
        />
        <link rel="icon" href="/favicon.ico" />

        <title>Numbies</title>
        <meta name="description" content="A better payments app" />

        <meta property="og:title" content="Numbies" />
        <meta property="og:description" content="A better payments app" />
        <meta property="og:image" content="https://numbies.xyz/og-image.png" />
        <meta property="og:url" content="https://numbies.xyz" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Numbies" />
        <meta name="twitter:description" content="A better payments app" />
        <meta name="twitter:image" content="https://numbies.xyz/og-image.png" />
      </head>
      <body suppressHydrationWarning className="t_light">
        <LoadProgressBar />
        <Providers>
          <YStack
            flex={1}
            maxW={480}
            width="100%"
            mx="auto"
            $platform-web={{ height: '100%' }}
          >
            <Slot />
          </YStack>
        </Providers>
      </body>
    </html>
  )
}
