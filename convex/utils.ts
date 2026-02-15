/**
 * Shared utility functions for Convex backend.
 */

/**
 * Generate a DiceBear "glass" style avatar URL for users.
 */
export function generateUserAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/glass/png?seed=${encodeURIComponent(seed)}`
}

/**
 * Generate a DiceBear "identicon" style avatar URL for contacts.
 */
export function generateContactAvatar(address: string): string {
  return `https://api.dicebear.com/9.x/identicon/png?seed=${address.toLowerCase()}`
}

/**
 * Get user avatar URL, falling back to generated avatar if none stored.
 */
export function getUserAvatarUrl(userId: string, existingUrl?: string): string {
  if (existingUrl) return existingUrl
  return generateUserAvatar(userId)
}
