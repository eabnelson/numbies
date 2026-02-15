import { useQuery } from 'convex/react'
import { useParams, useRouter } from 'one'
import { Platform, Pressable, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image, Spinner, useTheme, YStack } from 'tamagui'
import { api } from '~/convex/_generated/api'
import { useAuth } from '~/src/auth/AuthContext'
import { usePrivyAuth } from '~/src/auth/privy/usePrivyAuth'
import { LoginFlow } from '~/src/ui/LoginFlow'

export default function UserDeepLink() {
  const theme = useTheme()
  const router = useRouter()
  const { top, bottom } = useSafeAreaInsets()
  const params = useParams<{ username: string }>()
  const username = params.username ?? ''
  const { authenticated } = usePrivyAuth()
  const { dbUser } = useAuth()

  // Query the user by username
  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { username } : 'skip',
  )

  const isWeb = Platform.OS === 'web'
  const topTotalHeight = isWeb ? 100 : top + 100
  const bottomTotalHeight = isWeb ? 100 : bottom + 100

  // Find if the target user is already added as a contact
  // Note: Contacts are for external addresses, users are different
  // For users, we just navigate to send them money
  const isOwnProfile = dbUser?.username === username

  // When user is not authenticated, show login flow
  if (!authenticated) {
    return (
      <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
        <LoginFlow />
        {/* After login, user will see this page again with auth context */}
      </YStack>
    )
  }

  // Loading state
  if (targetUser === undefined) {
    return (
      <YStack flex={1} width="100%" justify="center" items="center">
        <Spinner size="large" color="$color12" />
        <Text style={{ marginTop: 20, fontSize: 16, color: theme.color11.val }}>
          Looking up @{username}...
        </Text>
      </YStack>
    )
  }

  // User not found
  if (targetUser === null) {
    return (
      <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
        {/* Top: Empty header area */}
        <YStack
          style={{
            position: isWeb ? ('fixed' as 'absolute') : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: topTotalHeight,
            backgroundColor: 'rgba(7, 104, 66, 0.3)',
            justifyContent: 'flex-end',
            paddingBottom: 24,
          }}
        />

        {/* Center: Not found message */}
        <YStack flex={1} justify="center" items="center" px="$4" pb="$12">
          <Text
            style={{
              fontSize: 64,
              marginBottom: 20,
            }}
          >
            🤷
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: theme.color12.val,
              textAlign: 'center',
            }}
          >
            User not found
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.color11.val,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            @{username} doesn't exist
          </Text>
        </YStack>

        {/* Bottom: Go Home button */}
        <Pressable
          onPress={() => router.push('/')}
          style={{
            position: isWeb ? ('fixed' as 'absolute') : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: bottomTotalHeight,
            backgroundColor: 'rgba(24, 143, 237, 0.3)',
            justifyContent: 'flex-start',
            paddingTop: 24,
          }}
        >
          <Text
            style={{
              fontSize: 40,
              fontWeight: '900',
              letterSpacing: 16,
              textAlign: 'center',
              color: theme.brandBlue.val,
            }}
          >
            HOME
          </Text>
        </Pressable>
      </YStack>
    )
  }

  // User found - show profile with action options
  const handleSend = () => {
    // Navigate to home and open send drawer with this user pre-selected
    // We'll pass the username as a query param to trigger the selection
    router.push(`/?send=${username}`)
  }

  const handleRequest = () => {
    // Navigate to home and open receive drawer with this user pre-selected
    router.push(`/?request=${username}`)
  }

  const handleGoHome = () => {
    router.push('/')
  }

  // Own profile - just show info and go home option
  if (isOwnProfile) {
    return (
      <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
        {/* Top: Empty header */}
        <YStack
          style={{
            position: isWeb ? ('fixed' as 'absolute') : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: topTotalHeight,
            backgroundColor: 'rgba(7, 104, 66, 0.3)',
            justifyContent: 'flex-end',
            paddingBottom: 24,
          }}
        />

        {/* Center: Profile info */}
        <YStack flex={1} justify="center" items="center" px="$4" pb="$12">
          <Image
            source={{ uri: targetUser.avatarUrl }}
            width={100}
            height={100}
            borderRadius={50}
            mb={16}
          />
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: theme.color12.val,
            }}
          >
            @{targetUser.username}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.color11.val,
              marginTop: 8,
            }}
          >
            This is you!
          </Text>
        </YStack>

        {/* Bottom: Go Home */}
        <Pressable
          onPress={handleGoHome}
          style={{
            position: isWeb ? ('fixed' as 'absolute') : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            height: bottomTotalHeight,
            backgroundColor: 'rgba(24, 143, 237, 0.3)',
            justifyContent: 'flex-start',
            paddingTop: 24,
          }}
        >
          <Text
            style={{
              fontSize: 40,
              fontWeight: '900',
              letterSpacing: 16,
              textAlign: 'center',
              color: theme.brandBlue.val,
            }}
          >
            HOME
          </Text>
        </Pressable>
      </YStack>
    )
  }

  // Other user - show profile with send/request options
  return (
    <YStack flex={1} width="100%" $platform-web={{ overflow: 'hidden' }}>
      {/* Top: Request button */}
      <Pressable
        onPress={handleRequest}
        style={{
          position: isWeb ? ('fixed' as 'absolute') : 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          height: topTotalHeight,
          backgroundColor: 'rgba(7, 104, 66, 0.3)',
          justifyContent: 'flex-end',
          paddingBottom: 24,
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: '900',
            letterSpacing: 16,
            textAlign: 'center',
            marginLeft: 20,
            color: theme.brandGreen.val,
          }}
        >
          REQUEST
        </Text>
      </Pressable>

      {/* Center: Profile info */}
      <YStack flex={1} justify="center" items="center" px="$4" pb="$12">
        <Image
          source={{ uri: targetUser.avatarUrl }}
          width={100}
          height={100}
          borderRadius={50}
          mb={16}
        />
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.color12.val,
          }}
        >
          @{targetUser.username}
        </Text>
        <Pressable
          onPress={handleGoHome}
          style={{
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: theme.color3.val,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.color11.val,
            }}
          >
            Go to Home
          </Text>
        </Pressable>
      </YStack>

      {/* Bottom: Send button */}
      <Pressable
        onPress={handleSend}
        style={{
          position: isWeb ? ('fixed' as 'absolute') : 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          height: bottomTotalHeight,
          backgroundColor: 'rgba(24, 143, 237, 0.3)',
          justifyContent: 'flex-start',
          paddingTop: 24,
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: '900',
            letterSpacing: 20,
            textAlign: 'center',
            marginLeft: 20,
            color: theme.brandBlue.val,
          }}
        >
          SEND
        </Text>
      </Pressable>
    </YStack>
  )
}
