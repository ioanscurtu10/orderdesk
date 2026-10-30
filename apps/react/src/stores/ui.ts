import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@orderdesk/shared'
import i18next, { detectLocale, persistLocale } from '@/i18n'

export type ThemeName = 'light' | 'dark'

export interface Toast {
  id: number
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
  timeout: number
}

interface UiState {
  theme: ThemeName
  locale: Locale
  ordersColumns: Record<string, boolean> | null
  toasts: Toast[]
  setTheme: (t: ThemeName) => void
  toggleTheme: () => void
  setLocale: (l: Locale) => void
  setOrdersColumns: (cols: Record<string, boolean>) => void
  notify: (message: string, severity?: Toast['severity'], timeout?: number) => void
  dismiss: (id: number) => void
}

function detectTheme(): ThemeName {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let nextId = 1

/** Per-user UI preferences (theme, language, grid columns) plus the toast queue. */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: detectTheme(),
      locale: detectLocale(),
      ordersColumns: null,
      toasts: [],
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setLocale: (locale) => {
        persistLocale(locale)
        void i18next.changeLanguage(locale)
        set({ locale })
      },
      setOrdersColumns: (ordersColumns) => set({ ordersColumns }),
      notify: (message, severity = 'info', timeout = 4000) =>
        set((s) => ({ toasts: [...s.toasts, { id: nextId++, message, severity, timeout }] })),
      dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'orderdesk.prefs',
      partialize: (s) => ({ theme: s.theme, ordersColumns: s.ordersColumns }),
    },
  ),
)
