import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { verifyResourceOwner } from './lib/auth'

// Get payments by user (both sent and received)
export const getByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query('payments')
      .withIndex('by_sender', (q) => q.eq('senderId', args.userId))
      .collect()

    const received = await ctx.db
      .query('payments')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.userId))
      .collect()

    return { sent, received }
  },
})

// Get payments by user with user details
export const getByUserWithDetails = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query('payments')
      .withIndex('by_sender', (q) => q.eq('senderId', args.userId))
      .order('desc')
      .collect()

    const received = await ctx.db
      .query('payments')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.userId))
      .order('desc')
      .collect()

    // Fetch user details for each payment
    const withDetails = async (payments: typeof sent) => {
      return Promise.all(
        payments.map(async (payment) => {
          const sender = await ctx.db.get(payment.senderId)
          const recipient = payment.recipientId
            ? await ctx.db.get(payment.recipientId)
            : null
          const contact = payment.contactId
            ? await ctx.db.get(payment.contactId)
            : null
          const token = payment.tokenId
            ? await ctx.db.get(payment.tokenId)
            : null
          return { ...payment, sender, recipient, contact, token }
        }),
      )
    }

    return {
      sent: await withDetails(sent),
      received: await withDetails(received),
    }
  },
})

// Create a new payment record
export const create = mutation({
  args: {
    privyId: v.string(),
    senderId: v.id('users'),
    recipientId: v.optional(v.id('users')),
    contactId: v.optional(v.id('contacts')),
    tokenId: v.id('tokens'),
    amount: v.string(),
    transactionHash: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the caller owns the sender account
    await verifyResourceOwner(ctx, args.privyId, args.senderId)

    // Validate transaction hash format (must be a valid hex hash starting with 0x)
    if (
      !args.transactionHash.startsWith('0x') ||
      args.transactionHash.length !== 66
    ) {
      throw new Error(
        'Invalid transaction hash: must be a 66-character hex string starting with 0x',
      )
    }

    // Extract privyId from args (not stored in DB)
    const { privyId: _, ...paymentData } = args

    // Check for duplicate transaction hash
    const existing = await ctx.db
      .query('payments')
      .withIndex('by_transactionHash', (q) =>
        q.eq('transactionHash', args.transactionHash),
      )
      .first()

    if (existing) {
      throw new Error('Payment with this transaction hash already exists')
    }

    return await ctx.db.insert('payments', paymentData)
  },
})
