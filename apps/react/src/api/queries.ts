import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DashboardRange,
  OrderInput,
  OrderListItem,
  OrderQuery,
  OrderStatus,
  Page,
} from '@orderdesk/shared'
import { customersApi, ordersApi, productsApi, statsApi } from './endpoints'

/**
 * TanStack Query hooks. Query keys are hierarchical so one invalidation of ['orders']
 * refreshes every list, detail and history query at once.
 */
export const keys = {
  orders: ['orders'] as const,
  ordersList: (q: OrderQuery) => ['orders', 'list', q] as const,
  order: (id: string) => ['orders', 'detail', id] as const,
  history: (id: string) => ['orders', 'history', id] as const,
  customers: (q: string) => ['customers', q] as const,
  customer: (id: string) => ['customers', 'detail', id] as const,
  products: (q: string) => ['products', q] as const,
  dashboard: (r: DashboardRange) => ['dashboard', r] as const,
}

export function useOrders(q: OrderQuery) {
  return useQuery({
    queryKey: keys.ordersList(q),
    queryFn: () => ordersApi.list(q),
    // Keep showing the previous page while the next one loads: no grid flicker.
    placeholderData: keepPreviousData,
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: keys.order(id ?? ''),
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  })
}

export function useOrderHistory(id: string | undefined) {
  return useQuery({
    queryKey: keys.history(id ?? ''),
    queryFn: () => ordersApi.history(id!),
    enabled: !!id,
  })
}

export function useCustomerSearch(q: string) {
  return useQuery({
    queryKey: keys.customers(q),
    queryFn: () => customersApi.search(q, 15),
    staleTime: 60_000,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: keys.customer(id ?? ''),
    queryFn: () => customersApi.get(id!),
    enabled: !!id,
    retry: false,
  })
}

export function useProductSearch(q: string) {
  return useQuery({
    queryKey: keys.products(q),
    queryFn: () => productsApi.search(q, 15),
    staleTime: 60_000,
  })
}

export function useDashboard(range: DashboardRange) {
  return useQuery({
    queryKey: keys.dashboard(range),
    queryFn: () => statsApi.dashboard(range),
    placeholderData: keepPreviousData,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: OrderInput) => ordersApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.orders }),
  })
}

export function useUpdateOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: OrderInput) => ordersApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.orders }),
  })
}

export function useDeleteOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => ordersApi.bulkDelete(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.orders }),
  })
}

/**
 * Optimistic status change: patch every cached list page immediately,
 * roll back from the snapshot if the server refuses, then refetch to be safe.
 */
export function useBulkStatus(currentQuery?: OrderQuery) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: OrderStatus }) =>
      ordersApi.bulkStatus(ids, status),
    onMutate: async ({ ids, status }) => {
      await qc.cancelQueries({ queryKey: keys.orders })
      const listKey = currentQuery ? keys.ordersList(currentQuery) : null
      const snapshot = listKey ? qc.getQueryData<Page<OrderListItem>>(listKey) : undefined
      if (listKey && snapshot) {
        qc.setQueryData<Page<OrderListItem>>(listKey, {
          ...snapshot,
          items: snapshot.items.map((o) => (ids.includes(o.id) ? { ...o, status } : o)),
        })
      }
      return { listKey, snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.listKey && ctx.snapshot) qc.setQueryData(ctx.listKey, ctx.snapshot)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.orders }),
  })
}

export function useImportOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: Array<Record<string, unknown>>) => ordersApi.import(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.orders }),
  })
}
