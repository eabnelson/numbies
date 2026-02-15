'use node'

import { PrivyClient } from '@privy-io/server-auth'
import { v } from 'convex/values'
import { action } from '../_generated/server'

// Initialize Privy client with app credentials
const getPrivyClient = () => {
  const appId = process.env.PRIVY_APP_ID ?? process.env.EXPO_PUBLIC_PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error(
      'Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables',
    )
  }

  return new PrivyClient(appId, appSecret)
}

/**
 * Verify a Privy access token and return the user's Privy ID.
 * This action runs in Node.js and uses the Privy server SDK.
 */
export const verifyAccessToken = action({
  args: { accessToken: v.string() },
  handler: async (_ctx, args): Promise<{ privyId: string } | null> => {
    try {
      const privy = getPrivyClient()
      const claims = await privy.verifyAuthToken(args.accessToken)
      return { privyId: claims.userId }
    } catch (error) {
      console.error('Token verification failed:', error)
      return null
    }
  },
})
