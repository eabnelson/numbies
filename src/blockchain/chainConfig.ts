import type { Address } from 'viem'

// NETWORK SWITCH - Change this for OTA updates
// Current: TESTNET (mainnet is not live yet)
//
// To switch networks when mainnet launches:
// 1. Change ACTIVE_NETWORK to 'mainnet'
// 2. Push an OTA update via `eas update`
export const ACTIVE_NETWORK: 'testnet' | 'mainnet' = 'testnet'

type ChainConfig = {
  chainId: number
  rpcUrl: string
  explorerUrl: string
  name: string
  tokenAddress: Address
  tokenDecimals: number
  tokenSymbol: string
}

const configs: Record<'testnet' | 'mainnet', ChainConfig> = {
  testnet: {
    chainId: 42431,
    rpcUrl: 'https://rpc.moderato.tempo.xyz',
    explorerUrl: 'https://explore.tempo.xyz',
    name: 'Tempo Testnet',
    tokenAddress: '0x20c0000000000000000000000000000000000001' as Address,
    tokenDecimals: 6,
    tokenSymbol: 'AUSD',
  },
  // NOTE: Mainnet is NOT live yet. These are placeholder values.
  // Update all fields below when Tempo mainnet launches.
  mainnet: {
    chainId: 42431, // TODO: Update when mainnet launches
    rpcUrl: 'https://rpc.tempo.xyz', // TODO: Update when mainnet launches
    explorerUrl: 'https://explore.tempo.xyz',
    name: 'Tempo',
    tokenAddress: '0x20c0000000000000000000000000000000000001' as Address, // TODO: Update when mainnet launches
    tokenDecimals: 6,
    tokenSymbol: 'AUSD',
  },
}

// Export the active configuration
export const chainConfig = configs[ACTIVE_NETWORK]
