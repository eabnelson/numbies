import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../_generated/dataModel'
import {
  AuthError,
  getAuthenticatedUser,
  verifyAuthorizedUser,
  verifyResourceOwner,
} from './auth'

// Mock user data
const mockUser1 = {
  _id: 'user1_id' as Id<'users'>,
  _creationTime: Date.now(),
  privyId: 'did:privy:user1',
  username: 'alice',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
}

const mockUser2 = {
  _id: 'user2_id' as Id<'users'>,
  _creationTime: Date.now(),
  privyId: 'did:privy:user2',
  username: 'bob',
  walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
}

// Helper to create mock context that returns a specific user
function createMockCtxWithUser(user: typeof mockUser1 | null) {
  return {
    db: {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(user),
        }),
      }),
    },
  } as any
}

describe('AuthError', () => {
  it('should create an AuthError with the correct name', () => {
    const error = new AuthError('Test error')
    expect(error.name).toBe('AuthError')
    expect(error.message).toBe('Test error')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AuthError)
  })
})

describe('getAuthenticatedUser', () => {
  it('should throw AuthError when privyId is empty', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    await expect(getAuthenticatedUser(ctx, '')).rejects.toThrow(AuthError)
    await expect(getAuthenticatedUser(ctx, '')).rejects.toThrow(
      'Not authenticated: missing privyId',
    )
  })

  it('should throw AuthError when user is not found', async () => {
    const ctx = createMockCtxWithUser(null)

    await expect(
      getAuthenticatedUser(ctx, 'did:privy:unknown'),
    ).rejects.toThrow(AuthError)
    await expect(
      getAuthenticatedUser(ctx, 'did:privy:unknown'),
    ).rejects.toThrow('Not authenticated: user not found')
  })

  it('should return user when found', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    const result = await getAuthenticatedUser(ctx, mockUser1.privyId)
    expect(result).toEqual(mockUser1)
  })

  it('should query users table by privyId index', async () => {
    const mockQuery = vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(mockUser1),
      }),
    })

    const ctx = { db: { query: mockQuery } } as any

    await getAuthenticatedUser(ctx, mockUser1.privyId)

    expect(mockQuery).toHaveBeenCalledWith('users')
  })
})

describe('verifyResourceOwner', () => {
  it('should throw AuthError when privyId is empty', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    await expect(verifyResourceOwner(ctx, '', mockUser1._id)).rejects.toThrow(
      AuthError,
    )
    await expect(verifyResourceOwner(ctx, '', mockUser1._id)).rejects.toThrow(
      'Not authenticated: missing privyId',
    )
  })

  it('should throw AuthError when user is not found', async () => {
    const ctx = createMockCtxWithUser(null)

    await expect(
      verifyResourceOwner(ctx, 'did:privy:unknown', mockUser1._id),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyResourceOwner(ctx, 'did:privy:unknown', mockUser1._id),
    ).rejects.toThrow('Not authenticated: user not found')
  })

  it('should throw AuthError when user does not own resource', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    // User1 is authenticated but trying to access resource owned by user2
    await expect(
      verifyResourceOwner(ctx, mockUser1.privyId, mockUser2._id),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyResourceOwner(ctx, mockUser1.privyId, mockUser2._id),
    ).rejects.toThrow('Not authorized: you do not own this resource')
  })

  it('should return user when they own the resource', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    const result = await verifyResourceOwner(
      ctx,
      mockUser1.privyId,
      mockUser1._id,
    )
    expect(result).toEqual(mockUser1)
  })
})

describe('verifyAuthorizedUser', () => {
  it('should throw AuthError when privyId is empty', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    await expect(
      verifyAuthorizedUser(ctx, '', [mockUser1._id]),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyAuthorizedUser(ctx, '', [mockUser1._id]),
    ).rejects.toThrow('Not authenticated: missing privyId')
  })

  it('should throw AuthError when user is not found', async () => {
    const ctx = createMockCtxWithUser(null)

    await expect(
      verifyAuthorizedUser(ctx, 'did:privy:unknown', [mockUser1._id]),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyAuthorizedUser(ctx, 'did:privy:unknown', [mockUser1._id]),
    ).rejects.toThrow('Not authenticated: user not found')
  })

  it('should throw AuthError when user is not in allowed list', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    // User1 is authenticated but not in the allowed list (only user2 is allowed)
    await expect(
      verifyAuthorizedUser(ctx, mockUser1.privyId, [mockUser2._id]),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyAuthorizedUser(ctx, mockUser1.privyId, [mockUser2._id]),
    ).rejects.toThrow('Not authorized: you do not have access to this resource')
  })

  it('should throw AuthError when allowed list is empty', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    await expect(
      verifyAuthorizedUser(ctx, mockUser1.privyId, []),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyAuthorizedUser(ctx, mockUser1.privyId, []),
    ).rejects.toThrow('Not authorized: you do not have access to this resource')
  })

  it('should return user when they are in the allowed list', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    const result = await verifyAuthorizedUser(ctx, mockUser1.privyId, [
      mockUser1._id,
    ])
    expect(result).toEqual(mockUser1)
  })

  it('should return user when they are one of multiple allowed users', async () => {
    const ctx = createMockCtxWithUser(mockUser1)

    const result = await verifyAuthorizedUser(ctx, mockUser1.privyId, [
      mockUser2._id,
      mockUser1._id,
    ])
    expect(result).toEqual(mockUser1)
  })
})

// Integration-style tests that verify authorization patterns
describe('Authorization Patterns', () => {
  describe('Unauthenticated requests', () => {
    it('should reject when no privyId is provided', async () => {
      const ctx = createMockCtxWithUser(mockUser1)

      // Empty string privyId
      await expect(getAuthenticatedUser(ctx, '')).rejects.toThrow(
        'Not authenticated: missing privyId',
      )
    })

    it('should reject when user does not exist in database', async () => {
      const ctx = createMockCtxWithUser(null)

      await expect(
        getAuthenticatedUser(ctx, 'did:privy:nonexistent'),
      ).rejects.toThrow('Not authenticated: user not found')
    })
  })

  describe('Wrong-user requests', () => {
    it('should reject resource access for different user', async () => {
      // Simulate user1 trying to access user2's resource
      const ctx = createMockCtxWithUser(mockUser1)

      await expect(
        verifyResourceOwner(ctx, mockUser1.privyId, mockUser2._id),
      ).rejects.toThrow('Not authorized: you do not own this resource')
    })

    it('should reject when user not in allowed list', async () => {
      const ctx = createMockCtxWithUser(mockUser1)

      await expect(
        verifyAuthorizedUser(ctx, mockUser1.privyId, [mockUser2._id]),
      ).rejects.toThrow(
        'Not authorized: you do not have access to this resource',
      )
    })
  })

  describe('Correct-user requests', () => {
    it('should allow resource access for owner', async () => {
      const ctx = createMockCtxWithUser(mockUser1)

      const result = await verifyResourceOwner(
        ctx,
        mockUser1.privyId,
        mockUser1._id,
      )
      expect(result._id).toBe(mockUser1._id)
    })

    it('should allow access when user is in allowed list', async () => {
      const ctx = createMockCtxWithUser(mockUser1)

      const result = await verifyAuthorizedUser(ctx, mockUser1.privyId, [
        mockUser1._id,
        mockUser2._id,
      ])
      expect(result._id).toBe(mockUser1._id)
    })
  })
})
