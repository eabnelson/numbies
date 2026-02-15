/**
 * Math Expression Evaluation Utility
 *
 * Safely evaluates math expressions entered via the MathKeypad.
 * Supports: + - × ÷ (display operators)
 */

/**
 * Evaluate a math expression safely (supports + - × ÷)
 *
 * @param expression - The expression string with display operators
 * @returns The evaluated result, or 0 if invalid
 *
 * @example
 * evaluateExpression("10+5") // 15
 * evaluateExpression("100÷4") // 25
 * evaluateExpression("2×3") // 6
 */
export function evaluateExpression(expression: string): number {
  if (!expression || expression === '-') return 0

  // Replace display operators with JS operators
  const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/')

  // Validate: only allow numbers, operators, and decimal points
  if (!/^[\d+\-*/.]+$/.test(normalized)) return 0

  // Handle edge cases
  if (/[+\-*/.]$/.test(normalized)) {
    // Expression ends with operator - evaluate without it
    const trimmed = normalized.slice(0, -1)
    if (!trimmed) return 0
    try {
      const result = Function(`"use strict"; return (${trimmed})`)()
      return typeof result === 'number' && Number.isFinite(result) ? result : 0
    } catch {
      return 0
    }
  }

  try {
    const result = Function(`"use strict"; return (${normalized})`)()
    return typeof result === 'number' && Number.isFinite(result) ? result : 0
  } catch {
    return 0
  }
}
