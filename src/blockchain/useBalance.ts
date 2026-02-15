import type { Address } from 'viem'
import { useOnChainBalance } from './useOnChainBalance'

/**
 * Hook to get the token balance for a wallet address.
 * Fetches balance directly from the blockchain (source of truth).
 *
 * @param walletAddress - The wallet address to fetch balance for
 * @returns { balance, loading } - Balance formatted to 2 decimals, loading state
 */
export function useBalance(walletAddress: Address | undefined) {
  const { balance, loading } = useOnChainBalance(walletAddress)

  return {
    balance,
    loading,
  }
}
