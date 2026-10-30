import {
  computeTotals,
  groupImportRows,
  lineTotal,
  queryOrders,
  validateImportRows,
  type Customer,
  type DashboardRange,
  type DashboardStats,
  type HistoryAction,
  type ImportResult,
  type Order,
  type OrderHistoryEntry,
  type OrderInput,
  type OrderListItem,
  type OrderQuery,
  type OrderStatus,
  type Page,
  type Product,
  type User,
} from '@orderdesk/shared'
import { generateDataset, type SeedOptions } from './seed'

export class NotFoundError extends Error {
  status = 404
}
export class ValidationError extends Error {
  status = 400
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

function stripLines(o: Order): OrderListItem {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lines, ...rest } = o
  return rest
}

/**
 * In-memory store. Everything is synchronous and lives for the process lifetime.
 * `reset()` reseeds, which the e2e suite uses to get a known starting point.
 */
export class Store {
  private customers = new Map<string, Customer>()
  private products = new Map<string, Product>()
  private orders = new Map<string, Order>()
  private history: OrderHistoryEntry[] = []
  private listCache: OrderListItem[] | null = null
  private seq = 0

  constructor(private readonly seedOptions: SeedOptions) {
    this.reset()
  }

  reset(): void {
    const ds = generateDataset(this.seedOptions)
    this.customers = new Map(ds.customers.map((c) => [c.id, c]))
    this.products = new Map(ds.products.map((p) => [p.id, p]))
    this.orders = new Map(ds.orders.map((o) => [o.id, o]))
    this.history = ds.history
    this.seq = ds.orders.length
    this.listCache = null
  }

  // ---- customers / products -------------------------------------------------

  searchCustomers(q: string | undefined, limit = 20): Customer[] {
    const text = q?.trim().toLowerCase()
    const all = [...this.customers.values()]
    const hits = text
      ? all.filter((c) => `${c.code} ${c.name} ${c.city}`.toLowerCase().includes(text))
      : all
    return hits.slice(0, limit)
  }

  getCustomer(id: string): Customer {
    const c = this.customers.get(id)
    if (!c) throw new NotFoundError('Customer not found')
    return c
  }

  searchProducts(q: string | undefined, limit = 20): Product[] {
    const text = q?.trim().toLowerCase()
    const all = [...this.products.values()]
    const hits = text
      ? all.filter((p) => `${p.sku} ${p.name} ${p.category}`.toLowerCase().includes(text))
      : all
    return hits.slice(0, limit)
  }

  getProduct(id: string): Product {
    const p = this.products.get(id)
    if (!p) throw new NotFoundError('Product not found')
    return p
  }

  // ---- orders ---------------------------------------------------------------

  private listItems(): OrderListItem[] {
    if (!this.listCache) this.listCache = [...this.orders.values()].map(stripLines)
    return this.listCache
  }

  private invalidate(): void {
    this.listCache = null
  }

  queryOrders(q: OrderQuery): Page<OrderListItem> {
    return queryOrders(this.listItems(), q)
  }

  /** All matching rows (no paging), for exports. */
  queryAll(q: OrderQuery): OrderListItem[] {
    return queryOrders(this.listItems(), { ...q, page: 1, pageSize: 10_000 }).items
  }

  getOrder(id: string): Order {
    const o = this.orders.get(id)
    if (!o) throw new NotFoundError('Order not found')
    return o
  }

  getHistory(orderId: string): OrderHistoryEntry[] {
    this.getOrder(orderId)
    return this.history
      .filter((h) => h.orderId === orderId)
      .sort((a, b) => b.at.localeCompare(a.at))
  }

  private buildLines(input: OrderInput['lines'], orderId: string): Order['lines'] {
    return input.map((l, i) => {
      const p = this.getProduct(l.productId)
      return {
        id: `${orderId}_l${i + 1}`,
        productId: p.id,
        sku: p.sku,
        name: p.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        lineTotal: lineTotal(l.quantity, l.unitPrice, l.discountPct),
      }
    })
  }

  private nextNumber(orderDate: string): string {
    const year = orderDate.slice(0, 4)
    const count = [...this.orders.values()].filter((o) =>
      o.number.startsWith(`ORD-${year}-`),
    ).length
    return `ORD-${year}-${String(count + 1).padStart(5, '0')}`
  }

