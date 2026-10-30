import { ref, shallowRef } from 'vue'
import { errorMessage } from '@/api/client'

/**
 * Minimal loading/error/data wrapper for one-off requests (detail pages, dashboard).
 * The list grid has its own Pinia store because it needs optimistic updates.
 */
export function useAsync<T>(loader: () => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<number | null>(null)
  let requestId = 0

  async function run(): Promise<void> {
    const id = ++requestId
    loading.value = true
    error.value = null
    status.value = null
    try {
      const result = await loader()
      if (id !== requestId) return
      data.value = result
    } catch (e) {
      if (id !== requestId) return
      error.value = errorMessage(e)
      status.value = (e as { response?: { status?: number } })?.response?.status ?? null
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  return { data, loading, error, status, run }
}
