import { PrivyProvider } from '@privy-io/react-auth'
import type { PropsWithChildren } from 'react'
import { tempo } from '~/src/blockchain/tempo'

const appId =
  import.meta.env.EXPO_PUBLIC_PRIVY_APP_ID ??
  import.meta.env.VITE_PRIVY_APP_ID ??
  process.env.EXPO_PUBLIC_PRIVY_APP_ID ??
  process.env.PRIVY_APP_ID ??
  ''
const clientId =
  import.meta.env.WEB_PUBLIC_PRIVY_CLIENT_ID ??
  import.meta.env.VITE_WEB_PUBLIC_PRIVY_CLIENT_ID ??
  process.env.WEB_PUBLIC_PRIVY_CLIENT_ID ??
  undefined

export function AppPrivyProvider({ children }: PropsWithChildren) {
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        loginMethods: ['sms'],
        defaultChain: tempo,
        supportedChains: [tempo],
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