  private log(orderId: string, user: User, action: HistoryAction, details: string): void {
    this.history.push({
      id: `his_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderId,
      at: new Date().toISOString(),
      userName: user.name,
      action,
      details,
    })
  }

  createOrder(input: OrderInput, user: User, action: HistoryAction = 'created'): Order {
    const customer = this.getCustomer(input.customerId)
    this.seq += 1
    const id = `ord_${String(this.seq).padStart(6, '0')}`
    const lines = this.buildLines(input.lines, id)
    const now = new Date().toISOString()
    const order: Order = {
      id,
      number: this.nextNumber(input.orderDate),
      customerId: customer.id,
      customerName: customer.name,
      status: input.status,
      orderDate: input.orderDate,
      dueDate: input.dueDate,
      currency: 'EUR',
      notes: input.notes,
      lineCount: lines.length,
      ...computeTotals(lines),
      lines,
      createdAt: now,
      updatedAt: now,
    }
    this.orders.set(id, order)
    this.invalidate()
    this.log(id, user, action, `Order ${order.number} ${action} with ${lines.length} line(s)`)
    return order
  }

  updateOrder(id: string, input: OrderInput, user: User): Order {
    const existing = this.getOrder(id)
    const customer = this.getCustomer(input.customerId)
    const lines = this.buildLines(input.lines, id)
    const changes: string[] = []
    if (existing.status !== input.status)
      changes.push(`status ${existing.status} → ${input.status}`)
    if (existing.customerId !== input.customerId) changes.push(`customer → ${customer.name}`)
    if (existing.lineCount !== lines.length)
      changes.push(`lines ${existing.lineCount} → ${lines.length}`)
    const updated: Order = {
      ...existing,
      customerId: customer.id,
      customerName: customer.name,
      status: input.status,
      orderDate: input.orderDate,
      dueDate: input.dueDate,
      notes: input.notes,
      lineCount: lines.length,
      ...computeTotals(lines),
      lines,
      updatedAt: new Date().toISOString(),
    }
    this.orders.set(id, updated)
    this.invalidate()
    this.log(id, user, 'updated', changes.length ? changes.join(', ') : 'Fields edited')
    return updated
  }

  setStatus(ids: string[], status: OrderStatus, user: User): number {
    let n = 0
    for (const id of ids) {
      const o = this.orders.get(id)
      if (!o || o.status === status) continue
      this.orders.set(id, { ...o, status, updatedAt: new Date().toISOString() })
      this.log(id, user, 'status_changed', `${o.status} → ${status}`)
      n++
    }
    if (n) this.invalidate()
    return n
  }

  deleteOrders(ids: string[]): number {
    let n = 0
    for (const id of ids) if (this.orders.delete(id)) n++
    if (n) {
      this.history = this.history.filter((h) => !ids.includes(h.orderId))
      this.invalidate()
    }
    return n
  }

  // ---- import ---------------------------------------------------------------

  importRows(rows: Array<Record<string, unknown>>, user: User): ImportResult {
    const validated = validateImportRows(rows)
    const errors: ImportResult['errors'] = []
    for (const v of validated) for (const e of v.errors) errors.push({ row: v.row, message: e })

    const byCode = new Map([...this.customers.values()].map((c) => [c.code, c]))
    const bySku = new Map([...this.products.values()].map((p) => [p.sku, p]))

    let imported = 0
    let skipped = 0
    for (const g of groupImportRows(validated.filter((v) => v.errors.length === 0))) {
      const customer = byCode.get(g.customerCode)
      if (!customer) {
        skipped++
        for (const r of g.rows)
          errors.push({ row: r, message: `customerCode: unknown customer ${g.customerCode}` })
        continue
      }
      const lines: OrderInput['lines'] = []
      let bad = false
      g.lines.forEach((l, i) => {
        const p = bySku.get(l.sku)
        if (!p) {
          bad = true
          errors.push({ row: g.rows[i] ?? 0, message: `sku: unknown product ${l.sku}` })
          return
        }
        lines.push({
          productId: p.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
        })
      })
      if (bad) {
        skipped++
        continue
      }
      this.createOrder(
        {
          customerId: customer.id,
          status: g.status,
          orderDate: g.orderDate,
          dueDate: g.dueDate,
          notes: g.notes,
          lines,
        },
        user,
        'imported',
      )
      imported++
    }
    // Rows that failed validation are skipped orders too, counted per ref.
    const invalidRefs = new Set(
      validated
        .filter((v) => v.errors.length > 0)
        .map((v) => String(rows[v.row - 1]?.ref ?? v.row)),
    )
    skipped += invalidRefs.size
    return { imported, skipped, errors: errors.sort((a, b) => a.row - b.row) }
  }

  // ---- stats ----------------------------------------------------------------

  dashboard(range: DashboardRange): DashboardStats {
    const inRange = this.listItems().filter(
      (o) => o.orderDate >= range.dateFrom && o.orderDate <= range.dateTo,
    )
    const billable = inRange.filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
    const revenue = billable.reduce((s, o) => s + o.total, 0)

    const months = new Map<string, { revenue: number; orders: number }>()
    for (const o of billable) {
      const k = o.orderDate.slice(0, 7)
      const m = months.get(k) ?? { revenue: 0, orders: 0 }
      m.revenue += o.total
      m.orders += 1
      months.set(k, m)
    }

    const custRevenue = new Map<string, { name: string; revenue: number }>()
    for (const o of billable) {
      const c = custRevenue.get(o.customerId) ?? { name: o.customerName, revenue: 0 }
      c.revenue += o.total
      custRevenue.set(o.customerId, c)
    }

    const statusCount = new Map<OrderStatus, number>()
    for (const o of inRange) statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1)

    const r2 = (n: number) => Math.round(n * 100) / 100
    return {
      kpis: {
        revenue: r2(revenue),
        orders: inRange.length,
        avgOrderValue: billable.length ? r2(revenue / billable.length) : 0,
        openOrders: inRange.filter((o) => o.status === 'confirmed' || o.status === 'shipped')
          .length,
      },
      revenueByMonth: [...months.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, revenue: r2(v.revenue), orders: v.orders })),
      topCustomers: [...custRevenue.entries()]
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 8)
        .map(([customerId, v]) => ({ customerId, name: v.name, revenue: r2(v.revenue) })),
      statusBreakdown: [...statusCount.entries()].map(([status, count]) => ({ status, count })),
    }
  }
}
