import { useCallback, useMemo, useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export type RecipientSplit = {
  userId: Id<'users'>
  username: string
  avatarUrl: string
  amount: number
  isLocked: boolean
}

type UseSplitCalculatorProps = {
  recipients: Array<{
    userId: Id<'users'>
    username: string
    avatarUrl: string
  }>
  total: number
  onTotalChange: (total: number) => void
}

export function useSplitCalculator({
  recipients,
  total,
  onTotalChange,
}: UseSplitCalculatorProps) {
  // Track which recipients have manually edited amounts
  const [lockedAmounts, setLockedAmounts] = useState<Map<string, number>>(
    new Map(),
  )

  // Calculate splits
  const splits = useMemo((): RecipientSplit[] => {
    if (recipients.length === 0) return []

    const lockedTotal = Array.from(lockedAmounts.values()).reduce(
      (sum, amt) => sum + amt,
      0,
    )
    const remainingTotal = Math.max(0, total - lockedTotal)
    const unlockedRecipients = recipients.filter(
      (r) => !lockedAmounts.has(r.userId),
    )
    const unlockedCount = unlockedRecipients.length

    // Calculate even split for unlocked recipients
    let baseAmount = 0
    let remainder = 0
    if (unlockedCount > 0) {
      // Work in cents to avoid floating point issues
      const remainingCents = Math.round(remainingTotal * 100)
      baseAmount = Math.floor(remainingCents / unlockedCount) / 100
      remainder = remainingCents % unlockedCount
    }

    // Build splits array - last person added gets remainder
    return recipients.map((recipient) => {
      if (lockedAmounts.has(recipient.userId)) {
        return {
          ...recipient,
          amount: lockedAmounts.get(recipient.userId) ?? 0,
          isLocked: true,
        }
      }

      // Check if this is the last unlocked recipient (gets remainder)
      const unlockedIndex = unlockedRecipients.findIndex(
        (r) => r.userId === recipient.userId,
      )
      const isLastUnlocked = unlockedIndex === unlockedCount - 1
      const extraCents = isLastUnlocked ? remainder / 100 : 0

      return {
        ...recipient,
        amount: baseAmount + extraCents,
        isLocked: false,
      }
    })
  }, [recipients, total, lockedAmounts])

  // Update a specific recipient's amount (locks them)
  const setRecipientAmount = useCallback(
    (userId: Id<'users'>, amount: number) => {
      setLockedAmounts((prev) => {
        const next = new Map(prev)
        next.set(userId, amount)

        // If all recipients are now locked, update total to sum of locked amounts
        if (next.size >= recipients.length) {
          const newTotal = Array.from(next.values()).reduce(
            (sum, amt) => sum + amt,
            0,
          )
          // Use setTimeout to avoid state update during render
          setTimeout(() => onTotalChange(newTotal), 0)
        }

        return next
      })
    },
    [recipients.length, onTotalChange],
  )

  // Reset all to even split
  const resetSplits = useCallback(() => {
    setLockedAmounts(new Map())
  }, [])

  // Clear locked amounts when recipients change
  const clearLockedForUser = useCallback((userId: Id<'users'>) => {
    setLockedAmounts((prev) => {
      const next = new Map(prev)
      next.delete(userId)
      return next
    })
  }, [])

  // Check if any amounts have been manually edited (uneven)
  const hasUnevenSplits = lockedAmounts.size > 0

  return {
    splits,
    setRecipientAmount,
    resetSplits,
    clearLockedForUser,
    hasUnevenSplits,
  }
}
