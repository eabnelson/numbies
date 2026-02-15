import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { generateUserAvatar, getUserAvatarUrl } from './utils'

// Word lists for fun username generation
const adjectives = [
  'Happy',
  'Cosmic',
  'Mighty',
  'Swift',
  'Clever',
  'Brave',
  'Calm',
  'Daring',
  'Epic',
  'Fierce',
  'Golden',
  'Hidden',
  'Jolly',
  'Lucky',
  'Mystic',
  'Noble',
  'Quick',
  'Rapid',
  'Silent',
  'Turbo',
  'Ultra',
  'Vivid',
  'Wild',
  'Zen',
  'Atomic',
  'Blazing',
  'Crystal',
  'Digital',
  'Electric',
  'Frozen',
  'Galactic',
  'Hyper',
  'Infinite',
  'Jade',
  'Kinetic',
  'Lunar',
  'Mega',
  'Neon',
  'Omega',
  'Pixel',
  'Quantum',
  'Radiant',
  'Solar',
  'Thunder',
  'Velvet',
  'Warp',
  'Zero',
  'Chill',
  'Funky',
  'Groovy',
  'Snappy',
  'Spicy',
  'Zesty',
  'Crispy',
  'Fluffy',
]

const nouns = [
  'Panda',
  'Tiger',
  'Eagle',
  'Wolf',
  'Bear',
  'Fox',
  'Hawk',
  'Lion',
  'Shark',
  'Dragon',
  'Phoenix',
  'Falcon',
  'Raven',
  'Cobra',
  'Panther',
  'Otter',
  'Mango',
  'Peach',
  'Lemon',
  'Berry',
  'Melon',
  'Apple',
  'Cherry',
  'Coconut',
  'Comet',
  'Nova',
  'Star',
  'Moon',
  'Orbit',
  'Nebula',
  'Pulsar',
  'Quasar',
  'Ninja',
  'Pirate',
  'Wizard',
  'Knight',
  'Samurai',
  'Viking',
  'Ranger',
  'Scout',
  'Pixel',
  'Byte',
  'Chip',
  'Node',
  'Spark',
  'Bolt',
  'Wave',
  'Flux',
  'Taco',
  'Waffle',
  'Pretzel',
  'Noodle',
  'Pickle',
  'Dumpling',
  'Mochi',
  'Donut',
]

// Generate a fun username like "CosmicPanda42"
const generateRandomUsername = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 999) + 1
  return `${adjective}${noun}${number}`
}

// Get user by privyId
export const getByPrivyId = query({
  args: { privyId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_privyId', (q) => q.eq('privyId', args.privyId))
      .first()

    if (!user) {
      return { exists: false, user: null }
    }
    return { exists: true, user }
  },
})

// Check username availability
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()
    return { available: !existing }
  },
})

// Get user by username
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()

    if (!user) {
      return null
    }

    return {
      _id: user._id,
      username: user.username ?? '',
      avatarUrl: getUserAvatarUrl(user._id, user.avatarUrl),
    }
  },
})

// Search users by username prefix
export const searchUsers = query({
  args: {
    prefix: v.string(),
    limit: v.optional(v.number()),
    excludeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    const prefix = args.prefix.toLowerCase()

    // Early return for empty prefix
    if (!prefix) return []

    // Get all users and filter in JS (Convex filter has issues with undefined)
    const allUsers = await ctx.db.query('users').collect()

    // Filter by prefix
    const filteredUsers = allUsers
      .filter((user) => {
        // Skip if no username
        if (!user.username) return false
        // Skip excluded user (current user)
        if (args.excludeUserId && user._id === args.excludeUserId) return false
        // Check prefix match (case-insensitive)
        return user.username.toLowerCase().startsWith(prefix)
      })
      .slice(0, limit)

    // Get payment counts for each user (from current user to search result)
    const excludeUserId = args.excludeUserId
    const results = await Promise.all(
      filteredUsers.map(async (user) => {
        let paymentCount = 0
        if (excludeUserId) {
          const payments = await ctx.db
            .query('payments')
            .withIndex('by_sender_recipient', (q) =>
              q.eq('senderId', excludeUserId).eq('recipientId', user._id),
            )
            .collect()
          paymentCount = payments.length
        }
        return {
          _id: user._id,
          username: user.username ?? '',
          avatarUrl: getUserAvatarUrl(user._id, user.avatarUrl),
          paymentCount,
        }
      }),
    )

    return results
  },
})

