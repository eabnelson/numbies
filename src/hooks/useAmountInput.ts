import { useCallback, useEffect, useRef, useState } from 'react'
import { evaluateExpression } from '~/src/utils/mathExpression'
import type { Id } from '../../convex/_generated/dataModel'

type UseAmountInputOptions = {
  /** Split calculator setRecipientAmount function */
  setRecipientAmount?: (userId: Id<'users'>, amount: number) => void
  /** Timeout before auto-resolving math expressions (default: 1500ms) */
  autoResolveDelay?: number
}

export function useAmountInput(options: UseAmountInputOptions = {}) {
  const { setRecipientAmount, autoResolveDelay = 1500 } = options

  const [amount, setAmount] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [editingUserAmount, setEditingUserAmount] = useState('')

  const inputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userAmountTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const prevSelectedUserIdRef = useRef<string | null>(null)

  // Auto-resolve math expression after delay (for total amount)
  useEffect(() => {
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current)
    }

    if (amount && /[+\-×÷]/.test(amount)) {
      inputTimeoutRef.current = setTimeout(() => {
        const resolved = evaluateExpression(amount)
        if (resolved <= 0) {
          setAmount('')
        } else {
          const formatted =
            resolved % 1 === 0 ? String(resolved) : resolved.toFixed(2)
          setAmount(formatted)
        }
      }, autoResolveDelay)
    }

    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current)
      }
    }
  }, [amount, autoResolveDelay])

  // Auto-resolve user amount after delay
  useEffect(() => {
    if (userAmountTimeoutRef.current) {
      clearTimeout(userAmountTimeoutRef.current)
    }

    if (
      selectedUserId &&
      editingUserAmount &&
      /[+\-×÷]/.test(editingUserAmount) &&
      setRecipientAmount
    ) {
      userAmountTimeoutRef.current = setTimeout(() => {
        const resolved = evaluateExpression(editingUserAmount)
        if (resolved > 0) {
          const formatted =
            resolved % 1 === 0 ? String(resolved) : resolved.toFixed(2)
          setEditingUserAmount(formatted)
          setRecipientAmount(selectedUserId as Id<'users'>, resolved)
        }
      }, autoResolveDelay)
    }

    return () => {
      if (userAmountTimeoutRef.current) {
        clearTimeout(userAmountTimeoutRef.current)
      }
    }
  }, [editingUserAmount, selectedUserId, setRecipientAmount, autoResolveDelay])

  // Computed values
  const totalAmount = evaluateExpression(amount)
  const isValidAmount = totalAmount > 0

  // Get current keypad value based on selection
  const currentKeypadValue = selectedUserId ? editingUserAmount : amount

  // Handle keypad input - routes to total or selected user
  const handleKeypadChange = useCallback(
    (value: string) => {
      if (selectedUserId && setRecipientAmount) {
        setEditingUserAmount(value)
        // Immediately update if it's a simple number
        const parsed = evaluateExpression(value)
        if (parsed > 0 && !/[+\-×÷]/.test(value)) {
          setRecipientAmount(selectedUserId as Id<'users'>, parsed)
        }
      } else {
        setAmount(value)
      }
    },
    [selectedUserId, setRecipientAmount],
  )

  // Handle user selection in split view - syncs editing amount with split
  const handleSelectUser = useCallback(
    (
      userId: string | null,
      splits?: Array<{ userId: string; amount: number }>,
    ) => {
      // Update editingUserAmount synchronously to prevent flash of old value
      if (userId && splits) {
        const split = splits.find((s) => s.userId === userId)
        if (split) {
          setEditingUserAmount(
            split.amount % 1 === 0
              ? String(split.amount)
              : split.amount.toFixed(2),
          )
        }
      } else {
        setEditingUserAmount('')
      }
      setSelectedUserId(userId)
    },
    [],
  )

  // Sync editingUserAmount when selectedUserId changes
  const syncEditingAmountWithSplits = useCallback(
    (splits: Array<{ userId: string; amount: number }>) => {
      if (selectedUserId !== prevSelectedUserIdRef.current) {
        prevSelectedUserIdRef.current = selectedUserId
        if (selectedUserId) {
          const split = splits.find((s) => s.userId === selectedUserId)
          if (split) {
            setEditingUserAmount(
              split.amount % 1 === 0
                ? String(split.amount)
                : split.amount.toFixed(2),
            )
          }
        } else {
          setEditingUserAmount('')
        }
      }
    },
    [selectedUserId],
  )

  const reset = useCallback(() => {
    setAmount('')
    setSelectedUserId(null)
    setEditingUserAmount('')
    prevSelectedUserIdRef.current = null
  }, [])

  return {
    // State
    amount,
    selectedUserId,
    editingUserAmount,

    // Computed
    totalAmount,
    isValidAmount,
    currentKeypadValue,

    // Actions
    setAmount,
    setSelectedUserId,
    setEditingUserAmount,
    handleKeypadChange,
    handleSelectUser,
    syncEditingAmountWithSplits,
    reset,
  }
}
