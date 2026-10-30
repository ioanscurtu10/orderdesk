import type {
  AuthResponse,
  Customer,
  DashboardRange,
  DashboardStats,
  ImportResult,
  LoginInput,
  Order,
  OrderHistoryEntry,
  OrderInput,
  OrderListItem,
  OrderQuery,
  OrderStatus,
  Page,
  Product,
} from '@orderdesk/shared'
import { api } from './client'

/** Thin typed wrappers around the REST endpoints. Hooks in queries.ts build on these. */

/** Express parses repeated params (status=a&status=b) into arrays; serialise accordingly. */
function toParams(q: object): URLSearchParams {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)))
    else p.append(k, String(v))
  }
  return p
}

export const authApi = {
  login: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input).then((r) => r.data),
}

export const ordersApi = {
  list: (q: OrderQuery) =>
    api.get<Page<OrderListItem>>('/orders', { params: toParams(q) }).then((r) => r.data),
  get: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  history: (id: string) =>
    api.get<OrderHistoryEntry[]>(`/orders/${id}/history`).then((r) => r.data),
  create: (input: OrderInput) => api.post<Order>('/orders', input).then((r) => r.data),
  update: (id: string, input: OrderInput) =>
    api.put<Order>(`/orders/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<void>(`/orders/${id}`).then(() => undefined),
  bulkStatus: (ids: string[], status: OrderStatus) =>
    api.post<{ updated: number }>('/orders/bulk-status', { ids, status }).then((r) => r.data),
  bulkDelete: (ids: string[]) =>
    api.post<{ deleted: number }>('/orders/bulk-delete', { ids }).then((r) => r.data),
  exportCsv: (q: OrderQuery) =>
    api
      .get<Blob>('/orders/export', {
        params: toParams({ ...q, format: 'csv' }),
        responseType: 'blob',
      })
      .then((r) => r.data),
  exportJson: (q: OrderQuery) =>
    api
      .get<OrderListItem[]>('/orders/export', { params: toParams({ ...q, format: 'json' }) })
      .then((r) => r.data),
  import: (rows: Array<Record<string, unknown>>) =>
    api.post<ImportResult>('/orders/import', { rows }).then((r) => r.data),
}

export const customersApi = {
  search: (q: string, limit = 20) =>
    api.get<Customer[]>('/customers', { params: { q, limit } }).then((r) => r.data),
  get: (id: string) => api.get<Customer>(`/customers/${id}`).then((r) => r.data),
}

export const productsApi = {
  search: (q: string, limit = 20) =>
    api.get<Product[]>('/products', { params: { q, limit } }).then((r) => r.data),
  get: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),
}

export const statsApi = {
  dashboard: (range: DashboardRange) =>
    api.get<DashboardStats>('/stats/dashboard', { params: range }).then((r) => r.data),
}