// Search users and contacts by prefix - returns combined results with type discriminator
export const searchUsersAndContacts = query({
  args: {
    prefix: v.string(),
    limit: v.optional(v.number()),
    excludeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    const prefix = args.prefix.toLowerCase()
    const excludeUserId = args.excludeUserId

    // Early return for empty prefix
    if (!prefix) return []

    // Search users by username prefix
    const allUsers = await ctx.db.query('users').collect()
    const filteredUsers = allUsers
      .filter((user) => {
        if (!user.username) return false
        if (excludeUserId && user._id === excludeUserId) return false
        return user.username.toLowerCase().startsWith(prefix)
      })
      .slice(0, limit)

    // Get payment counts and format user results
    const userResults = await Promise.all(
      filteredUsers.map(async (user) => {
        let paymentCount = 0
        if (excludeUserId) {
          const payments = await ctx.db
            .query('payments')
            .withIndex('by_sender_recipient', (q) =>
              q.eq('senderId', excludeUserId).eq('recipientId', user._id),
            )
            .collect()
          paymentCount = payments.length
        }
        return {
          type: 'user' as const,
          _id: user._id,
          username: user.username ?? '',
          avatarUrl: getUserAvatarUrl(user._id, user.avatarUrl),
          paymentCount,
        }
      }),
    )

    // Search contacts by note prefix (only if user is logged in)
    let contactResults: {
      type: 'contact'
      _id: string
      note: string
      address: string
      avatarUrl: string
    }[] = []

    if (excludeUserId) {
      const contacts = await ctx.db
        .query('contacts')
        .withIndex('by_userId', (q) => q.eq('userId', excludeUserId))
        .collect()

      contactResults = contacts
        .filter((contact) => contact.note.toLowerCase().startsWith(prefix))
        .slice(0, limit)
        .map((contact) => ({
          type: 'contact' as const,
          _id: contact._id,
          note: contact.note,
          address: contact.address,
          avatarUrl: contact.avatarUrl,
        }))
    }

    // Combine and limit results - users first, then contacts
    const combined = [...userResults, ...contactResults].slice(0, limit)

    return combined
  },
})

// Create or find user (POST equivalent)
export const createOrFindUser = mutation({
  args: {
    privyId: v.string(),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_privyId', (q) => q.eq('privyId', args.privyId))
      .first()

    if (existing) {
      // Update phone/email/walletAddress if provided and different from existing
      const updates: {
        phoneNumber?: string
        email?: string
        walletAddress?: string
      } = {}
      if (args.phoneNumber && args.phoneNumber !== existing.phoneNumber) {
        updates.phoneNumber = args.phoneNumber
      }
      if (args.email && args.email !== existing.email) {
        updates.email = args.email
      }
      if (args.walletAddress && args.walletAddress !== existing.walletAddress) {
        updates.walletAddress = args.walletAddress
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates)
        const updatedUser = await ctx.db.get(existing._id)
        return { isNew: false, user: updatedUser }
      }

      return { isNew: false, user: existing }
    }

    // Create new user
    const userId = await ctx.db.insert('users', {
      privyId: args.privyId,
      phoneNumber: args.phoneNumber,
      email: args.email,
      displayName: args.displayName,
      walletAddress: args.walletAddress,
    })

    // Generate and set avatar based on user ID
    const avatarUrl = generateUserAvatar(userId)
    await ctx.db.patch(userId, { avatarUrl })

    const newUser = await ctx.db.get(userId)
    return { isNew: true, user: newUser }
  },
})

