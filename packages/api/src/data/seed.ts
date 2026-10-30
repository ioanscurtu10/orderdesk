import { faker } from '@faker-js/faker'
import {
  ORDER_STATUSES,
  computeTotals,
  lineTotal,
  toIsoDate,
  type Customer,
  type Order,
  type OrderHistoryEntry,
  type OrderLine,
  type OrderStatus,
  type Product,
} from '@orderdesk/shared'

export interface Dataset {
  customers: Customer[]
  products: Product[]
  orders: Order[]
  history: OrderHistoryEntry[]
}

export interface SeedOptions {
  seed: number
  orderCount: number
  customerCount: number
  productCount: number
  /** Orders are spread over the 24 months ending on this date. Defaults to today. */
  endDate?: Date
}

const CATEGORIES = [
  'Fasteners',
  'Tools',
  'Electrical',
  'Plumbing',
  'Safety',
  'Packaging',
  'Adhesives',
]
const UNITS = ['pcs', 'box', 'kg', 'm', 'set']

/** Weighted status distribution so the dashboard looks realistic. */
function pickStatus(): OrderStatus {
  const r = faker.number.float({ min: 0, max: 1 })
  if (r < 0.08) return 'draft'
  if (r < 0.25) return 'confirmed'
  if (r < 0.4) return 'shipped'
  if (r < 0.93) return 'delivered'
  return 'cancelled'
}

export function generateDataset(opts: SeedOptions): Dataset {
  faker.seed(opts.seed)
  const end = opts.endDate ?? new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 24)

  const customers: Customer[] = Array.from({ length: opts.customerCount }, (_, i) => ({
    id: `cus_${String(i + 1).padStart(4, '0')}`,
    code: `CUST-${String(i + 1).padStart(3, '0')}`,
    name: faker.company.name(),
    email: faker.internet.email().toLowerCase(),
    city: faker.location.city(),
    country: faker.helpers.arrayElement(['RO', 'DE', 'HU', 'IT', 'FR', 'PL', 'AT']),
    vatId: `${faker.helpers.arrayElement(['RO', 'DE', 'HU'])}${faker.string.numeric(8)}`,
  }))

  const products: Product[] = Array.from({ length: opts.productCount }, (_, i) => ({
    id: `prd_${String(i + 1).padStart(4, '0')}`,
    sku: `SKU-${String(i + 1).padStart(4, '0')}`,
    name: faker.commerce.productName(),
    category: faker.helpers.arrayElement(CATEGORIES),
    unit: faker.helpers.arrayElement(UNITS),
    unitPrice: Number(faker.commerce.price({ min: 2, max: 400, dec: 2 })),
  }))

  // Some customers order a lot more than others (long tail), like real B2B data.
  const customerWeights = customers.map((c) => ({
    weight: faker.number.int({ min: 1, max: 20 }),
    value: c,
  }))

  const orders: Order[] = []
  const history: OrderHistoryEntry[] = []
  const dates = Array.from({ length: opts.orderCount }, () =>
    faker.date.between({ from: start, to: end }),
  )
  dates.sort((a, b) => a.getTime() - b.getTime())

  let seqByYear: Record<string, number> = {}
  for (let i = 0; i < opts.orderCount; i++) {
    const orderDateObj = dates[i]!
    const orderDate = toIsoDate(orderDateObj)
    const year = orderDate.slice(0, 4)
    seqByYear = { ...seqByYear, [year]: (seqByYear[year] ?? 0) + 1 }
    const customer = faker.helpers.weightedArrayElement(customerWeights)
    const lineCount = faker.number.int({ min: 1, max: 6 })
    const picked = faker.helpers.arrayElements(products, lineCount)
    const lines: OrderLine[] = picked.map((p, li) => {
      const quantity = faker.number.int({ min: 1, max: 12 })
      const discountPct = faker.helpers.weightedArrayElement([
        { weight: 6, value: 0 },
        { weight: 2, value: 5 },
        { weight: 1, value: 10 },
        { weight: 1, value: 15 },
      ])
      return {
        id: `lin_${i + 1}_${li + 1}`,
        productId: p.id,
        sku: p.sku,
        name: p.name,
        quantity,
        unitPrice: p.unitPrice,
        discountPct,
        lineTotal: lineTotal(quantity, p.unitPrice, discountPct),
      }
    })
    const totals = computeTotals(lines)
    const due = new Date(orderDateObj)
    due.setDate(due.getDate() + faker.helpers.arrayElement([14, 30, 45, 60]))
    const createdAt = orderDateObj.toISOString()
    const updated = new Date(orderDateObj)
    updated.setHours(updated.getHours() + faker.number.int({ min: 1, max: 400 }))
    if (updated > end) updated.setTime(end.getTime())
    const status = pickStatus()
    const id = `ord_${String(i + 1).padStart(6, '0')}`
    const number = `ORD-${year}-${String(seqByYear[year]).padStart(5, '0')}`

    orders.push({
      id,
      number,
      customerId: customer.id,
      customerName: customer.name,
      status,
      orderDate,
      dueDate: toIsoDate(due),
      currency: 'EUR',
      lineCount: lines.length,
      notes:
        faker.helpers.maybe(() => faker.lorem.sentence({ min: 3, max: 8 }), { probability: 0.3 }) ??
        '',
      ...totals,
      lines,
      createdAt,
      updatedAt: updated.toISOString(),
    })

    history.push({
      id: `his_${i + 1}_1`,
      orderId: id,
      at: createdAt,
      userName: 'Seed',
      action: 'created',
      details: `Order ${number} created with ${lines.length} line(s)`,
    })
    if (status !== 'draft') {
      history.push({
        id: `his_${i + 1}_2`,
        orderId: id,
        at: updated.toISOString(),
        userName: faker.person.firstName(),
        action: 'status_changed',
        details: `draft → ${status}`,
      })
    }
  }

  return { customers, products, orders, history }
}

export { ORDER_STATUSES }
