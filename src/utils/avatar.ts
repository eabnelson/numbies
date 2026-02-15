/**
 * Avatar URL generation utilities for the Numbies app.
 * Uses DiceBear API for generating consistent avatars.
 */

/**
 * Get avatar URL for a user.
 * Uses the "glass" style for user avatars.
 * Returns existing URL if available, otherwise generates one from the seed.
 */
export function getUserAvatarUrl(seed: string, existingUrl?: string): string {
  if (existingUrl) return existingUrl
  return `https://api.dicebear.com/9.x/glass/png?seed=${encodeURIComponent(seed)}`
}

/**
 * Get avatar URL for a contact (external Ethereum address).
 * Uses the "identicon" style for contact avatars to differentiate from users.
 */
export function getContactAvatarUrl(address: string): string {
  return `https://api.dicebear.com/9.x/identicon/png?seed=${address.toLowerCase()}`
}
