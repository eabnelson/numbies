import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/**
 * Error thrown when a user is not authenticated or authorized.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Get the authenticated user from the database by their Privy ID.
 * Throws AuthError if the user is not found.
 *
 * @param ctx - The query or mutation context
 * @param privyId - The user's Privy ID (from client authentication)
 * @returns The user document from the database
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  privyId: string,
) {
  if (!privyId) {
    throw new AuthError('Not authenticated: missing privyId')
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_privyId', (q) => q.eq('privyId', privyId))
    .first()

  if (!user) {
    throw new AuthError('Not authenticated: user not found')
  }

  return user
}

/**
 * Verify that the authenticated user owns a specific resource.
 * Used to ensure users can only modify their own data.
 *
 * @param ctx - The query or mutation context
 * @param privyId - The user's Privy ID
 * @param resourceUserId - The user ID that owns the resource
 * @returns The authenticated user if they own the resource
 */
export async function verifyResourceOwner(
  ctx: QueryCtx | MutationCtx,
  privyId: string,
  resourceUserId: Id<'users'>,
) {
  const user = await getAuthenticatedUser(ctx, privyId)

  if (user._id !== resourceUserId) {
    throw new AuthError('Not authorized: you do not own this resource')
  }

  return user
}

/**
 * Verify that the authenticated user is one of the allowed users.
 * Used for resources that can be accessed by multiple parties.
 *
 * @param ctx - The query or mutation context
 * @param privyId - The user's Privy ID
 * @param allowedUserIds - Array of user IDs that are allowed to access the resource
 * @returns The authenticated user if they are in the allowed list
 */
export async function verifyAuthorizedUser(
  ctx: QueryCtx | MutationCtx,
  privyId: string,
  allowedUserIds: Id<'users'>[],
) {
  const user = await getAuthenticatedUser(ctx, privyId)

  if (!allowedUserIds.includes(user._id)) {
    throw new AuthError(
      'Not authorized: you do not have access to this resource',
    )
  }

  return user
}
