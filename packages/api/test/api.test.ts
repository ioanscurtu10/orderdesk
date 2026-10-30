import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

const { app } = createApp({ delayMs: 0, orderCount: 300 })

let adminToken = ''
let viewerToken = ''

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password })
  expect(res.status).toBe(200)
  return res.body.token as string
}

beforeAll(async () => {
  adminToken = await login('admin@orderdesk.dev', 'admin123')
  viewerToken = await login('viewer@orderdesk.dev', 'viewer123')
})

describe('auth', () => {
  it('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@orderdesk.dev', password: 'nope' })
    expect(res.status).toBe(401)
  })
  it('validates the body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body.details).toBeDefined()
  })
  it('requires a token for protected routes', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401)
    expect(
      (await request(app).get('/api/orders').set('Authorization', 'Bearer garbage.sig')).status,
    ).toBe(401)
  })
  it('returns the current user', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${viewerToken}`)
    expect(res.body).toMatchObject({ email: 'viewer@orderdesk.dev', role: 'viewer' })
  })
})

describe('orders list', () => {
  it('pages and sorts', async () => {
    const res = await request(app)
      .get('/api/orders?page=2&pageSize=10&sortBy=total&sortDir=asc')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(300)
    expect(res.body.items).toHaveLength(10)
    const totals = res.body.items.map((o: { total: number }) => o.total)
    expect([...totals].sort((a, b) => a - b)).toEqual(totals)
    expect(res.body.items[0]).not.toHaveProperty('lines')
  })
  it('filters by status (repeated param) and date range', async () => {
    const res = await request(app)
      .get('/api/orders?status=draft&status=cancelled&dateFrom=2000-01-01')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    for (const o of res.body.items) expect(['draft', 'cancelled']).toContain(o.status)
  })
  it('rejects an invalid sort field', async () => {
    const res = await request(app)
      .get('/api/orders?sortBy=hacker')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(400)
  })
  it('exports CSV with a BOM and attachment header', async () => {
    const res = await request(app)
      .get('/api/orders/export?status=delivered')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toMatch(/attachment/)
    expect(res.text.charCodeAt(0)).toBe(0xfeff)
    expect(res.text.split('\r\n')[0]).toContain('Number,Customer,Status')
  })
})

describe('orders CRUD and roles', () => {
  let customerId = ''
  let productId = ''
  let createdId = ''

  beforeAll(async () => {
    const c = await request(app)
      .get('/api/customers?q=CUST-001')
      .set('Authorization', `Bearer ${adminToken}`)
    customerId = c.body[0].id
    const p = await request(app)
      .get('/api/products?limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
    productId = p.body[0].id
  })

  const body = () => ({
    customerId,
    status: 'draft',
    orderDate: '2026-05-01',
    dueDate: '2026-05-31',
    notes: 'test',
    lines: [{ productId, quantity: 3, unitPrice: 10, discountPct: 10 }],
  })

  it('forbids viewers from creating', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(body())
    expect(res.status).toBe(403)
  })

  it('creates an order and computes totals', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body())
    expect(res.status).toBe(201)
    expect(res.body.subtotal).toBe(27)
    expect(res.body.vatAmount).toBe(5.13)
    expect(res.body.total).toBe(32.13)
    expect(res.body.number).toMatch(/^ORD-2026-\d{5}$/)
    createdId = res.body.id
  })

  it('returns validation errors for a bad payload', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body(), dueDate: '2026-01-01', lines: [] })
    expect(res.status).toBe(400)
    const paths = res.body.details.map((d: { path: string[] }) => d.path.join('.'))
    expect(paths).toContain('dueDate')
    expect(paths).toContain('lines')
  })

  it('updates and records history', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body(), status: 'confirmed' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('confirmed')
    const hist = await request(app)
      .get(`/api/orders/${createdId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(hist.body.map((h: { action: string }) => h.action)).toEqual(['updated', 'created'])
  })

  it('bulk updates status and deletes', async () => {
    const up = await request(app)
      .post('/api/orders/bulk-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [createdId], status: 'shipped' })
    expect(up.body.updated).toBe(1)
    const del = await request(app)
      .post('/api/orders/bulk-delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [createdId] })
    expect(del.body.deleted).toBe(1)
    const gone = await request(app)
      .get(`/api/orders/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(gone.status).toBe(404)
  })

  it('imports rows and reports per-row errors', async () => {
    const rows = [
      {
        ref: 'A',
        customerCode: 'CUST-001',
        status: 'confirmed',
        orderDate: '2026-06-01',
        dueDate: '2026-06-30',
        sku: 'SKU-0001',
        quantity: '2',
        unitPrice: '10',
        discountPct: '',
        notes: '',
      },
      {
        ref: 'A',
        customerCode: 'CUST-001',
        status: 'confirmed',
        orderDate: '2026-06-01',
        dueDate: '2026-06-30',
        sku: 'SKU-0002',
        quantity: '1',
        unitPrice: '5',
        discountPct: '0',
        notes: '',
      },
      {
        ref: 'B',
        customerCode: 'NOPE',
        status: 'confirmed',
        orderDate: '2026-06-01',
        dueDate: '2026-06-30',
        sku: 'SKU-0001',
        quantity: '1',
        unitPrice: '5',
        discountPct: '0',
        notes: '',
      },
      {
        ref: 'C',
        customerCode: 'CUST-002',
        status: 'confirmed',
        orderDate: '2026-06-01',
        dueDate: '2026-06-30',
        sku: 'SKU-0001',
        quantity: '0',
        unitPrice: '5',
        discountPct: '0',
        notes: '',
      },
    ]
    const res = await request(app)
      .post('/api/orders/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows })
    expect(res.status).toBe(200)
    expect(res.body.imported).toBe(1)
    expect(res.body.skipped).toBe(2)
    expect(res.body.errors.map((e: { row: number }) => e.row)).toEqual([3, 4])
  })
})

describe('dashboard', () => {
  it('returns KPIs and series for a range', async () => {
    const res = await request(app)
      .get('/api/stats/dashboard?dateFrom=2000-01-01&dateTo=2099-12-31')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.kpis.orders).toBeGreaterThan(0)
    expect(res.body.revenueByMonth.length).toBeGreaterThan(0)
    expect(res.body.topCustomers.length).toBeLessThanOrEqual(8)
  })
  it('validates the range', async () => {
    const res = await request(app)
      .get('/api/stats/dashboard?dateFrom=bad')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(400)
  })
})
