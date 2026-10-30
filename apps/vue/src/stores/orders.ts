import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  DEFAULT_ORDER_QUERY,
  type OrderListItem,
  type OrderQuery,
  type OrderStatus,
} from '@orderdesk/shared'
import { ordersApi } from '@/api'
import { errorMessage } from '@/api/client'

/**
 * Server-side grid state for the orders list.
 * Only the current page lives here; the server owns filtering, sorting and totals.
 */
export const useOrdersStore = defineStore('orders', () => {
  const items = ref<OrderListItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const query = ref<OrderQuery>({ ...DEFAULT_ORDER_QUERY })
  let requestId = 0

  async function fetch(q: OrderQuery): Promise<void> {
    query.value = q
    const id = ++requestId
    loading.value = true
    error.value = null
    try {
      const page = await ordersApi.list(q)
      // Ignore out-of-order responses when the user types quickly.
      if (id !== requestId) return
      items.value = page.items
      total.value = page.total
    } catch (e) {
      if (id !== requestId) return
      error.value = errorMessage(e)
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  async function refresh(): Promise<void> {
    await fetch(query.value)
  }

  /** Optimistic status change: update rows immediately, roll back if the server refuses. */
  async function bulkStatus(ids: string[], status: OrderStatus): Promise<number> {
    const snapshot = items.value
    items.value = items.value.map((o) => (ids.includes(o.id) ? { ...o, status } : o))
    try {
      const res = await ordersApi.bulkStatus(ids, status)
      return res.updated
    } catch (e) {
      items.value = snapshot
      throw e
    }
  }

  async function bulkDelete(ids: string[]): Promise<number> {
    const res = await ordersApi.bulkDelete(ids)
    await refresh()
    return res.deleted
  }

  return { items, total, loading, error, query, fetch, refresh, bulkStatus, bulkDelete }
})
