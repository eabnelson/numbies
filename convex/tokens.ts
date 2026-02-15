import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Tempo testnet chain ID
const TEMPO_TESTNET_CHAIN_ID = 42429

// AlphaUSD token address on Tempo
const ALPHA_USD_ADDRESS = '0x20c0000000000000000000000000000000000001'

// Get all tokens
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query('tokens').collect()
  },
})

// Get default token (AlphaUSD on Tempo testnet)
export const getDefault = query({
  handler: async (ctx) => {
    // First try to get AlphaUSD specifically
    const alphaUsd = await ctx.db
      .query('tokens')
      .withIndex('by_address_chainId', (q) =>
        q
          .eq('address', ALPHA_USD_ADDRESS)
          .eq('chainId', TEMPO_TESTNET_CHAIN_ID),
      )
      .first()

    if (alphaUsd) {
      return alphaUsd
    }

    // Fallback to first token if AlphaUSD not found
    return await ctx.db.query('tokens').first()
  },
})

// Get token by address and chain
export const getByAddressAndChain = query({
  args: { address: v.string(), chainId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('tokens')
      .withIndex('by_address_chainId', (q) =>
        q.eq('address', args.address).eq('chainId', args.chainId),
      )
      .first()
  },
})

// Create a new token
export const create = mutation({
  args: {
    symbol: v.string(),
    name: v.string(),
    address: v.string(),
    chainId: v.number(),
    decimals: v.number(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if token already exists
    const existing = await ctx.db
      .query('tokens')
      .withIndex('by_address_chainId', (q) =>
        q.eq('address', args.address).eq('chainId', args.chainId),
      )
      .first()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert('tokens', args)
  },
})
