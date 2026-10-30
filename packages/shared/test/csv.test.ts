import { describe, expect, it } from 'vitest'
import { groupImportRows, ordersToCsv, validateImportRows, type OrderListItem } from '../src'

const row = (over: Record<string, unknown> = {}) => ({
  ref: 'A',
  customerCode: 'CUST-001',
  status: 'confirmed',
  orderDate: '2026-01-10',
  dueDate: '2026-01-20',
  sku: 'SKU-1',
  quantity: '2',
  unitPrice: '10',
  discountPct: '',
  notes: '',
  ...over,
})

describe('validateImportRows', () => {
  it('reports errors per row with 1-based numbering', () => {
    const r = validateImportRows([row(), row({ quantity: '0' }), row({ status: 'bogus' })])
    expect(r[0]?.errors).toEqual([])
    expect(r[1]?.row).toBe(2)
    expect(r[1]?.errors[0]).toMatch(/quantity/)
    expect(r[2]?.errors[0]).toMatch(/status/)
  })
})

describe('groupImportRows', () => {
  it('groups rows by ref into one order with several lines', () => {
    const v = validateImportRows([row(), row({ sku: 'SKU-2' }), row({ ref: 'B' })])
    const g = groupImportRows(v)
    expect(g).toHaveLength(2)
    expect(g[0]?.lines).toHaveLength(2)
    expect(g[0]?.rows).toEqual([1, 2])
    expect(g[1]?.ref).toBe('B')
  })
})

describe('ordersToCsv', () => {
  it('escapes commas and quotes', () => {
    const o: OrderListItem = {
      id: '1',
      number: 'ORD-1',
      customerId: 'c',
      customerName: 'Smith, "Jones" & Co',
      status: 'draft',
      orderDate: '2026-01-01',
      dueDate: '2026-01-02',
      currency: 'EUR',
      lineCount: 1,
      notes: 'line1\nline2',
      subtotal: 1,
      vatRate: 19,
      vatAmount: 0.19,
      total: 1.19,
      createdAt: '',
      updatedAt: '',
    }
    const csv = ordersToCsv([o])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe(
      'Number,Customer,Status,Order date,Due date,Lines,Subtotal,VAT,Total,Currency,Notes',
    )
    expect(lines[1]).toContain('"Smith, ""Jones"" & Co"')
    expect(lines[1]).toContain('"line1\nline2"')
  })
})
