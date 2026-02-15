import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    privyId: v.string(),
    username: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
  })
    .index('by_privyId', ['privyId'])
    .index('by_username', ['username'])
    .index('by_walletAddress', ['walletAddress']),

  tokens: defineTable({
    symbol: v.string(),
    name: v.string(),
    address: v.string(),
    chainId: v.number(),
    decimals: v.number(),
    logoUrl: v.optional(v.string()),
  }).index('by_address_chainId', ['address', 'chainId']),

  payments: defineTable({
    senderId: v.id('users'),
    recipientId: v.optional(v.id('users')),
    contactId: v.optional(v.id('contacts')),
    tokenId: v.id('tokens'),
    amount: v.string(),
    transactionHash: v.string(),
    note: v.optional(v.string()),
  })
    .index('by_sender', ['senderId'])
    .index('by_recipient', ['recipientId'])
    .index('by_contact', ['contactId'])
    .index('by_transactionHash', ['transactionHash'])
    .index('by_sender_recipient', ['senderId', 'recipientId']),

  requests: defineTable({
    requesterId: v.id('users'),
    recipientId: v.id('users'),
    amount: v.string(),
    tokenId: v.id('tokens'),
    note: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('rejected'),
      v.literal('cancelled'),
    ),
    dismissedByRequester: v.optional(v.boolean()),
  })
    .index('by_requester', ['requesterId'])
    .index('by_recipient', ['recipientId'])
    .index('by_status', ['status']),

  contacts: defineTable({
    userId: v.id('users'),
    address: v.string(),
    note: v.string(),
    avatarUrl: v.string(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_address', ['userId', 'address']),
})
