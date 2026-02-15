/**
 * Shared formatting utilities for the Numbies app.
 */

/**
 * Truncate an Ethereum address to 0x1234...5678 format.
 */
export function truncateAddress(address: string): string {
  if (address.length <= 13) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format a numeric amount string for display.
 * Adds thousands separators and removes trailing .00 for whole numbers.
 */
export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === 0) return '0'
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  // Remove .00 if present
  return formatted.replace(/\.00$/, '')
}

/**
 * Format a timestamp as a relative time string.
 * Examples: "just now", "5 min ago", "2 hours ago", "1 day ago", "Jan 15"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return '1 day ago'

  // After 1 day, use MMM DD format
  const date = new Date(timestamp)
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

/**
 * Format a number string with thousands separators.
 * Handles decimal numbers correctly.
 */
export function formatWithCommas(numStr: string): string {
  if (!numStr) return numStr
  const [whole, decimal] = numStr.split('.')
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted
}

/**
 * Format a calculator expression with commas in each number segment.
 * Preserves operators (+, -, ×, ÷) while formatting numbers.
 */
export function formatExpression(expr: string): string {
  if (!expr) return '0'
  // Split by operators while keeping them
  const parts = expr.split(/([+\-×÷])/)
  return parts
    .map((part) => {
      // If it's an operator, return as-is
      if (['+', '-', '×', '÷'].includes(part)) return part
      // Otherwise format the number
      return formatWithCommas(part)
    })
    .join('')
}

/**
 * Calculate a responsive font size based on text length and available width.
 */
export function calculateResponsiveFontSize(
  text: string,
  screenWidth: number,
  options: {
    min: number
    max: number
    padding?: number
    charWidthRatio?: number
  },
): number {
  const { min, max, padding = 32, charWidthRatio = 0.6 } = options
  const charCount = text.length
  const availableWidth = screenWidth - padding
  const maxFontSize = availableWidth / (charCount * charWidthRatio)
  return Math.min(max, Math.max(min, maxFontSize))
}

/**
 * Parse a balance string like "1,000.90" to a number.
 */
export function parseBalance(balance: string): number {
  return Number.parseFloat(balance.replace(/,/g, ''))
}

/**
 * Abbreviate large balances: 1K, 1.1K, 100K, 1M, etc.
 */
export function abbreviateBalance(balance: string): string {
  const num = parseBalance(balance)
  if (num < 1000) return balance

  if (num >= 1_000_000_000) {
    const b = num / 1_000_000_000
    return b % 1 === 0 ? `${b}B` : `${b.toFixed(1).replace(/\.0$/, '')}B`
  }
  if (num >= 1_000_000) {
    const m = num / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`
  }
  const k = num / 1000
  return k % 1 === 0 ? `${k}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`
}
