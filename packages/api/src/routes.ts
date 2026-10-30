import { Router } from 'express'
import { z } from 'zod'
import {
  bulkIdsSchema,
  bulkStatusSchema,
  dashboardRangeSchema,
  loginSchema,
  orderInputSchema,
  orderQuerySchema,
  ordersToCsv,
  type OrderQuery,
} from '@orderdesk/shared'
import { authenticate, issueToken, requireAuth, requireRole, type AuthedRequest } from './auth'
import type { Store } from './data/store'
import { parsedQuery, validate } from './middleware'

const searchSchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const exportQuerySchema = orderQuerySchema.extend({
  format: z.enum(['csv', 'json']).default('csv'),
})

const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
})

export function createRouter(store: Store): Router {
  const r = Router()

  r.get('/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() })
  })

  // ---- auth -----------------------------------------------------------------
  r.post('/auth/login', validate(loginSchema, 'body'), (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>
    const user = authenticate(email, password)
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const { token, expiresAt } = issueToken(user)
    res.json({ token, user, expiresAt })
  })

  r.get('/auth/me', requireAuth, (req, res) => {
    res.json((req as AuthedRequest).user)
  })

  // Everything below requires a valid token.
  r.use(requireAuth)
  const admin = requireRole('admin')

  // ---- customers / products -------------------------------------------------
  r.get('/customers', validate(searchSchema, 'query'), (req, res) => {
    const { q, limit } = parsedQuery<z.infer<typeof searchSchema>>(req)
    res.json(store.searchCustomers(q, limit))
  })
  r.get('/customers/:id', (req, res) => {
    res.json(store.getCustomer(String(req.params.id)))
  })
  r.get('/products', validate(searchSchema, 'query'), (req, res) => {
    const { q, limit } = parsedQuery<z.infer<typeof searchSchema>>(req)
    res.json(store.searchProducts(q, limit))
  })
  r.get('/products/:id', (req, res) => {
    res.json(store.getProduct(String(req.params.id)))
  })

  // ---- orders ---------------------------------------------------------------
  r.get('/orders', validate(orderQuerySchema, 'query'), (req, res) => {
    res.json(store.queryOrders(parsedQuery<OrderQuery>(req)))
  })

  // Must be registered before "/orders/:id".
  r.get('/orders/export', validate(exportQuerySchema, 'query'), (req, res) => {
    const { format, ...query } = parsedQuery<z.infer<typeof exportQuerySchema>>(req)
    const items = store.queryAll(query as OrderQuery)
    if (format === 'json') {
      res.json(items)
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="orders-${stamp}.csv"`)
    // Excel needs a UTF-8 BOM to render diacritics correctly.
    res.send(`\uFEFF${ordersToCsv(items)}`)
  })

  r.get('/orders/:id', (req, res) => {
    res.json(store.getOrder(String(req.params.id)))
  })
  r.get('/orders/:id/history', (req, res) => {
    res.json(store.getHistory(String(req.params.id)))
  })

  r.post('/orders', admin, validate(orderInputSchema, 'body'), (req, res) => {
    const order = store.createOrder(req.body, (req as AuthedRequest).user)
    res.status(201).json(order)
  })
  r.put('/orders/:id', admin, validate(orderInputSchema, 'body'), (req, res) => {
    res.json(store.updateOrder(String(req.params.id), req.body, (req as AuthedRequest).user))
  })
  r.delete('/orders/:id', admin, (req, res) => {
    store.getOrder(String(req.params.id))
    store.deleteOrders([String(req.params.id)])
    res.status(204).end()
  })

  r.post('/orders/bulk-status', admin, validate(bulkStatusSchema, 'body'), (req, res) => {
    const { ids, status } = req.body as z.infer<typeof bulkStatusSchema>
    res.json({ updated: store.setStatus(ids, status, (req as AuthedRequest).user) })
  })
  r.post('/orders/bulk-delete', admin, validate(bulkIdsSchema, 'body'), (req, res) => {
    const { ids } = req.body as z.infer<typeof bulkIdsSchema>
    res.json({ deleted: store.deleteOrders(ids) })
  })

  r.post('/orders/import', admin, validate(importBodySchema, 'body'), (req, res) => {
    const { rows } = req.body as z.infer<typeof importBodySchema>
    res.json(store.importRows(rows, (req as AuthedRequest).user))
  })

  // ---- stats ----------------------------------------------------------------
  r.get('/stats/dashboard', validate(dashboardRangeSchema, 'query'), (req, res) => {
    res.json(store.dashboard(parsedQuery<z.infer<typeof dashboardRangeSchema>>(req)))
  })

  // ---- dev helpers ----------------------------------------------------------
  r.post('/dev/reset', admin, (_req, res) => {
    store.reset()
    res.json({ ok: true })
  })

  return r
}
