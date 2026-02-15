import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { usePrivyAuth } from './privy/usePrivyAuth'

type PrivyUser = {
  id: string
  phone?: { number: string } | null
  email?: { address: string } | null
}

export function AuthHandler({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, walletAddress } = usePrivyAuth() as {
    ready: boolean
    authenticated: boolean
    user: PrivyUser | null
    walletAddress: string | undefined
  }
  const { saveUserOnLogin, updateWalletAddress, clearUser, dbUser } = useAuth()
  const lastPrivyId = useRef<string | null>(null)
  const lastWalletAddress = useRef<string | null>(null)

  useEffect(() => {
    // Handle login: save user to DB when authenticated with a new Privy user
    if (ready && authenticated && user?.id && lastPrivyId.current !== user.id) {
      lastPrivyId.current = user.id
      lastWalletAddress.current = walletAddress ?? null
      saveUserOnLogin({ ...user, walletAddress }).catch((err) => {
        console.error('Failed to save user on login:', err)
        // Reset so we can retry
        lastPrivyId.current = null
      })
    }

    // Handle logout: clear user when no longer authenticated
    if (ready && !authenticated && dbUser) {
      lastPrivyId.current = null
      lastWalletAddress.current = null
      clearUser()
    }
  }, [
    ready,
    authenticated,
    user,
    walletAddress,
    dbUser,
    saveUserOnLogin,
    clearUser,
  ])

  // Handle wallet address becoming available after login
  // (wallet may load slightly after user auth completes)
  useEffect(() => {
    if (
      dbUser &&
      walletAddress &&
      lastWalletAddress.current !== walletAddress
    ) {
      lastWalletAddress.current = walletAddress
      updateWalletAddress(walletAddress)
    }
  }, [dbUser, walletAddress, updateWalletAddress])

  return <>{children}</>
}
