import { mutation } from './_generated/server'
import { generateUserAvatar } from './utils'

// Seed data - 50 test users with fun usernames
const testUsers = [
  'Alice123',
  'BobTheBuilder',
  'Charlie99',
  'DianaRocks',
  'EvanFlow',
  'FionaGreen',
  'GeorgeWave',
  'HannahStar',
  'IvanBolt',
  'JuliaSwift',
  'KevinNova',
  'LunaMoon',
  'MikeThunder',
  'NinaSpark',
  'OscarWild',
  'PennyLane',
  'QuinnFrost',
  'RachelSun',
  'SamCool',
  'TinaBlaze',
  'UmaLight',
  'VictorEdge',
  'WendyCloud',
  'XavierDark',
  'YaraWind',
  'ZackStorm',
  'AmberGlow',
  'BrianPeak',
  'CarlaRiver',
  'DanteFlame',
  'EllaBreeze',
  'FelixJump',
  'GinaSnow',
  'HectorRise',
  'IrisShine',
  'JackFlash',
  'KaraZen',
  'LeoRush',
  'MayaDream',
  'NickPulse',
  'OliviaRay',
  'PaulCrest',
  'QueenieGem',
  'RexBound',
  'SophiaDawn',
  'TomHawk',
  'UrsulaDeep',
  'VincentArc',
  'WillowMist',
  'Xtina',
]

// Seed the database with test users
export const seedTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0
    let skipped = 0

    for (const username of testUsers) {
      // Check if username already exists
      const existing = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', username))
        .first()

      if (existing) {
        skipped++
        continue
      }

      // Create test user
      await ctx.db.insert('users', {
        privyId: `test-${username.toLowerCase()}`,
        username,
        avatarUrl: generateUserAvatar(username),
      })

      created++
    }

    return { created, skipped, total: testUsers.length }
  },
})

// Tempo testnet chain ID
const TEMPO_TESTNET_CHAIN_ID = 42429

// AlphaUSD token address on Tempo
const ALPHA_USD_ADDRESS = '0x20c0000000000000000000000000000000000001'

// Seed default token (AlphaUSD on Tempo testnet)
export const seedDefaultToken = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if AlphaUSD already exists
    const existing = await ctx.db
      .query('tokens')
      .withIndex('by_address_chainId', (q) =>
        q
          .eq('address', ALPHA_USD_ADDRESS)
          .eq('chainId', TEMPO_TESTNET_CHAIN_ID),
      )
      .first()

    if (existing) {
      return { status: 'already_exists', tokenId: existing._id }
    }

    // Create AlphaUSD token
    const tokenId = await ctx.db.insert('tokens', {
      symbol: 'AUSD',
      name: 'AlphaUSD',
      address: ALPHA_USD_ADDRESS,
      chainId: TEMPO_TESTNET_CHAIN_ID,
      decimals: 18,
    })

    return { status: 'created', tokenId }
  },
})

// Clear all test users (users with privyId starting with "test-")
export const clearTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect()
    let deleted = 0

    for (const user of allUsers) {
      if (user.privyId.startsWith('test-')) {
        await ctx.db.delete(user._id)
        deleted++
      }
    }

    return { deleted }
  },
})
