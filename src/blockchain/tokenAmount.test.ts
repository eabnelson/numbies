import { describe, expect, it } from 'vitest'
import {
  formatForTransfer,
  formatTokenAmount,
  isValidTransferAmount,
  parseDisplayAmount,
} from './tokenAmount'

describe('tokenAmount utilities', () => {
  describe('formatForTransfer', () => {
    it('formats whole numbers without decimals', () => {
      expect(formatForTransfer(10)).toBe('10')
      expect(formatForTransfer(100)).toBe('100')
      expect(formatForTransfer(1)).toBe('1')
    })

    it('formats amounts with 2 decimal places', () => {
      expect(formatForTransfer(10.5)).toBe('10.50')
      expect(formatForTransfer(10.05)).toBe('10.05')
      expect(formatForTransfer(0.99)).toBe('0.99')
    })

    it('truncates (not rounds) amounts with more than 2 decimals', () => {
      // Important: we truncate to avoid sending more than intended
      expect(formatForTransfer(10.999)).toBe('10.99')
      expect(formatForTransfer(10.123)).toBe('10.12')
      expect(formatForTransfer(10.129)).toBe('10.12')
      // When truncation results in a whole number, no decimal part is shown
      expect(formatForTransfer(10.001)).toBe('10')
    })

    it('handles very small amounts', () => {
      expect(formatForTransfer(0.01)).toBe('0.01')
      expect(formatForTransfer(0.001)).toBe('0')
    })

    it('handles zero', () => {
      expect(formatForTransfer(0)).toBe('0')
    })
  })

  describe('parseDisplayAmount', () => {
    const decimals18 = 18

    it('parses whole number amounts', () => {
      expect(parseDisplayAmount('1', decimals18)).toBe(
        BigInt('1000000000000000000'),
      )
      expect(parseDisplayAmount('10', decimals18)).toBe(
        BigInt('10000000000000000000'),
      )
      expect(parseDisplayAmount('100', decimals18)).toBe(
        BigInt('100000000000000000000'),
      )
    })

    it('parses decimal amounts', () => {
      expect(parseDisplayAmount('1.5', decimals18)).toBe(
        BigInt('1500000000000000000'),
      )
      expect(parseDisplayAmount('10.50', decimals18)).toBe(
        BigInt('10500000000000000000'),
      )
      expect(parseDisplayAmount('0.01', decimals18)).toBe(
        BigInt('10000000000000000'),
      )
    })

    it('works with 6 decimal tokens (like USDC)', () => {
      const decimals6 = 6
      expect(parseDisplayAmount('1', decimals6)).toBe(BigInt('1000000'))
      expect(parseDisplayAmount('10.50', decimals6)).toBe(BigInt('10500000'))
      expect(parseDisplayAmount('0.01', decimals6)).toBe(BigInt('10000'))
    })

    it('handles small amounts correctly', () => {
      expect(parseDisplayAmount('0.000001', decimals18)).toBe(
        BigInt('1000000000000'),
      )
    })
  })

  describe('formatTokenAmount', () => {
    const decimals18 = 18

    it('formats whole token amounts', () => {
      expect(formatTokenAmount(BigInt('1000000000000000000'), decimals18)).toBe(
        '1.00',
      )
      expect(
        formatTokenAmount(BigInt('10000000000000000000'), decimals18),
      ).toBe('10.00')
    })

    it('formats fractional amounts', () => {
      expect(formatTokenAmount(BigInt('1500000000000000000'), decimals18)).toBe(
        '1.50',
      )
      expect(
        formatTokenAmount(BigInt('10500000000000000000'), decimals18),
      ).toBe('10.50')
    })

    it('formats with custom display decimals', () => {
      expect(
        formatTokenAmount(BigInt('1500000000000000000'), decimals18, 4),
      ).toBe('1.5000')
      expect(
        formatTokenAmount(BigInt('1234567890000000000'), decimals18, 8),
      ).toBe('1.23456789')
    })

    it('works with 6 decimal tokens', () => {
      const decimals6 = 6
      expect(formatTokenAmount(BigInt('1000000'), decimals6)).toBe('1.00')
      expect(formatTokenAmount(BigInt('10500000'), decimals6)).toBe('10.50')
    })
  })

  describe('isValidTransferAmount', () => {
    it('accepts valid whole number amounts', () => {
      expect(isValidTransferAmount('1')).toBe(true)
      expect(isValidTransferAmount('10')).toBe(true)
      expect(isValidTransferAmount('100')).toBe(true)
    })

    it('accepts valid decimal amounts with up to 2 decimals', () => {
      expect(isValidTransferAmount('1.5')).toBe(true)
      expect(isValidTransferAmount('10.50')).toBe(true)
      expect(isValidTransferAmount('0.01')).toBe(true)
      expect(isValidTransferAmount('0.99')).toBe(true)
    })

    it('rejects zero or negative amounts', () => {
      expect(isValidTransferAmount('0')).toBe(false)
      expect(isValidTransferAmount('-1')).toBe(false)
      expect(isValidTransferAmount('-10.50')).toBe(false)
    })

    it('rejects amounts with more than 2 decimal places', () => {
      expect(isValidTransferAmount('1.123')).toBe(false)
      expect(isValidTransferAmount('10.999')).toBe(false)
    })

    it('rejects invalid formats', () => {
      expect(isValidTransferAmount('')).toBe(false)
      expect(isValidTransferAmount('abc')).toBe(false)
      expect(isValidTransferAmount('10.50.00')).toBe(false)
      expect(isValidTransferAmount('10+')).toBe(false)
    })
  })

  describe('roundtrip conversion', () => {
    const decimals18 = 18

    it('maintains precision through parse and format', () => {
      const amounts = ['1', '10', '100', '10.50', '0.01', '99.99']

      for (const amount of amounts) {
        const parsed = parseDisplayAmount(amount, decimals18)
        const formatted = formatTokenAmount(parsed, decimals18)
        // Note: formatTokenAmount always outputs 2 decimal places
        const expected = amount.includes('.')
          ? amount.padEnd(amount.indexOf('.') + 3, '0')
          : `${amount}.00`
        expect(formatted).toBe(expected)
      }
    })

    it('formatForTransfer output can be parsed correctly', () => {
      const testCases = [
        { input: 10.5, expected: BigInt('10500000000000000000') },
        { input: 1, expected: BigInt('1000000000000000000') },
        { input: 0.99, expected: BigInt('990000000000000000') },
        { input: 100, expected: BigInt('100000000000000000000') },
      ]

      for (const { input, expected } of testCases) {
        const formatted = formatForTransfer(input)
        const parsed = parseDisplayAmount(formatted, decimals18)
        expect(parsed).toBe(expected)
      }
    })
  })

  describe('edge cases for on-chain transfers', () => {
    const decimals18 = 18

    it('handles maximum safe integer', () => {
      // Max safe integer in JS is 2^53 - 1
      // This should work without precision loss
      expect(parseDisplayAmount('9007199254740991', decimals18)).toBe(
        BigInt('9007199254740991000000000000000000'),
      )
    })

    it('handles typical payment amounts', () => {
      const typicalAmounts = [
        { display: '5', wei: BigInt('5000000000000000000') },
        { display: '25.50', wei: BigInt('25500000000000000000') },
        { display: '100', wei: BigInt('100000000000000000000') },
        { display: '0.50', wei: BigInt('500000000000000000') },
      ]

      for (const { display, wei } of typicalAmounts) {
        expect(parseDisplayAmount(display, decimals18)).toBe(wei)
      }
    })
  })
})
