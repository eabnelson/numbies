import { useAction, useMutation } from 'convex/react'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type DbUser = {
  _id: Id<'users'>
  _creationTime: number
  privyId: string
  username?: string
  phoneNumber?: string
  email?: string
  displayName?: string
  avatarUrl?: string
  walletAddress?: string
}

type AuthContextType = {
  dbUser: DbUser | null
  isLoading: boolean
  needsUsername: boolean
  saveUserOnLogin: (privyUser: {
    id: string
    phone?: { number: string } | null
    email?: { address: string } | null
    walletAddress?: string
  }) => Promise<{ isNew: boolean; user: DbUser }>
  updateWalletAddress: (walletAddress: string) => Promise<void>
  setUsername: (username: string) => Promise<DbUser>
  generateUsername: () => Promise<DbUser>
  updateAvatarUrl: (avatarUrl: string) => void
  clearUser: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [needsUsername, setNeedsUsername] = useState(false)

  // Convex mutations and actions
  const createOrFindUserMutation = useMutation(api.users.createOrFindUser)
  const updateUserMutation = useMutation(api.users.updateUser)
  const updateWalletAddressMutation = useMutation(api.users.updateWalletAddress)
  const seedNewUserAction = useAction(api.faucet.seedNewUser)

  const saveUserOnLogin = useCallback(
    async (privyUser: {
      id: string
      phone?: { number: string } | null
      email?: { address: string } | null
      walletAddress?: string
    }) => {
      setIsLoading(true)
      try {
        const result = await createOrFindUserMutation({
          privyId: privyUser.id,
          phoneNumber: privyUser.phone?.number,
          email: privyUser.email?.address,
          walletAddress: privyUser.walletAddress,
        })

        if (result.user) {
          setDbUser(result.user as DbUser)
          setNeedsUsername(!result.user.username)

          // Fire-and-forget: try to seed new user with testnet funds
          if (result.user.walletAddress) {
            seedNewUserAction({
              walletAddress: result.user.walletAddress,
              userCreationTime: result.user._creationTime,
            }).catch((err) => {
              console.log('[Faucet] Seeding skipped or failed:', err)
            })
          }
        }
        return result as { isNew: boolean; user: DbUser }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        // Silently ignore "login flow was closed" - user cancelled
        if (
          errorMessage.includes('login flow was closed') ||
          errorMessage.includes('closed')
        ) {
          console.log('Login flow was cancelled by user')
          return { isNew: false, user: null as unknown as DbUser }
        }
        console.error('saveUserOnLogin error:', errorMessage, err)
        throw new Error(errorMessage || 'Failed to save user')
      } finally {
        setIsLoading(false)
      }
    },
    [createOrFindUserMutation, seedNewUserAction],
  )

  const setUsername = useCallback(
    async (username: string) => {
      if (!dbUser) throw new Error('No user logged in')

      setIsLoading(true)
      try {
        const avatarUrl = `https://api.dicebear.com/9.x/glass/png?seed=${dbUser._id}`
        const updatedUser = await updateUserMutation({
          privyId: dbUser.privyId,
          username,
          avatarUrl,
        })

        if (updatedUser) {
          setDbUser(updatedUser as DbUser)
          setNeedsUsername(false)
        }
        return updatedUser as DbUser
      } finally {
        setIsLoading(false)
      }
    },
    [dbUser, updateUserMutation],
  )

  const generateUsername = useCallback(async () => {
    if (!dbUser) throw new Error('No user logged in')

    setIsLoading(true)
    try {
      const updatedUser = await updateUserMutation({
        privyId: dbUser.privyId,
        generateUsername: true,
      })

      if (updatedUser) {
        setDbUser(updatedUser as DbUser)
        setNeedsUsername(false)
      }
      return updatedUser as DbUser
    } finally {
      setIsLoading(false)
    }
  }, [dbUser, updateUserMutation])

  const updateWalletAddress = useCallback(
    async (walletAddress: string) => {
      if (!dbUser) return
      try {
        const updatedUser = await updateWalletAddressMutation({
          privyId: dbUser.privyId,
          walletAddress,
        })
        if (updatedUser) {
          setDbUser(updatedUser as DbUser)
        }
      } catch (err) {
        console.error('Failed to update wallet address:', err)
      }
    },
    [dbUser, updateWalletAddressMutation],
  )

  const updateAvatarUrl = useCallback((avatarUrl: string) => {
    setDbUser((prev) => (prev ? { ...prev, avatarUrl } : null))
  }, [])

  const clearUser = useCallback(() => {
    setDbUser(null)
    setNeedsUsername(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        dbUser,
        isLoading,
        needsUsername,
        saveUserOnLogin,
        updateWalletAddress,
        setUsername,
        generateUsername,
        updateAvatarUrl,
        clearUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
