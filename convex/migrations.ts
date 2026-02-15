import { mutation } from './_generated/server'

/**
 * One-time migration to clean up test data from the database.
 * Deletes:
 * - All payments with "pseudo-" transaction hashes (fake transactions)
 * - All users without a real Privy ID (starts with "did:privy:")
 *
 * Run via Convex dashboard or CLI: npx convex run migrations:cleanupTestData
 */
export const cleanupTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      paymentsDeleted: 0,
      usersDeleted: 0,
      requestsDeleted: 0,
    }

    // Delete all payments with pseudo- transaction hashes
    const allPayments = await ctx.db.query('payments').collect()
    for (const payment of allPayments) {
      if (payment.transactionHash.startsWith('pseudo-')) {
        await ctx.db.delete(payment._id)
        results.paymentsDeleted++
      }
    }

    // Find all users without real Privy IDs
    // Real Privy IDs start with "did:privy:"
    const allUsers = await ctx.db.query('users').collect()
    const usersToDelete: typeof allUsers = []

    for (const user of allUsers) {
      if (!user.privyId.startsWith('did:privy:')) {
        usersToDelete.push(user)
      }
    }

    // Delete requests associated with users to be deleted
    for (const user of usersToDelete) {
      // Delete requests where user is requester
      const requestsAsRequester = await ctx.db
        .query('requests')
        .withIndex('by_requester', (q) => q.eq('requesterId', user._id))
        .collect()
      for (const request of requestsAsRequester) {
        await ctx.db.delete(request._id)
        results.requestsDeleted++
      }

      // Delete requests where user is recipient
      const requestsAsRecipient = await ctx.db
        .query('requests')
        .withIndex('by_recipient', (q) => q.eq('recipientId', user._id))
        .collect()
      for (const request of requestsAsRecipient) {
        await ctx.db.delete(request._id)
        results.requestsDeleted++
      }
    }

    // Delete the users
    for (const user of usersToDelete) {
      await ctx.db.delete(user._id)
      results.usersDeleted++
    }

    return results
  },
})
