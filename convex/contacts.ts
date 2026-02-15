import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { verifyResourceOwner } from './lib/auth'
import { generateContactAvatar } from './utils'

// Ethereum address regex: 0x followed by 40 hex characters
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

// Note validation: 1-20 chars, only A-Z, a-z, 0-9, _, and spaces
const NOTE_REGEX = /^[A-Za-z0-9_ ]+$/
const NOTE_MIN_LENGTH = 1
const NOTE_MAX_LENGTH = 20

// Validate Ethereum address format
const isValidEthereumAddress = (address: string): boolean => {
  return ETHEREUM_ADDRESS_REGEX.test(address)
}

// Validate note format
const isValidNote = (note: string): { valid: boolean; error?: string } => {
  const trimmed = note.trim()

  if (trimmed.length < NOTE_MIN_LENGTH) {
    return { valid: false, error: 'Note cannot be empty' }
  }

  if (trimmed.length > NOTE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Note must be ${NOTE_MAX_LENGTH} characters or less`,
    }
  }

  if (!NOTE_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Note can only contain letters, numbers, underscores, and spaces',
    }
  }

  return { valid: true }
}

// Create a new contact
export const create = mutation({
  args: {
    privyId: v.string(),
    userId: v.id('users'),
    address: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify caller owns the userId
    await verifyResourceOwner(ctx, args.privyId, args.userId)

    // Validate Ethereum address format
    if (!isValidEthereumAddress(args.address)) {
      throw new Error('Invalid Ethereum address format')
    }

    // Validate note
    const noteValidation = isValidNote(args.note)
    if (!noteValidation.valid) {
      throw new Error(noteValidation.error)
    }

    // Normalize address to lowercase for consistent storage
    const normalizedAddress = args.address.toLowerCase()

    // Check if contact already exists for this user
    const existing = await ctx.db
      .query('contacts')
      .withIndex('by_userId_address', (q) =>
        q.eq('userId', args.userId).eq('address', normalizedAddress),
      )
      .first()

    if (existing) {
      throw new Error('Contact with this address already exists')
    }

    // Generate identicon avatar URL
    const avatarUrl = generateContactAvatar(normalizedAddress)

    // Create the contact
    const contactId = await ctx.db.insert('contacts', {
      userId: args.userId,
      address: normalizedAddress,
      note: args.note.trim(),
      avatarUrl,
    })

    return await ctx.db.get(contactId)
  },
})

// Update a contact (note only - address is immutable)
export const update = mutation({
  args: {
    privyId: v.string(),
    contactId: v.id('contacts'),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the contact
    const contact = await ctx.db.get(args.contactId)
    if (!contact) {
      throw new Error('Contact not found')
    }

    // Verify caller owns the contact
    await verifyResourceOwner(ctx, args.privyId, contact.userId)

    // Validate note
    const noteValidation = isValidNote(args.note)
    if (!noteValidation.valid) {
      throw new Error(noteValidation.error)
    }

    // Update the note
    await ctx.db.patch(args.contactId, {
      note: args.note.trim(),
    })

    return await ctx.db.get(args.contactId)
  },
})

// Remove a contact (only if no payment history exists)
export const remove = mutation({
  args: {
    privyId: v.string(),
    contactId: v.id('contacts'),
  },
  handler: async (ctx, args) => {
    // Get the contact
    const contact = await ctx.db.get(args.contactId)
    if (!contact) {
      throw new Error('Contact not found')
    }

    // Verify caller owns the contact
    await verifyResourceOwner(ctx, args.privyId, contact.userId)

    // Note: In the current schema, payments are between users (userId to userId),
    // not to external addresses. Since contacts represent external Ethereum addresses,
    // there won't be payment records in the current payments table.
    // When external address payments are added, this check should be updated.
    // For now, we allow deletion since no payments to external addresses exist.

    // Delete the contact
    await ctx.db.delete(args.contactId)

    return { success: true }
  },
})

// Get all contacts for a user
export const getByUserId = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query('contacts')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect()

    return contacts
  },
})

// Get a specific contact by user and address
export const getByAddress = query({
  args: {
    userId: v.id('users'),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize address to lowercase for lookup
    const normalizedAddress = args.address.toLowerCase()

    const contact = await ctx.db
      .query('contacts')
      .withIndex('by_userId_address', (q) =>
        q.eq('userId', args.userId).eq('address', normalizedAddress),
      )
      .first()

    return contact
  },
})

// Get a contact by ID
export const getById = query({
  args: {
    contactId: v.id('contacts'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId)
  },
})

// Search contacts by note (for integration with user search)
export const searchByNote = query({
  args: {
    userId: v.id('users'),
    prefix: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    const prefix = args.prefix.toLowerCase()

    // Early return for empty prefix
    if (!prefix) return []

    // Get all contacts for user and filter by note prefix
    const contacts = await ctx.db
      .query('contacts')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect()

    const filteredContacts = contacts
      .filter((contact) => contact.note.toLowerCase().startsWith(prefix))
      .slice(0, limit)

    return filteredContacts
  },
})
