import { usePrivy } from '@privy-io/react-auth'
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'
import { type ReactNode, useCallback, useMemo } from 'react'

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? ''

const convex = new ConvexReactClient(convexUrl)

function usePrivyAuth() {
  const { ready, authenticated, getAccessToken } = usePrivy()

  const fetchAccessToken = useCallback(
    async (_opts: { forceRefreshToken: boolean }) => {
      // getAccessToken handles token refresh automatically
      const token = await getAccessToken()
      return token ?? null
    },
    [getAccessToken],
  )

  return useMemo(
    () => ({
      isLoading: !ready,
      isAuthenticated: authenticated,
      fetchAccessToken,
    }),
    [ready, authenticated, fetchAccessToken],
  )
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuth}>
      {children}
    </ConvexProviderWithAuth>
  )
}
