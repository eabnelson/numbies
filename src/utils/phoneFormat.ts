import type { Country } from '../data/countries'

/**
 * Formats a phone number for display based on country.
 * US/CA: 555-123-4567
 * Others: grouped by 3s (123 456 789)
 */
export function formatPhoneForDisplay(
  digits: string,
  country: Country,
): string {
  // Remove any non-digit characters
  const cleaned = digits.replace(/\D/g, '')

  if (country.iso === 'US' || country.iso === 'CA') {
    // US/CA format: XXX-XXX-XXXX
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  // Other countries: group by 3s
  if (cleaned.length === 0) return ''
  const groups: string[] = []
  for (let i = 0; i < cleaned.length; i += 3) {
    groups.push(cleaned.slice(i, i + 3))
  }
  return groups.join(' ')
}

/**
 * Returns the maximum number of digits allowed for a phone number in a country.
 */
export function getMaxDigits(country: Country): number {
  if (country.iso === 'US' || country.iso === 'CA') {
    return 10
  }
  // Most international numbers are 9-12 digits
  return 12
}

/**
 * Validates if a phone number has enough digits to be valid.
 */
export function isValidPhoneNumber(digits: string, country: Country): boolean {
  const cleaned = digits.replace(/\D/g, '')
  if (country.iso === 'US' || country.iso === 'CA') {
    return cleaned.length === 10
  }
  // Most international numbers need at least 7 digits
  return cleaned.length >= 7
}

/**
 * Converts a phone number to E.164 format (e.g., +15551234567).
 * This is the format required by Privy.
 */
export function toE164(digits: string, country: Country): string {
  const cleaned = digits.replace(/\D/g, '')
  return `${country.code}${cleaned}`
}

/**
 * Extracts just the digits from a formatted phone string.
 */
export function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

/**
 * Strips the country code from a phone number if it appears to already include it.
 * This handles auto-fill scenarios where the phone number comes with the country code.
 *
 * For US/CA (+1): If digits start with '1' and length > 10, strip the leading '1'
 * For other countries: If digits start with the country code digits and exceed max length, strip it
 */
export function stripCountryCodeIfPresent(
  digits: string,
  country: Country,
): string {
  const cleaned = digits.replace(/\D/g, '')
  const codeDigits = country.code.replace(/\D/g, '') // e.g., '+1' -> '1', '+44' -> '44'
  const maxDigits = getMaxDigits(country)

  // Check if the number starts with the country code digits
  if (cleaned.startsWith(codeDigits)) {
    const withoutCode = cleaned.slice(codeDigits.length)
    // Only strip if the result looks like a valid local number
    // (removing the code brings us closer to or at the expected length)
    if (cleaned.length > maxDigits && withoutCode.length <= maxDigits) {
      return withoutCode
    }
  }

  return cleaned
}
