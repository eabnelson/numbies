import { useEmbeddedEthereumWallet, usePrivy } from '@privy-io/expo'
import { useLogin } from '@privy-io/expo/ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'

export function usePrivyAuth() {
  const { isReady, user, logout, getAccessToken } = usePrivy()
  const { login } = useLogin()
  const { wallets, create } = useEmbeddedEthereumWallet()
  const walletCreationAttempted = useRef(false)

  // Auto-create wallet if user is authenticated but has no wallet
  // Note: wallets array loads async, so we may attempt creation before it populates
  useEffect(() => {
    if (
      isReady &&
      user &&
      wallets.length === 0 &&
      !walletCreationAttempted.current
    ) {
      walletCreationAttempted.current = true
      create().catch((err) => {
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
  }, [isReady, user, wallets.length, create])

  // Transform the Expo SDK user to match the web SDK structure
  // Web SDK has convenience properties (user.phone, user.email)
  // Expo SDK only has linked_accounts array with phoneNumber (not number)
  const transformedUser = useMemo(() => {
    if (!user) return null

    // Find phone account in linked_accounts
    const phoneAccount = user.linked_accounts?.find(
      (account) => account.type === 'phone',
    )

    // Find email account in linked_accounts
    const emailAccount = user.linked_accounts?.find(
      (account) => account.type === 'email',
    )

    return {
      id: user.id,
      phone:
        phoneAccount && 'phoneNumber' in phoneAccount
          ? { number: phoneAccount.phoneNumber }
          : null,
      email:
        emailAccount && 'address' in emailAccount
          ? { address: emailAccount.address }
          : null,
    }
  }, [user])

  // Wrap getAccessToken to ensure it returns string | null
  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken()
    return token ?? null
  }, [getAccessToken])

  return {
    ready: isReady,
    authenticated: Boolean(user),
    user: transformedUser,
    walletAddress: wallets[0]?.address,
    login: () => login({ loginMethods: ['sms'] }),
    logout,
    getAccessToken: getToken,
  }
}
