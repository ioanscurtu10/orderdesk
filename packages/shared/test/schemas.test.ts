import { describe, expect, it } from 'vitest'
import { orderInputSchema, orderQuerySchema } from '../src'

describe('orderInputSchema', () => {
  const valid = {
    customerId: 'c1',
    status: 'draft',
    orderDate: '2026-01-10',
    dueDate: '2026-01-20',
    notes: '',
    lines: [{ productId: 'p1', quantity: 2, unitPrice: 10, discountPct: 0 }],
  }

  it('accepts a valid order and coerces numeric strings', () => {
    const r = orderInputSchema.safeParse({
      ...valid,
      lines: [{ productId: 'p1', quantity: '2', unitPrice: '10.5', discountPct: '5' }],
    })
    expect(r.success).toBe(true)
    if (r.success)
      expect(r.data.lines[0]).toEqual({
        productId: 'p1',
        quantity: 2,
        unitPrice: 10.5,
        discountPct: 5,
      })
  })

  it('rejects a due date before the order date', () => {
    const r = orderInputSchema.safeParse({ ...valid, dueDate: '2026-01-01' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['dueDate'])
  })

  it('requires at least one line', () => {
    expect(orderInputSchema.safeParse({ ...valid, lines: [] }).success).toBe(false)
  })

  it('rejects a non-integer quantity', () => {
    const r = orderInputSchema.safeParse({
      ...valid,
      lines: [{ ...valid.lines[0], quantity: 1.5 }],
    })
    expect(r.success).toBe(false)
  })
})

describe('orderQuerySchema', () => {
  it('applies defaults', () => {
    const q = orderQuerySchema.parse({})
    expect(q).toMatchObject({ page: 1, pageSize: 25, sortBy: 'orderDate', sortDir: 'desc' })
  })
  it('normalises a single status to an array', () => {
    expect(orderQuerySchema.parse({ status: 'draft' }).status).toEqual(['draft'])
    expect(orderQuerySchema.parse({ status: ['draft', 'shipped'] }).status).toEqual([
      'draft',
      'shipped',
    ])
  })
  it('caps the page size', () => {
    expect(orderQuerySchema.safeParse({ pageSize: 99_999 }).success).toBe(false)
  })
})
