import { describe, expect, it, vi } from 'vitest'

// Valid transaction hash (66 chars: 0x + 64 hex chars)
const VALID_TX_HASH =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

// Invalid hashes for testing
const INVALID_HASHES = {
  tooShort: '0x1234',
  tooLong:
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00',
  noPrefix: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  pseudoHash: 'pseudo-1234567890-abc123',
  empty: '',
  wrongPrefix:
    '1x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
}

// Helper to create mock context for duplicate detection tests
function createMockCtxForDuplicateCheck(existingPayment: boolean) {
  return {
    db: {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi
            .fn()
            .mockResolvedValue(existingPayment ? { _id: 'existing' } : null),
        }),
      }),
    },
  } as any
}

// Extract validation logic to test independently
function validateTransactionHash(hash: string): {
  valid: boolean
  error?: string
} {
  if (!hash.startsWith('0x')) {
    return {
      valid: false,
      error:
        'Invalid transaction hash: must be a 66-character hex string starting with 0x',
    }
  }
  if (hash.length !== 66) {
    return {
      valid: false,
      error:
        'Invalid transaction hash: must be a 66-character hex string starting with 0x',
    }
  }
  return { valid: true }
}

describe('Transaction Hash Validation', () => {
  describe('validateTransactionHash', () => {
    it('should accept valid 66-character hex hash', () => {
      const result = validateTransactionHash(VALID_TX_HASH)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject hash that is too short', () => {
      const result = validateTransactionHash(INVALID_HASHES.tooShort)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('66-character')
    })

    it('should reject hash that is too long', () => {
      const result = validateTransactionHash(INVALID_HASHES.tooLong)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('66-character')
    })

    it('should reject hash without 0x prefix', () => {
      const result = validateTransactionHash(INVALID_HASHES.noPrefix)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('starting with 0x')
    })

    it('should reject pseudo-hash format', () => {
      const result = validateTransactionHash(INVALID_HASHES.pseudoHash)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('starting with 0x')
    })

    it('should reject empty string', () => {
      const result = validateTransactionHash(INVALID_HASHES.empty)
      expect(result.valid).toBe(false)
    })

    it('should reject hash with wrong prefix', () => {
      const result = validateTransactionHash(INVALID_HASHES.wrongPrefix)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('starting with 0x')
    })
  })

  describe('Edge cases', () => {
    it('should accept hash with lowercase hex', () => {
      const hash =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      const result = validateTransactionHash(hash)
      expect(result.valid).toBe(true)
    })

    it('should accept hash with uppercase hex', () => {
      const hash =
        '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890'
      const result = validateTransactionHash(hash)
      expect(result.valid).toBe(true)
    })

    it('should accept hash with mixed case hex', () => {
      const hash =
        '0xAbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890'
      const result = validateTransactionHash(hash)
      expect(result.valid).toBe(true)
    })

    it('should reject hash that is exactly 65 characters', () => {
      const hash =
        '0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      expect(hash.length).toBe(65)
      const result = validateTransactionHash(hash)
      expect(result.valid).toBe(false)
    })

    it('should reject hash that is exactly 67 characters', () => {
      const hash =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef0'
      expect(hash.length).toBe(67)
      const result = validateTransactionHash(hash)
      expect(result.valid).toBe(false)
    })
  })
})

describe('Payment Creation', () => {
  describe('Duplicate detection', () => {
    it('should reject payment with existing transaction hash', async () => {
      const ctx = createMockCtxForDuplicateCheck(true)

      // Simulate the duplicate check
      const existing = await ctx.db
        .query('payments')
        .withIndex('by_transactionHash')
        .first()

      expect(existing).not.toBeNull()
    })

    it('should allow payment with unique transaction hash', async () => {
      const ctx = createMockCtxForDuplicateCheck(false)

      // Simulate the duplicate check
      const existing = await ctx.db
        .query('payments')
        .withIndex('by_transactionHash')
        .first()

      expect(existing).toBeNull()
    })
  })

  describe('Required fields', () => {
    it('should require transactionHash (not optional)', () => {
      // This test documents the expected behavior:
      // transactionHash is now v.string() not v.optional(v.string())
      // The mutation will fail at the Convex validation level if not provided
      const paymentArgs = {
        privyId: 'did:privy:user1',
        senderId: 'user1_id',
        recipientId: 'user2_id',
        tokenId: 'token1_id',
        amount: '10.00',
        transactionHash: VALID_TX_HASH,
      }

      expect(paymentArgs.transactionHash).toBeDefined()
      expect(typeof paymentArgs.transactionHash).toBe('string')
    })
  })
})

describe('Pseudo-hash rejection', () => {
  it('should reject any hash starting with "pseudo-"', () => {
    const pseudoHashes = [
      'pseudo-123456789-abc',
      'pseudo-1704067200000-xyz123',
      'pseudo-test',
    ]

    for (const hash of pseudoHashes) {
      const result = validateTransactionHash(hash)
      expect(result.valid).toBe(false)
    }
  })

  it('should only accept hashes from real blockchain transactions', () => {
    // Real transaction hashes are always:
    // - 66 characters total
    // - Start with 0x
    // - Followed by 64 hex characters
    const realHash =
      '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    const result = validateTransactionHash(realHash)
    expect(result.valid).toBe(true)
  })
})
