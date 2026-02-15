'use node'

import { v } from 'convex/values'
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { tempoTestnet } from 'viem/chains'
import { action } from './_generated/server'

// Token config (matches src/blockchain/chainConfig.ts)
const AUSD_ADDRESS = '0x20c0000000000000000000000000000000000001' as const
const AUSD_DECIMALS = 6
const SEED_AMOUNT = '50' // $50 AUSD
const MIN_BALANCE_THRESHOLD = BigInt('500000') // $0.50 AUSD (6 decimals)
const ELIGIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

// TIP-20/ERC-20 ABI for transfer and balanceOf
const TOKEN_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const

// Tempo testnet chain config
const tempo = {
  ...tempoTestnet,
  id: 42431,
  rpcUrls: {
    default: {
      http: ['https://rpc.moderato.tempo.xyz'],
    },
  },
}

export const seedNewUser = action({
  args: {
    walletAddress: v.string(),
    userCreationTime: v.number(),
  },
  handler: async (_, args): Promise<{ seeded: boolean; error?: string }> => {
    const { walletAddress, userCreationTime } = args

    // Check if user was created within eligibility window
    const now = Date.now()
    const userAge = now - userCreationTime
    if (userAge > ELIGIBILITY_WINDOW_MS) {
      const hoursAgo = Math.round(userAge / (60 * 60 * 1000))
      return { seeded: false, error: `User created ${hoursAgo}h ago` }
    }

    // Get treasury private key from environment
    const treasuryPrivateKey = process.env.TEMPO_TESTNET_FAUCET_PRIVATE_KEY
    if (!treasuryPrivateKey) {
      console.error('[Faucet] TEMPO_TESTNET_FAUCET_PRIVATE_KEY not configured')
      return { seeded: false, error: 'Faucet not configured' }
    }

    try {
      // Create public client for balance check
      const publicClient = createPublicClient({
        chain: tempo,
        transport: http(),
      })

      // Check user's current balance
      const balance = (await publicClient.readContract({
        address: AUSD_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      })) as bigint

      if (balance >= MIN_BALANCE_THRESHOLD) {
        return { seeded: false, error: 'User balance above threshold' }
      }

      // Create treasury wallet client
      const account = privateKeyToAccount(treasuryPrivateKey as `0x${string}`)
      const walletClient = createWalletClient({
        account,
        chain: tempo,
        transport: http(),
      })

      // Execute transfer
      const amount = parseUnits(SEED_AMOUNT, AUSD_DECIMALS)
      await walletClient.writeContract({
        address: AUSD_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'transfer',
        args: [walletAddress as `0x${string}`, amount],
      })

      return { seeded: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[Faucet] Transfer failed for ${walletAddress}:`, message)
      return { seeded: false, error: message }
    }
  },
})
