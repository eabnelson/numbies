import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { verifyResourceOwner } from './lib/auth'

// Get all requests for a user (both sent and received)
export const getByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Requests the user created (requesting money FROM others)
    const asRequester = await ctx.db
      .query('requests')
      .withIndex('by_requester', (q) => q.eq('requesterId', args.userId))
      .collect()

    // Requests where others are asking the user for money
    const asRecipient = await ctx.db
      .query('requests')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.userId))
      .collect()

    return { asRequester, asRecipient }
  },
})

// Get pending request count for a user
export const getPendingCount = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Count pending requests the user created
    const asRequester = await ctx.db
      .query('requests')
      .withIndex('by_requester', (q) => q.eq('requesterId', args.userId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()

    // Count pending requests where others are asking the user for money
    const asRecipient = await ctx.db
      .query('requests')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.userId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()

    return {
      total: asRequester.length + asRecipient.length,
      asRequester: asRequester.length,
      asRecipient: asRecipient.length,
    }
  },
})

// Create a new request
export const create = mutation({
  args: {
    privyId: v.string(),
    requesterId: v.id('users'),
    recipientId: v.id('users'),
    amount: v.string(),
    tokenId: v.id('tokens'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the caller owns the requester account
    await verifyResourceOwner(ctx, args.privyId, args.requesterId)

    const { privyId: _, ...requestData } = args
    return await ctx.db.insert('requests', {
      ...requestData,
      status: 'pending',
    })
  },
})

// Cancel a request (only requester can cancel)
export const cancel = mutation({
  args: {
    privyId: v.string(),
    requestId: v.id('requests'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // Verify the caller is the requester
    await verifyResourceOwner(ctx, args.privyId, request.requesterId)

    if (request.status !== 'pending') {
      throw new Error('Can only cancel pending requests')
    }

    await ctx.db.patch(args.requestId, { status: 'cancelled' })
    return { success: true }
  },
})

// Remove a request entirely (delete from database, only requester can remove)
export const remove = mutation({
  args: {
    privyId: v.string(),
    requestId: v.id('requests'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // Verify the caller is the requester
    await verifyResourceOwner(ctx, args.privyId, request.requesterId)

    await ctx.db.delete(args.requestId)
    return { success: true }
  },
})

// Reject a request (only recipient can reject)
export const reject = mutation({
  args: {
    privyId: v.string(),
    requestId: v.id('requests'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // Verify the caller is the recipient
    await verifyResourceOwner(ctx, args.privyId, request.recipientId)

    if (request.status !== 'pending') {
      throw new Error('Can only reject pending requests')
    }

    await ctx.db.patch(args.requestId, { status: 'rejected' })
    return { success: true }
  },
})

// Complete a request (mark as completed after payment, only recipient can complete)
export const complete = mutation({
  args: {
    privyId: v.string(),
    requestId: v.id('requests'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // Verify the caller is the recipient (the one who pays and completes the request)
    await verifyResourceOwner(ctx, args.privyId, request.recipientId)

    if (request.status !== 'pending') {
      throw new Error('Can only complete pending requests')
    }

    await ctx.db.patch(args.requestId, { status: 'completed' })
    return { success: true }
  },
})

// Dismiss a rejected request (requester acknowledges rejection)
export const dismiss = mutation({
  args: {
    privyId: v.string(),
    requestId: v.id('requests'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // Verify the caller is the requester
    await verifyResourceOwner(ctx, args.privyId, request.requesterId)

    if (request.status !== 'rejected') {
      throw new Error('Can only dismiss rejected requests')
    }

    await ctx.db.patch(args.requestId, { dismissedByRequester: true })
    return { success: true }
  },
})

// Get a single request with user details
export const getWithDetails = query({
  args: { requestId: v.id('requests') },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) return null

    const requester = await ctx.db.get(request.requesterId)
    const recipient = await ctx.db.get(request.recipientId)
    const token = request.tokenId ? await ctx.db.get(request.tokenId) : null

    return {
      ...request,
      requester,
      recipient,
      token,
    }
  },
})

// Get all requests for a user with user details
export const getByUserWithDetails = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Requests the user created (requesting money FROM others)
    const asRequester = await ctx.db
      .query('requests')
      .withIndex('by_requester', (q) => q.eq('requesterId', args.userId))
      .order('desc')
      .collect()

    // Requests where others are asking the user for money
    const asRecipient = await ctx.db
      .query('requests')
      .withIndex('by_recipient', (q) => q.eq('recipientId', args.userId))
      .order('desc')
      .collect()

    // Fetch user details for each request
    const withDetails = async (requests: typeof asRequester) => {
      return Promise.all(
        requests.map(async (request) => {
          const requester = await ctx.db.get(request.requesterId)
          const recipient = await ctx.db.get(request.recipientId)
          const token = request.tokenId
            ? await ctx.db.get(request.tokenId)
            : null
          return { ...request, requester, recipient, token }
        }),
      )
    }

    return {
      asRequester: await withDetails(asRequester),
      asRecipient: await withDetails(asRecipient),
    }
  },
})
