/**
 * Token transfer hook for Tempo blockchain via Privy embedded wallet.
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

// Buffer polyfill must be first - viem/tempo uses it internally
import { Buffer } from 'buffer'

globalThis.Buffer = globalThis.Buffer || Buffer

import { useWallets } from '@privy-io/react-auth'
import { useCallback, useState } from 'react'
import {
  type Address,
  createWalletClient,
  custom,
  encodeFunctionData,
  type Hash,
  parseUnits,
  walletActions,
} from 'viem'
import { tempoActions } from 'viem/tempo'
import { alphaUsd, publicClient, tempo } from './tempo'

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
  const { wallets } = useWallets()
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
        // Find the Privy embedded wallet
        const embeddedWallet = wallets.find(
          (w) => w.walletClientType === 'privy',
        )
        if (!embeddedWallet) {
          throw new Error('No embedded wallet found')
        }

        // Switch to Tempo
        await embeddedWallet.switchChain(tempo.id)

        // Get the EIP-1193 provider
        const provider = await embeddedWallet.getEthereumProvider()

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
