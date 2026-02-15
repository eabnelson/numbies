import { useLoginWithSMS as usePrivyLoginWithSMS } from '@privy-io/expo'
import { useCallback, useMemo } from 'react'

export type OtpFlowState =
  | { status: 'initial' }
  | { status: 'error'; error: Error | null }
  | { status: 'sending-code' }
  | { status: 'awaiting-code-input' }
  | { status: 'submitting-code' }
  | { status: 'done' }

export function useLoginWithSMS() {
  const {
    sendCode: privySendCode,
    loginWithCode: privyLoginWithCode,
    state,
  } = usePrivyLoginWithSMS()

  const sendCode = useCallback(
    async (phoneNumber: string) => {
      await privySendCode({ phone: phoneNumber })
    },
    [privySendCode],
  )

  const loginWithCode = useCallback(
    async (code: string) => {
      await privyLoginWithCode({ code })
    },
    [privyLoginWithCode],
  )

  const normalizedState: OtpFlowState = useMemo(() => {
    // Handle case where state might be undefined or null
    if (!state || !state.status) {
      return { status: 'initial' }
    }
    switch (state.status) {
      case 'initial':
        return { status: 'initial' }
      case 'error':
        return { status: 'error', error: state.error }
      case 'sending-code':
        return { status: 'sending-code' }
      case 'awaiting-code-input':
        return { status: 'awaiting-code-input' }
      case 'submitting-code':
        return { status: 'submitting-code' }
      case 'done':
        return { status: 'done' }
      default:
        // For any unknown status, treat as initial so phone entry works
        return { status: 'initial' }
    }
  }, [state])

  return {
    sendCode,
    loginWithCode,
    state: normalizedState,
  }
}