// Update user (PUT equivalent)
export const updateUser = mutation({
  args: {
    privyId: v.string(),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    generateUsername: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_privyId', (q) => q.eq('privyId', args.privyId))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    let finalUsername = args.username

    // Generate username if requested
    if (args.generateUsername) {
      for (let i = 0; i < 5; i++) {
        const candidate = generateRandomUsername()
        const existing = await ctx.db
          .query('users')
          .withIndex('by_username', (q) => q.eq('username', candidate))
          .first()
        if (!existing) {
          finalUsername = candidate
          break
        }
      }
    }

    // Validate username uniqueness if setting one
    if (finalUsername && finalUsername !== user.username) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', finalUsername))
        .first()
      if (existing) {
        throw new Error('Username already taken')
      }
    }

    // Build update object
    const updateData: {
      username?: string
      displayName?: string
      avatarUrl?: string
    } = {}
    if (finalUsername !== undefined) updateData.username = finalUsername
    if (args.displayName !== undefined)
      updateData.displayName = args.displayName
    if (args.avatarUrl !== undefined) updateData.avatarUrl = args.avatarUrl

    await ctx.db.patch(user._id, updateData)
    return await ctx.db.get(user._id)
  },
})

// Delete user (DELETE equivalent)
export const deleteUser = mutation({
  args: { privyId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_privyId', (q) => q.eq('privyId', args.privyId))
      .first()

    if (user) {
      await ctx.db.delete(user._id)
    }
    return { success: true }
  },
})

// Generate upload URL for avatar image
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

// Update user's avatar with uploaded image
export const updateAvatar = mutation({
  args: {
    privyId: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_privyId', (q) => q.eq('privyId', args.privyId))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    const avatarUrl = await ctx.storage.getUrl(args.storageId)
    if (!avatarUrl) {
      throw new Error('Failed to get storage URL')
    }

    await ctx.db.patch(user._id, { avatarUrl })
    return avatarUrl
  },
})

// Update wallet address for an existing user
export const updateWalletAddress = mutation({
  args: {
    privyId: v.string(),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_privyId', (q) => q.eq('privyId', args.privyId))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    await ctx.db.patch(user._id, { walletAddress: args.walletAddress })
    return await ctx.db.get(user._id)
  },
})

// Get user by wallet address (for reverse lookups)
export const getByWalletAddress = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_walletAddress', (q) =>
        q.eq('walletAddress', args.walletAddress),
      )
      .first()

    if (!user) {
      return null
    }

    return {
      _id: user._id,
      username: user.username,
      avatarUrl: getUserAvatarUrl(user._id, user.avatarUrl),
      walletAddress: user.walletAddress,
    }
  },
})

// Get wallet address by userId, username, or contactId
// Used to resolve recipient addresses before on-chain transfers
export const getWalletAddress = query({
  args: {
    userId: v.optional(v.id('users')),
    username: v.optional(v.string()),
    contactId: v.optional(v.id('contacts')),
  },
  handler: async (ctx, args) => {
    // Must provide exactly one of the lookup methods
    const providedArgs = [args.userId, args.username, args.contactId].filter(
      Boolean,
    )
    if (providedArgs.length !== 1) {
      throw new Error(
        'Must provide exactly one of: userId, username, or contactId',
      )
    }

    // Lookup by contactId - contacts already have address stored
    if (args.contactId) {
      const contact = await ctx.db.get(args.contactId)
      if (!contact) {
        throw new Error('Contact not found')
      }
      return { walletAddress: contact.address }
    }

    // Lookup by userId
    if (args.userId) {
      const user = await ctx.db.get(args.userId)
      if (!user) {
        throw new Error('User not found')
      }
      if (!user.walletAddress) {
        throw new Error("Could not find recipient's wallet address")
      }
      return { walletAddress: user.walletAddress }
    }

    // Lookup by username
    if (args.username) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', args.username))
        .first()
      if (!user) {
        throw new Error('User not found')
      }
      if (!user.walletAddress) {
        throw new Error("Could not find recipient's wallet address")
      }
      return { walletAddress: user.walletAddress }
    }

    // This should never be reached due to the check above
    throw new Error('Invalid arguments')
  },
})
