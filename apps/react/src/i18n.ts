import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@orderdesk/shared/i18n/en'
import ro from '@orderdesk/shared/i18n/ro'
import type { Locale } from '@orderdesk/shared'
import { loadJson, saveJson } from './utils/storage'

export function detectLocale(): Locale {
  const saved = loadJson<string | null>('orderdesk.locale', null)
  if (saved === 'ro' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en'
}

export function persistLocale(l: Locale): void {
  saveJson('orderdesk.locale', l)
  document.documentElement.lang = l
}

/**
 * The message files are shared with the Vue app, which uses "{name}" placeholders,
 * so i18next is configured with single-brace interpolation instead of its default "{{name}}".
 */
void i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, ro: { translation: ro } },
  lng: detectLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  returnNull: false,
})

document.documentElement.lang = i18next.language

export default i18next
