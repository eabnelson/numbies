// Buffer polyfill must be first - viem/tempo uses it internally
import { Buffer } from 'buffer'

globalThis.Buffer = globalThis.Buffer || Buffer

import { createPublicClient, defineChain, http } from 'viem'
import { tempoTestnet } from 'viem/chains'
import { tempoActions } from 'viem/tempo'
import { chainConfig } from './chainConfig'

// Re-export token config for convenience
export const alphaUsd = chainConfig.tokenAddress

// Create chain from config with feeToken set for gas sponsorship
export const tempo = defineChain({
  ...tempoTestnet,
  id: chainConfig.chainId,
  name: chainConfig.name,
  nativeCurrency: {
    decimals: 18,
    name: 'US Dollar',
    symbol: 'USD',
  },
  rpcUrls: {
    default: {
      http: [chainConfig.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: chainConfig.explorerUrl,
    },
  },
  // Fee token for sponsored transactions on Tempo
  feeToken: chainConfig.tokenAddress,
})

export const publicClient = createPublicClient({
  chain: tempo,
  transport: http(),
}).extend(tempoActions())
