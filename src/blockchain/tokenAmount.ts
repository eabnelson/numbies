/**
 * Token Amount Conversion Utilities
 *
 * This module handles conversions between:
 * - UI display amounts (strings like "10.50")
 * - Numeric amounts (numbers like 10.5)
 * - On-chain amounts (bigints like 10500000000000000000n for 18 decimals)
 *
 * Flow: UI Input -> evaluateExpression -> formatForTransfer -> parseUnits -> blockchain
 */

import { formatUnits, parseUnits } from 'viem'

// In test environment or when __DEV__ is not defined, default to false
const DEBUG =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV === 'development'

/**
 * Log amount conversion details when DEBUG is enabled
 */
function logConversion(
  step: string,
  input: unknown,
  output: unknown,
  decimals?: number,
) {
  if (DEBUG) {
    console.log(`[TokenAmount] ${step}:`, {
      input,
      inputType: typeof input,
      output,
      outputType: typeof output,
      ...(decimals !== undefined ? { decimals } : {}),
    })
  }
}

/**
 * Format a numeric amount for transfer (2 decimal places, no trailing zeros for whole numbers)
 *
 * @param amount - The numeric amount from the UI
 * @returns A string formatted for transfer (e.g., "10.50" or "10")
 *
 * @example
 * formatForTransfer(10.5) // "10.50"
 * formatForTransfer(10) // "10"
 * formatForTransfer(10.123) // "10.12" (truncated, not rounded!)
 */
export function formatForTransfer(amount: number): string {
  // Truncate to 2 decimal places (don't round to avoid sending more than intended)
  const truncated = Math.floor(amount * 100) / 100
  const result = truncated % 1 === 0 ? String(truncated) : truncated.toFixed(2)
  logConversion('formatForTransfer', amount, result)
  return result
}

/**
 * Parse a display amount string to on-chain token units (bigint)
 *
 * @param amount - The display amount (e.g., "10.50")
 * @param decimals - Token decimals (e.g., 18 for most ERC20/TIP20 tokens)
 * @returns The amount in token units as a bigint
 *
 * @example
 * parseDisplayAmount("10.50", 18) // 10500000000000000000n
 * parseDisplayAmount("1", 6) // 1000000n
 */
export function parseDisplayAmount(amount: string, decimals: number): bigint {
  const result = parseUnits(amount, decimals)
  logConversion('parseDisplayAmount', amount, result.toString(), decimals)
  return result
}

/**
 * Format on-chain token units to a display string
 *
 * @param amount - The amount in token units (bigint)
 * @param decimals - Token decimals
 * @param displayDecimals - Number of decimal places to show (default: 2)
 * @returns A formatted display string
 *
 * @example
 * formatTokenAmount(10500000000000000000n, 18) // "10.50"
 * formatTokenAmount(1000000n, 6) // "1.00"
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  displayDecimals = 2,
): string {
  const raw = formatUnits(amount, decimals)
  const num = Number.parseFloat(raw)
  const result = num.toFixed(displayDecimals)
  logConversion('formatTokenAmount', amount.toString(), result, decimals)
  return result
}

/**
 * Validate that an amount string is safe for transfer
 * - Must be a valid number
 * - Must be positive
 * - Must have at most 2 decimal places (for UI consistency)
 *
 * @param amount - The amount string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTransferAmount(amount: string): boolean {
  // Must match a valid number with at most 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    logConversion('isValidTransferAmount', amount, false)
    return false
  }

  const num = Number.parseFloat(amount)
  const isValid = Number.isFinite(num) && num > 0
  logConversion('isValidTransferAmount', amount, isValid)
  return isValid
}

/**
 * Log the full transfer preparation for debugging
 */
export function logTransferPreparation(params: {
  uiAmount: number
  formattedAmount: string
  tokenUnits: bigint
  decimals: number
  recipient: string
}) {
  if (DEBUG) {
    console.log('[TokenAmount] Transfer Preparation:', {
      step1_uiInput: params.uiAmount,
      step2_formatted: params.formattedAmount,
      step3_tokenUnits: params.tokenUnits.toString(),
      step4_tokenUnitsHex: `0x${params.tokenUnits.toString(16)}`,
      decimals: params.decimals,
      recipient: params.recipient,
      // Verify roundtrip
      roundtrip: formatUnits(params.tokenUnits, params.decimals),
    })
  }
}
