import * as Linking from 'expo-linking'
import { useParams, useRouter } from 'one'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, YStack } from 'tamagui'
import type { Address } from 'viem'
import type { Id } from '~/convex/_generated/dataModel'
import { useAuth } from '~/src/auth/AuthContext'
import { usePrivyAuth } from '~/src/auth/privy/usePrivyAuth'
import { useBalance } from '~/src/blockchain/useBalance'
import { BalanceDisplay } from '~/src/ui/BalanceDisplay'
import { LoadingScreen } from '~/src/ui/LoadingScreen'
import { LoginFlow } from '~/src/ui/LoginFlow'
import { ReceiveDrawer } from '~/src/ui/ReceiveDrawer'
import { SendDrawer } from '~/src/ui/SendDrawer'
import { UserDrawer } from '~/src/ui/UserDrawer'

type PrefilledRequest = {
  requestId: Id<'requests'>
  amount: string
  recipientUsername: string
  recipientAvatarUrl?: string
  recipientUserId: Id<'users'>
  note?: string
}

type PrefilledContact = {
  contactId: string
  name: string
  address: string
  avatarUrl: string
}

/**
 * Parse a deep link URL and extract the username if it's a user link.
 * Supports formats:
 * - numbies://user/{username}
 * - https://numbies.xyz/user/{username}
 * - https://{dev-host}/user/{username} (when EXPO_PUBLIC_DEV_HMR_HOST is set)
 */
function parseDeepLinkUsername(url: string): string | null {
  try {
    // Handle numbies:// scheme
    if (url.startsWith('numbies://user/')) {
      const username = url.replace('numbies://user/', '').split(/[?#]/)[0]
      return username || null
    }

    // Handle https:// URLs
    const parsed = new URL(url)
    const pathMatch = parsed.pathname.match(/^\/user\/([^/?#]+)/)
    if (pathMatch?.[1]) {
      return pathMatch[1]
    }

    return null
  } catch {
    return null
  }
}

export default function HomePage() {
  const theme = useTheme()
  const router = useRouter()
  const { top, bottom } = useSafeAreaInsets()
  const { ready, authenticated } = usePrivyAuth()
  const { needsUsername, dbUser } = useAuth()
  const { balance, loading: balanceLoading } = useBalance(
    dbUser?.walletAddress as Address | undefined,
  )

  // Get query params for deep link handling
  const params = useParams<{ send?: string; request?: string }>()

  const isWeb = Platform.OS === 'web'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [prefilledRequest, setPrefilledRequest] =
    useState<PrefilledRequest | null>(null)
  const [prefilledUsername, setPrefilledUsername] = useState<string | null>(
    null,
  )
  const [prefilledSendContact, setPrefilledSendContact] =
    useState<PrefilledContact | null>(null)
  const [prefilledReceiveContact, setPrefilledReceiveContact] =
    useState<PrefilledContact | null>(null)

  const handlePayRequest = (request: PrefilledRequest) => {
    setPrefilledRequest(request)
    setDrawerOpen(false)
    setSendOpen(true)
  }

  const handleSendToContact = (contact: PrefilledContact) => {
    setPrefilledSendContact(contact)
    setDrawerOpen(false)
    setSendOpen(true)
  }

  const handleRequestFromContact = (contact: PrefilledContact) => {
    setPrefilledReceiveContact(contact)
    setDrawerOpen(false)
    setReceiveOpen(true)
  }

  // Handle deep link query params (send=username or request=username)
  useEffect(() => {
    if (!authenticated) return

    if (params.send) {
      setPrefilledUsername(params.send)
      setSendOpen(true)
      // Clear the query param from URL
      router.replace('/')
    } else if (params.request) {
      setPrefilledUsername(params.request)
      setReceiveOpen(true)
      // Clear the query param from URL
      router.replace('/')
    }
  }, [authenticated, params.send, params.request, router])

  // Handle native deep links (numbies://user/{username})
  useEffect(() => {
    if (Platform.OS === 'web') return

    // Handler for incoming deep links
    const handleDeepLink = (event: { url: string }) => {
      const username = parseDeepLinkUsername(event.url)
      if (username && authenticated) {
        setPrefilledUsername(username)
        // Default to opening SendDrawer for user deep links
        setSendOpen(true)
      }
    }

    // Check if app was opened via deep link
    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        handleDeepLink({ url: initialUrl })
      }
    }

    // Only check initial URL once authenticated
    if (authenticated) {
      checkInitialUrl()
    }

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink)

    return () => {
      subscription.remove()
    }
  }, [authenticated])

  // Auto-open drawer when user needs to set username
  useEffect(() => {
    if (authenticated && needsUsername) {
      // Small delay to let login flow complete
      const timer = setTimeout(() => {
        setDrawerOpen(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [authenticated, needsUsername])

  const handleBalancePress = () => {
    if (authenticated) {
      setDrawerOpen(true)
    }
  }

  // All platforms get same base height, native adds safe areas
  const topTotalHeight = isWeb ? 100 : top + 100
  const bottomTotalHeight = isWeb ? 100 : bottom + 100

  // Show loading screen while Privy is initializing
  if (!ready) {
    return <LoadingScreen />
  }

  // Show login flow when not authenticated
  if (!authenticated) {
    return (
      <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
        <LoginFlow />
      </YStack>
    )
  }

  // Show loading screen while balance is loading
  if (balanceLoading) {
    return <LoadingScreen />
  }

  return (
    <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
      {/* Top: Request Button - Fixed at top */}
      <Pressable
        onPress={() => setReceiveOpen(true)}
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
          } as object
        }
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: '900',
            letterSpacing: 24,
            textAlign: 'center',
            marginLeft: 28,
            color: theme.brandGreen.val,
          }}
        >
          REQUEST
        </Text>
      </Pressable>

      {/* Center: Balance Display - slightly above center */}
      <YStack
        flex={1}
        justify="center"
        items="center"
        px="$4"
        pb={isWeb ? 85 : 0}
      >
        <BalanceDisplay balance={balance} onPress={handleBalancePress} />
      </YStack>

      {/* Bottom: Send Button - Fixed at bottom */}
      <Pressable
        onPress={() => setSendOpen(true)}
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
          } as object
        }
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: '900',
            letterSpacing: 26,
            textAlign: 'center',
            marginLeft: 28,
            color: theme.brandBlue.val,
          }}
        >
          SEND
        </Text>
      </Pressable>

      {/* Sheets */}
      <UserDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onPayRequest={handlePayRequest}
        onSendToContact={handleSendToContact}
        onRequestFromContact={handleRequestFromContact}
      />
      <SendDrawer
        open={sendOpen}
        onOpenChange={setSendOpen}
        prefilledRequest={prefilledRequest}
        onClearPrefilled={() => setPrefilledRequest(null)}
        prefilledUsername={prefilledUsername}
        onClearPrefilledUsername={() => setPrefilledUsername(null)}
        prefilledContact={prefilledSendContact}
        onClearPrefilledContact={() => setPrefilledSendContact(null)}
      />
      <ReceiveDrawer
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        prefilledUsername={prefilledUsername}
        onClearPrefilledUsername={() => setPrefilledUsername(null)}
        prefilledContact={prefilledReceiveContact}
        onClearPrefilledContact={() => setPrefilledReceiveContact(null)}
      />
    </YStack>
  )
}
