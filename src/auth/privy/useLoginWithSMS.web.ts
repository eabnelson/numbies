import { useLoginWithSms } from '@privy-io/react-auth'
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
  } = useLoginWithSms()

  const sendCode = useCallback(
    async (phoneNumber: string) => {
      await privySendCode({ phoneNumber })
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
        return { status: 'initial' }
    }
  }, [state])

  return {
    sendCode,
    loginWithCode,
    state: normalizedState,
  }
}
