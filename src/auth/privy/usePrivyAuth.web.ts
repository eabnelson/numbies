import { useCreateWallet, usePrivy, useWallets } from '@privy-io/react-auth'
import { useCallback, useEffect, useRef } from 'react'

export function usePrivyAuth() {
  const { ready, authenticated, login, logout, user, getAccessToken } =
    usePrivy()
  const { wallets } = useWallets()
  const { createWallet } = useCreateWallet()
  const walletCreationAttempted = useRef(false)

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')

  // Auto-create wallet if user is authenticated but has no embedded wallet
  // Note: wallets array loads async, so we may attempt creation before it populates
  useEffect(() => {
    if (
      ready &&
      authenticated &&
      user &&
      !embeddedWallet &&
      !walletCreationAttempted.current
    ) {
      walletCreationAttempted.current = true
      createWallet().catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        // "User already has an embedded wallet" is expected due to race condition
        // between wallets loading and this effect running - not a real error
        if (message.includes('already has an embedded wallet')) {
          return
        }
        console.error('Failed to create embedded wallet:', err)
        // Reset so we can retry on next render cycle
        walletCreationAttempted.current = false
      })
    }
  }, [ready, authenticated, user, embeddedWallet, createWallet])

  // Wrap getAccessToken to ensure it returns string | null
  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken()
    return token ?? null
  }, [getAccessToken])

  return {
    ready,
    authenticated,
    user,
    walletAddress: embeddedWallet?.address,
    login: () => login({ loginMethods: ['sms'] }),
    logout,
    getAccessToken: getToken,
  }
}
