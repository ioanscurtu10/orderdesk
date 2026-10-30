import ResizeObserver from 'resize-observer-polyfill'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'
import { i18n } from '@/plugins/i18n'
import { vuetify } from '@/plugins/vuetify'

// Vuetify needs these browser APIs that jsdom lacks.
globalThis.ResizeObserver = ResizeObserver
globalThis.visualViewport = null as unknown as VisualViewport
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList)

config.global.plugins = [vuetify, i18n]

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  i18n.global.locale.value = 'en'
})
