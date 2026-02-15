// Base module - re-exports web implementation for TypeScript
// Native uses useLoginWithSMS.native.ts, web uses useLoginWithSMS.web.ts
export { type OtpFlowState, useLoginWithSMS } from './useLoginWithSMS.web'
