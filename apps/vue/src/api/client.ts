import axios, { type AxiosError } from 'axios'
import type { Router } from 'vue-router'
import type { ApiError } from '@orderdesk/shared'
import { i18n } from '@/plugins/i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

/**
 * One axios instance for the whole app.
 * In dev the Vite proxy forwards /api to the mock server; in production VITE_API_URL points at it.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 20_000,
})

/** Extract a human-readable message from any axios failure. */
export function errorMessage(err: unknown): string {
  const t = i18n.global.t
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiError>
    if (e.response?.status === 403) return t('app.forbidden')
    if (e.response?.data?.error) return e.response.data.error
    if (e.code === 'ECONNABORTED') return t('app.errorGeneric')
  }
  return t('app.errorGeneric')
}

let installed = false

export function installInterceptors(router: Router): void {
  if (installed) return
  installed = true

  api.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
    return config
  })

  api.interceptors.response.use(
    (res) => res,
    (err: AxiosError<ApiError>) => {
      const status = err.response?.status
      const isLogin = err.config?.url?.includes('/auth/login')
      if (status === 401 && !isLogin) {
        // Expired or forged token: drop the session and send the user to login, remembering where they were.
        const auth = useAuthStore()
        auth.logout('expired')
        const current = router.currentRoute.value
        if (current.name !== 'login') {
          void router.replace({ name: 'login', query: { redirect: current.fullPath } })
        }
      } else if (status === 403) {
        useUiStore().notify(i18n.global.t('app.forbidden'), 'error')
      } else if (!err.response) {
        useUiStore().notify(i18n.global.t('app.errorGeneric'), 'error')
      }
      return Promise.reject(err)
    },
  )
}
