import { PrivyProvider } from '@privy-io/expo'
import { PrivyElements } from '@privy-io/expo/ui'
import type { PropsWithChildren } from 'react'
import { tempo } from '~/src/blockchain/tempo'

const appId =
  process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? process.env.PRIVY_APP_ID ?? ''
const clientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID || undefined

export function AppPrivyProvider({ children }: PropsWithChildren) {
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      supportedChains={[tempo]}
      config={{
        embedded: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
      }}
    >
      {children}
      <PrivyElements />
    </PrivyProvider>
  )
}
