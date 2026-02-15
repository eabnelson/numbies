import { useCallback, useEffect, useState } from 'react'
import { type Address, erc20Abi, formatUnits } from 'viem'
import { alphaUsd, publicClient } from './tempo'

// Cache decimals to avoid repeated contract calls
let cachedDecimals: number | null = null

const POLL_INTERVAL = 10_000 // 10 seconds

export function useOnChainBalance(address: Address | undefined) {
  const [balance, setBalance] = useState<string>('0.00')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!address) {
      // Don't set loading=false when there's no address - stay in loading state
      // until we have an address to fetch from
      return
    }

    try {
      // Fetch decimals if not cached
      if (cachedDecimals === null) {
        cachedDecimals = await publicClient.readContract({
          address: alphaUsd,
          abi: erc20Abi,
          functionName: 'decimals',
        })
      }

      // Fetch balance
      const rawBalance = await publicClient.readContract({
        address: alphaUsd,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })

      // Format with 2 decimal places
      const formatted = formatUnits(rawBalance, cachedDecimals)
      const num = Number.parseFloat(formatted)
      setBalance(num.toFixed(2))
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch balance'),
      )
    } finally {
      setLoading(false)
    }
  }, [address])

  // Initial fetch and polling
  useEffect(() => {
    // Reset state when address changes
    setLoading(true)
    setError(null)

    // Fetch immediately
    fetchBalance()

    // Set up polling interval
    const intervalId = setInterval(fetchBalance, POLL_INTERVAL)

    return () => clearInterval(intervalId)
  }, [fetchBalance])

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true)
    fetchBalance()
  }, [fetchBalance])

  return {
    balance,
    loading,
    error,
    refresh,
  }
}
