import { useCallback, useState } from 'react'

export type DrawerState = {
  success: boolean
  successAmount: string
  pendingConfirm: boolean
  loading: boolean
  transactionError: string | null
}

type UseDrawerStateOptions = {
  onClose?: () => void
}

export function useDrawerState(options: UseDrawerStateOptions = {}) {
  const [success, setSuccess] = useState(false)
  const [successAmount, setSuccessAmount] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transactionError, setTransactionError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setSuccess(false)
    setSuccessAmount('')
    setPendingConfirm(false)
    setLoading(false)
    setTransactionError(null)
  }, [])

  const showSuccess = useCallback(
    (amount: string, autoCloseMs = 2000) => {
      setSuccessAmount(amount)
      setSuccess(true)
      setLoading(false)

      if (autoCloseMs > 0) {
        setTimeout(() => {
          options.onClose?.()
          reset()
        }, autoCloseMs)
      }
    },
    [options.onClose, reset],
  )

  const showError = useCallback((message: string, clearAfterMs = 3000) => {
    setTransactionError(message)
    setPendingConfirm(false)
    setLoading(false)

    if (clearAfterMs > 0) {
      setTimeout(() => {
        setTransactionError(null)
      }, clearAfterMs)
    }
  }, [])

  const startConfirm = useCallback(() => {
    setPendingConfirm(true)
  }, [])

  const startLoading = useCallback(() => {
    setLoading(true)
    setTransactionError(null)
  }, [])

  // Parse transaction error to user-friendly message
  const parseTransactionError = useCallback((error: Error): string => {
    const msg = error.message.toLowerCase()

    // User cancelled/rejected the transaction - don't show as failure
    if (
      msg.includes('rejected') ||
      msg.includes('cancelled') ||
      msg.includes('user denied') ||
      msg.includes('user rejected')
    ) {
      return 'Cancelled'
    }

    // All other errors just show "Failed"
    return 'Failed'
  }, [])

  return {
    // State
    success,
    successAmount,
    pendingConfirm,
    loading,
    transactionError,

    // Actions
    reset,
    showSuccess,
    showError,
    startConfirm,
    startLoading,
    parseTransactionError,

    // Setters for direct control
    setPendingConfirm,
    setLoading,
    setTransactionError,
  }
}
