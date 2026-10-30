import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Locale } from '@orderdesk/shared'
import { detectLocale } from '@/plugins/i18n'
import { loadJson, saveJson } from '@/utils/storage'

export type ThemeName = 'light' | 'dark'

export interface Toast {
  id: number
  message: string
  color: 'success' | 'error' | 'info' | 'warning'
  timeout: number
}

interface Prefs {
  theme: ThemeName
  ordersColumns: string[] | null
}

const KEY = 'orderdesk.prefs'

function detectTheme(): ThemeName {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Per-user UI preferences (theme, language, grid columns) plus the toast queue. */
export const useUiStore = defineStore('ui', () => {
  const prefs = loadJson<Partial<Prefs>>(KEY, {})
  const theme = ref<ThemeName>(prefs.theme ?? detectTheme())
  const locale = ref<Locale>(detectLocale())
  const ordersColumns = ref<string[] | null>(prefs.ordersColumns ?? null)
  const toasts = ref<Toast[]>([])
  let nextId = 1

  function persist(): void {
    saveJson(KEY, { theme: theme.value, ordersColumns: ordersColumns.value } satisfies Prefs)
  }

  function setTheme(t: ThemeName): void {
    theme.value = t
    persist()
  }
  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }
  function setLocale(l: Locale): void {
    locale.value = l
    saveJson('orderdesk.locale', l)
  }
  function setOrdersColumns(cols: string[]): void {
    ordersColumns.value = cols
    persist()
  }

  function notify(message: string, color: Toast['color'] = 'info', timeout = 4000): void {
    toasts.value.push({ id: nextId++, message, color, timeout })
  }
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    theme,
    locale,
    ordersColumns,
    toasts,
    setTheme,
    toggleTheme,
    setLocale,
    setOrdersColumns,
    notify,
    dismiss,
  }
})
