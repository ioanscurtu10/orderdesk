/**
 * Domain model shared by the API and both front-ends.
 * Dates are ISO strings (YYYY-MM-DD for business dates, full ISO for timestamps)
 * so they serialise to JSON without surprises.
 */

export type Role = 'admin' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface AuthResponse {
  token: string
  user: User
  /** Unix epoch (ms) at which the token expires. */
  expiresAt: number
}

export const ORDER_STATUSES = ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface Customer {
  id: string
  code: string
  name: string
  email: string
  city: string
  country: string
  vatId: string
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  unitPrice: number
}

export interface OrderLine {
  id: string
  productId: string
  sku: string
  name: string
  quantity: number
  unitPrice: number
  discountPct: number
  lineTotal: number
}

export interface OrderTotals {
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
}

/** The row shape used by the grid. No lines, to keep the payload small. */
export interface OrderListItem extends OrderTotals {
  id: string
  number: string
  customerId: string
  customerName: string
  status: OrderStatus
  orderDate: string
  dueDate: string
  currency: 'EUR'
  lineCount: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Order extends OrderListItem {
  lines: OrderLine[]
}

export type HistoryAction = 'created' | 'updated' | 'status_changed' | 'imported'

export interface OrderHistoryEntry {
  id: string
  orderId: string
  at: string
  userName: string
  action: HistoryAction
  details: string
}

export type SortDir = 'asc' | 'desc'

export type OrderSortField =
  | 'number'
  | 'customerName'
  | 'status'
  | 'orderDate'
  | 'dueDate'
  | 'total'
  | 'lineCount'
  | 'updatedAt'

export interface OrderQuery {
  page: number
  pageSize: number
  sortBy: OrderSortField
  sortDir: SortDir
  q?: string
  status?: OrderStatus[]
  customerId?: string
  dateFrom?: string
  dateTo?: string
  minTotal?: number
  maxTotal?: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardRange {
  dateFrom: string
  dateTo: string
}

export interface DashboardStats {
  kpis: {
    revenue: number
    orders: number
    avgOrderValue: number
    openOrders: number
  }
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>
  topCustomers: Array<{ customerId: string; name: string; revenue: number }>
  statusBreakdown: Array<{ status: OrderStatus; count: number }>
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export interface ApiError {
  error: string
  details?: unknown
}
