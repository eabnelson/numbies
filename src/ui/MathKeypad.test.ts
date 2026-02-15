import { describe, expect, it } from 'vitest'
import { evaluateExpression } from '../utils/mathExpression'

describe('evaluateExpression', () => {
  describe('basic numbers', () => {
    it('evaluates simple integers', () => {
      expect(evaluateExpression('1')).toBe(1)
      expect(evaluateExpression('10')).toBe(10)
      expect(evaluateExpression('100')).toBe(100)
      expect(evaluateExpression('1234567')).toBe(1234567)
    })

    it('evaluates decimal numbers', () => {
      expect(evaluateExpression('1.5')).toBe(1.5)
      expect(evaluateExpression('10.50')).toBe(10.5)
      expect(evaluateExpression('0.01')).toBe(0.01)
      expect(evaluateExpression('99.99')).toBe(99.99)
    })
  })

  describe('addition', () => {
    it('adds integers', () => {
      expect(evaluateExpression('1+1')).toBe(2)
      expect(evaluateExpression('10+5')).toBe(15)
      expect(evaluateExpression('100+200')).toBe(300)
    })

    it('adds decimals', () => {
      expect(evaluateExpression('1.5+1.5')).toBe(3)
      expect(evaluateExpression('10.50+0.50')).toBe(11)
      expect(evaluateExpression('0.01+0.01')).toBe(0.02)
    })

    it('adds multiple numbers', () => {
      expect(evaluateExpression('1+2+3')).toBe(6)
      expect(evaluateExpression('10+20+30+40')).toBe(100)
    })
  })

  describe('subtraction', () => {
    it('subtracts integers', () => {
      expect(evaluateExpression('10-5')).toBe(5)
      expect(evaluateExpression('100-50')).toBe(50)
    })

    it('subtracts decimals', () => {
      expect(evaluateExpression('10.50-0.50')).toBe(10)
      expect(evaluateExpression('1.5-0.5')).toBe(1)
    })

    it('handles negative results', () => {
      expect(evaluateExpression('5-10')).toBe(-5)
    })
  })

  describe('multiplication', () => {
    it('multiplies with display operator', () => {
      expect(evaluateExpression('2×3')).toBe(6)
      expect(evaluateExpression('10×5')).toBe(50)
      expect(evaluateExpression('2.5×4')).toBe(10)
    })
  })

  describe('division', () => {
    it('divides with display operator', () => {
      expect(evaluateExpression('10÷2')).toBe(5)
      expect(evaluateExpression('100÷4')).toBe(25)
      expect(evaluateExpression('7.5÷2.5')).toBe(3)
    })

    it('handles division resulting in decimals', () => {
      expect(evaluateExpression('10÷3')).toBeCloseTo(3.333, 2)
      expect(evaluateExpression('1÷3')).toBeCloseTo(0.333, 2)
    })
  })

  describe('mixed operations', () => {
    it('handles addition and subtraction', () => {
      expect(evaluateExpression('10+5-3')).toBe(12)
      expect(evaluateExpression('100-50+25')).toBe(75)
    })

    it('follows order of operations', () => {
      expect(evaluateExpression('2+3×4')).toBe(14) // 2 + 12
      expect(evaluateExpression('10-6÷2')).toBe(7) // 10 - 3
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty string', () => {
      expect(evaluateExpression('')).toBe(0)
    })

    it('returns 0 for just minus sign', () => {
      expect(evaluateExpression('-')).toBe(0)
    })

    it('handles trailing operators', () => {
      expect(evaluateExpression('10+')).toBe(10)
      expect(evaluateExpression('10-')).toBe(10)
      expect(evaluateExpression('10×')).toBe(10)
      expect(evaluateExpression('10÷')).toBe(10)
    })

    it('returns 0 for invalid expressions', () => {
      expect(evaluateExpression('abc')).toBe(0)
      expect(evaluateExpression('10+abc')).toBe(0)
    })

    it('handles division by zero', () => {
      // Returns 0 for Infinity (not a finite number)
      expect(evaluateExpression('10÷0')).toBe(0)
    })
  })

  describe('typical user inputs for payments', () => {
    it('handles splitting bills', () => {
      // User enters total and divides
      expect(evaluateExpression('50÷2')).toBe(25)
      expect(evaluateExpression('120÷3')).toBe(40)
      expect(evaluateExpression('100÷4')).toBe(25)
    })

    it('handles adding up items', () => {
      expect(evaluateExpression('12.99+5.99+3.50')).toBeCloseTo(22.48, 2)
    })

    it('handles tip calculations', () => {
      // Base amount plus tip
      expect(evaluateExpression('50+10')).toBe(60)
      expect(evaluateExpression('85.50+15')).toBe(100.5)
    })
  })
})
