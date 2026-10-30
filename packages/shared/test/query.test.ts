import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ORDER_QUERY,
  filterOrders,
  orderQueryFromParams,
  orderQueryToParams,
  paginate,
  queryOrders,
  sortOrders,
  type OrderListItem,
  type OrderQuery,
} from '../src'

function item(partial: Partial<OrderListItem> & { id: string }): OrderListItem {
  return {
    number: `ORD-${partial.id}`,
    customerId: 'c1',
    customerName: 'Acme',
    status: 'confirmed',
    orderDate: '2026-01-10',
    dueDate: '2026-02-10',
    currency: 'EUR',
    lineCount: 1,
    notes: '',
    subtotal: 100,
    vatRate: 19,
    vatAmount: 19,
    total: 119,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
    ...partial,
  }
}

const data: OrderListItem[] = [
  item({ id: '1', total: 50, status: 'draft', orderDate: '2026-01-01', customerName: 'Zeta' }),
  item({ id: '2', total: 150, status: 'shipped', orderDate: '2026-02-01', customerName: 'Alpha' }),
  item({ id: '3', total: 150, status: 'delivered', orderDate: '2026-03-01', notes: 'urgent' }),
  item({ id: '4', total: 300, status: 'cancelled', orderDate: '2026-04-01', customerId: 'c2' }),
]

const base: OrderQuery = { ...DEFAULT_ORDER_QUERY }

describe('filterOrders', () => {
  it('returns everything with an empty query', () => {
    expect(filterOrders(data, base)).toHaveLength(4)
  })
  it('filters by multiple statuses', () => {
    const r = filterOrders(data, { ...base, status: ['draft', 'shipped'] })
    expect(r.map((o) => o.id)).toEqual(['1', '2'])
  })
  it('filters by inclusive date range', () => {
    const r = filterOrders(data, { ...base, dateFrom: '2026-02-01', dateTo: '2026-03-01' })
    expect(r.map((o) => o.id)).toEqual(['2', '3'])
  })
  it('filters by total range', () => {
    expect(filterOrders(data, { ...base, minTotal: 150, maxTotal: 150 })).toHaveLength(2)
  })
  it('searches number, customer and notes case-insensitively', () => {
    expect(filterOrders(data, { ...base, q: 'URGENT' }).map((o) => o.id)).toEqual(['3'])
    expect(filterOrders(data, { ...base, q: 'alpha' }).map((o) => o.id)).toEqual(['2'])
    expect(filterOrders(data, { ...base, q: 'ORD-4' }).map((o) => o.id)).toEqual(['4'])
  })
  it('filters by customer', () => {
    expect(filterOrders(data, { ...base, customerId: 'c2' }).map((o) => o.id)).toEqual(['4'])
  })
})

describe('sortOrders', () => {
  it('sorts numbers descending with stable tie-break', () => {
    const r = sortOrders(data, { ...base, sortBy: 'total', sortDir: 'desc' })
    expect(r.map((o) => o.id)).toEqual(['4', '3', '2', '1'])
  })
  it('sorts strings ascending', () => {
    const r = sortOrders(data, { ...base, sortBy: 'customerName', sortDir: 'asc' })
    expect(r[0]?.customerName).toBe('Acme')
    expect(r[3]?.customerName).toBe('Zeta')
  })
})

describe('paginate', () => {
  it('slices and reports the total', () => {
    const p = paginate([1, 2, 3, 4, 5], 2, 2)
    expect(p).toEqual({ items: [3, 4], total: 5, page: 2, pageSize: 2 })
  })
  it('returns an empty page past the end', () => {
    expect(paginate([1, 2], 5, 10).items).toEqual([])
  })
})

describe('queryOrders', () => {
  it('combines filter, sort and paging', () => {
    const p = queryOrders(data, {
      ...base,
      status: ['shipped', 'delivered', 'cancelled'],
      sortBy: 'orderDate',
      sortDir: 'asc',
      page: 1,
      pageSize: 2,
    })
    expect(p.total).toBe(3)
    expect(p.items.map((o) => o.id)).toEqual(['2', '3'])
  })
})

describe('URL round-trip', () => {
  it('omits defaults and restores the same query', () => {
    const q: OrderQuery = {
      page: 3,
      pageSize: 50,
      sortBy: 'total',
      sortDir: 'asc',
      q: 'acme',
      status: ['draft', 'shipped'],
      dateFrom: '2026-01-01',
      minTotal: 10,
    }
    const params = orderQueryToParams(q)
    expect(params).not.toHaveProperty('dateTo')
    expect(orderQueryFromParams(params)).toEqual({
      ...q,
      customerId: undefined,
      dateTo: undefined,
      maxTotal: undefined,
    })
  })
  it('falls back to defaults on garbage', () => {
    const q = orderQueryFromParams({ page: 'abc', sortDir: 'sideways', pageSize: '-5' })
    expect(q.page).toBe(1)
    expect(q.sortDir).toBe('desc')
    expect(q.pageSize).toBe(1)
  })
})
