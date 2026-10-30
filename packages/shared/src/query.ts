import type { OrderListItem, OrderQuery, Page } from './types'

/**
 * Pure, framework-free implementation of server-side filtering, sorting and paging.
 * The API uses it against the in-memory dataset. It is also what the unit tests cover.
 */

export function filterOrders(items: readonly OrderListItem[], q: OrderQuery): OrderListItem[] {
  const text = q.q?.trim().toLowerCase()
  const statuses = q.status && q.status.length > 0 ? new Set(q.status) : null

  return items.filter((o) => {
    if (statuses && !statuses.has(o.status)) return false
    if (q.customerId && o.customerId !== q.customerId) return false
    if (q.dateFrom && o.orderDate < q.dateFrom) return false
    if (q.dateTo && o.orderDate > q.dateTo) return false
    if (q.minTotal !== undefined && o.total < q.minTotal) return false
    if (q.maxTotal !== undefined && o.total > q.maxTotal) return false
    if (text) {
      const haystack = `${o.number} ${o.customerName} ${o.notes}`.toLowerCase()
      if (!haystack.includes(text)) return false
    }
    return true
  })
}

export function sortOrders(items: OrderListItem[], q: OrderQuery): OrderListItem[] {
  const dir = q.sortDir === 'asc' ? 1 : -1
  const key = q.sortBy
  return [...items].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    let cmp: number
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
    else cmp = String(av).localeCompare(String(bv))
    // Stable tie-break so paging never shows duplicates.
    if (cmp === 0) cmp = a.id.localeCompare(b.id)
    return cmp * dir
  })
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}

export function queryOrders(items: readonly OrderListItem[], q: OrderQuery): Page<OrderListItem> {
  return paginate(sortOrders(filterOrders(items, q), q), q.page, q.pageSize)
}

export const DEFAULT_ORDER_QUERY: OrderQuery = {
  page: 1,
  pageSize: 25,
  sortBy: 'orderDate',
  sortDir: 'desc',
}

/** Serialise a query to URL search params (used by both apps for shareable grid URLs). */
export function orderQueryToParams(q: OrderQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (q.page !== 1) out.page = String(q.page)
  if (q.pageSize !== DEFAULT_ORDER_QUERY.pageSize) out.pageSize = String(q.pageSize)
  if (q.sortBy !== DEFAULT_ORDER_QUERY.sortBy) out.sortBy = q.sortBy
  if (q.sortDir !== DEFAULT_ORDER_QUERY.sortDir) out.sortDir = q.sortDir
  if (q.q) out.q = q.q
  if (q.status && q.status.length) out.status = q.status.join(',')
  if (q.customerId) out.customerId = q.customerId
  if (q.dateFrom) out.dateFrom = q.dateFrom
  if (q.dateTo) out.dateTo = q.dateTo
  if (q.minTotal !== undefined) out.minTotal = String(q.minTotal)
  if (q.maxTotal !== undefined) out.maxTotal = String(q.maxTotal)
  return out
}

/** Inverse of orderQueryToParams. Tolerates garbage by falling back to defaults. */
export function orderQueryFromParams(
  params: Record<string, string | string[] | null | undefined>,
): OrderQuery {
  const get = (k: string): string | undefined => {
    const v = params[k]
    if (Array.isArray(v)) return v[0] ?? undefined
    return v ?? undefined
  }
  const num = (k: string): number | undefined => {
    const v = get(k)
    if (v === undefined || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const sortBy = get('sortBy') as OrderQuery['sortBy'] | undefined
  const sortDir = get('sortDir')
  const status = get('status')
  return {
    page: Math.max(1, num('page') ?? 1),
    pageSize: Math.min(10_000, Math.max(1, num('pageSize') ?? DEFAULT_ORDER_QUERY.pageSize)),
    sortBy: sortBy ?? DEFAULT_ORDER_QUERY.sortBy,
    sortDir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : DEFAULT_ORDER_QUERY.sortDir,
    q: get('q') || undefined,
    status: status ? (status.split(',').filter(Boolean) as OrderQuery['status']) : undefined,
    customerId: get('customerId') || undefined,
    dateFrom: get('dateFrom') || undefined,
    dateTo: get('dateTo') || undefined,
    minTotal: num('minTotal'),
    maxTotal: num('maxTotal'),
  }
}
