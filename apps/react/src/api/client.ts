import axios, { type AxiosError } from 'axios'
import type { ApiError } from '@orderdesk/shared'
import i18next from '@/i18n'
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
  const t = i18next.t.bind(i18next)
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiError>
    if (e.response?.status === 403) return t('app.forbidden')
    if (e.response?.data?.error) return e.response.data.error
    if (e.code === 'ECONNABORTED') return t('app.errorGeneric')
  }
  return t('app.errorGeneric')
}

export function httpStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Navigation on 401 is handled by the route guard: logging out flips `isAuthenticated`,
 * which re-renders <RequireAuth> and redirects to /login with the current path remembered.
 */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    const status = err.response?.status
    const isLogin = err.config?.url?.includes('/auth/login')
    if (status === 401 && !isLogin) {
      useAuthStore.getState().logout('expired')
    } else if (status === 403) {
      useUiStore.getState().notify(i18next.t('app.forbidden'), 'error')
    } else if (!err.response) {
      useUiStore.getState().notify(i18next.t('app.errorGeneric'), 'error')
    }
    return Promise.reject(err)
  },
)
