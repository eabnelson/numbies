/**
 * Token transfer hook for Tempo blockchain via Privy embedded wallet (Native).
 *
 * TEMPO CONCURRENT TRANSACTIONS - NOT YET SUPPORTED
 * =================================================
 * Tempo supports concurrent transactions via its 2D nonce system (nonceKey).
 * This allows multiple transactions to be sent in parallel without nonce conflicts.
 *
 * To enable this, Privy's embedded wallet provider needs to support:
 * 1. Tempo transaction type (0x76) - currently only supports standard Ethereum types
 * 2. The nonceKey field in transaction signing
 *
 * When Privy adds support, update this code to use:
 * - client.token.transfer() with nonceKey parameter
 * - client.nonce.getNonce({ account, nonceKey }) to get nonce per lane
 * - Promise.all() for true parallel submission
 *
 * See: https://docs.tempo.xyz/guide/payments/send-parallel-transactions
 */

import { useEmbeddedEthereumWallet } from '@privy-io/expo'
import { useCallback, useState } from 'react'
import {
  type Address,
  createWalletClient,
  custom,
  encodeFunctionData,
  type Hash,
  type Hex,
  parseUnits,
  walletActions,
} from 'viem'
import { tempoActions } from 'viem/tempo'
import { alphaUsd, publicClient, tempo } from './tempo'

// Gas estimation constants
const GAS_BUFFER_PERCENT = BigInt(20) // Add 20% safety buffer
const DEFAULT_GAS = BigInt(200_000) // Fallback if estimation fails

/**
 * Estimates gas for a transaction with a safety buffer.
 * Falls back to a default if estimation fails.
 */
async function estimateGas(params: {
  account: Address
  to: Address
  data?: Hex
  value?: bigint
}): Promise<bigint> {
  try {
    const estimated = await publicClient.estimateGas({
      account: params.account,
      to: params.to,
      data: params.data,
      value: params.value,
    })
    // Add 20% buffer: estimated * 120 / 100
    return (estimated * (BigInt(100) + GAS_BUFFER_PERCENT)) / BigInt(100)
  } catch (error) {
    console.warn('Gas estimation failed, using default:', error)
    return DEFAULT_GAS
  }
}

/**
 * Wraps the Privy Expo provider to estimate and inject gas.
 * Privy Expo SDK doesn't auto-estimate gas like the web SDK does.
 */
interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

interface EthTransaction {
  to?: string
  data?: string
  value?: string
  gas?: string
  gasLimit?: string
}

function createGasEstimatingProvider(
  provider: EIP1193Provider,
  account: Address,
) {
  return {
    ...provider,
    request: async (args: { method: string; params?: unknown[] }) => {
      if (args.method === 'eth_sendTransaction' && args.params?.[0]) {
        const tx = args.params[0] as EthTransaction
        if (!tx.gas && !tx.gasLimit) {
          const gas = await estimateGas({
            account,
            to: tx.to as Address,
            data: tx.data as Hex | undefined,
            value: tx.value ? BigInt(tx.value) : undefined,
          })
          const gasHex = `0x${gas.toString(16)}`
          tx.gas = gasHex
          tx.gasLimit = gasHex
        }
      }
      return provider.request(args)
    },
  }
}

// TIP-20 transfer function signature for direct contract calls
const TIP20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

export type BatchRecipient = {
  to: Address
  amount: string
  memo?: string
}

type UseSendTokensResult = {
  send: (to: Address, amount: string, memo?: string) => Promise<Hash>
  /** Returns an array of hashes, one per recipient in the same order */
  sendBatch: (recipients: BatchRecipient[]) => Promise<Hash[]>
  isSending: boolean
  error: Error | null
  txHash: Hash | null
  reset: () => void
}

export function useSendTokens(): UseSendTokensResult {
  const { wallets } = useEmbeddedEthereumWallet()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setTxHash(null)
    setIsSending(false)
  }, [])

  const sendBatch = useCallback(
    async (recipients: BatchRecipient[]): Promise<Hash[]> => {
      if (recipients.length === 0) {
        throw new Error('No recipients provided')
      }

      setIsSending(true)
      setError(null)
      setTxHash(null)

      try {
        const embeddedWallet = wallets[0]
        if (!embeddedWallet) {
          throw new Error('No embedded wallet found')
        }

        // Get the EIP-1193 provider and wrap with gas estimation
        // (Privy Expo SDK doesn't auto-estimate gas like web SDK)
        const rawProvider = await embeddedWallet.getProvider()
        const provider = createGasEstimatingProvider(
          rawProvider,
          embeddedWallet.address as Address,
        )

        // Create wallet client with Tempo actions for native Tempo transaction support
        const client = createWalletClient({
          account: embeddedWallet.address as Address,
          chain: tempo,
          transport: custom(provider),
        })
          .extend(walletActions)
          .extend(tempoActions())

        // Get token metadata for decimals
        const metadata = await client.token.getMetadata({ token: alphaUsd })

        // For single transfers, use the clean Tempo API
        if (recipients.length === 1) {
          const { to, amount } = recipients[0]
          const { receipt } = await client.token.transferSync({
            to: to as Address,
            amount: parseUnits(amount, metadata.decimals),
            token: alphaUsd,
          })
          const hash = receipt.transactionHash as Hash
          setTxHash(hash)
          setIsSending(false)
          return [hash]
        }

        // For batch transfers, use parallel submission with manual nonce management.
        // We can't use Tempo's concurrent transactions (nonceKey) because Privy's
        // provider doesn't support Tempo transaction type 0x76.
        // Instead, we use standard Ethereum transactions with sequential nonces.
        const baseNonce = await publicClient.getTransactionCount({
          address: embeddedWallet.address as Address,
        })

        // Submit all transactions in parallel with incrementing nonces
        const hashes = await Promise.all(
          recipients.map(async ({ to, amount }, index) => {
            const data = encodeFunctionData({
              abi: TIP20_TRANSFER_ABI,
              functionName: 'transfer',
              args: [to as Address, parseUnits(amount, metadata.decimals)],
            })

            const hash = await client.sendTransaction({
              to: alphaUsd,
              data,
              nonce: baseNonce + index,
            })

            return hash
          }),
        )

        setTxHash(hashes[hashes.length - 1])
        setIsSending(false)
        return hashes
      } catch (err) {
        console.error('Send failed:', err)
        const error = err instanceof Error ? err : new Error('Transfer failed')
        setError(error)
        setIsSending(false)
        throw error
      }
    },
    [wallets],
  )

  // Single send is just a batch of 1
  const send = useCallback(
    async (to: Address, amount: string, memo?: string): Promise<Hash> => {
      const hashes = await sendBatch([{ to, amount, memo }])
      return hashes[0]
    },
    [sendBatch],
  )

  return {
    send,
    sendBatch,
    isSending,
    error,
    txHash,
    reset,
  }
}
