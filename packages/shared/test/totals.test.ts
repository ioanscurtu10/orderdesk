import { describe, expect, it } from 'vitest'
import { computeTotals, lineTotal, round2 } from '../src'

describe('round2', () => {
  it('rounds half up correctly for floating point edge cases', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.675)).toBe(2.68)
    expect(round2(10)).toBe(10)
  })
})

describe('lineTotal', () => {
  it('applies the discount percentage', () => {
    expect(lineTotal(3, 10, 0)).toBe(30)
    expect(lineTotal(3, 10, 50)).toBe(15)
    expect(lineTotal(1, 99.99, 10)).toBe(89.99)
  })
})

describe('computeTotals', () => {
  it('sums lines and applies VAT', () => {
    const t = computeTotals(
      [
        { quantity: 2, unitPrice: 100, discountPct: 0 },
        { quantity: 1, unitPrice: 50, discountPct: 20 },
      ],
      19,
    )
    expect(t).toEqual({ subtotal: 240, vatRate: 19, vatAmount: 45.6, total: 285.6 })
  })
  it('handles an empty order', () => {
    expect(computeTotals([]).total).toBe(0)
  })
})
