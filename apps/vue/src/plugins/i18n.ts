import { createI18n } from 'vue-i18n'
import en from '@orderdesk/shared/i18n/en'
import ro from '@orderdesk/shared/i18n/ro'
import type { Locale } from '@orderdesk/shared'
import { loadJson } from '@/utils/storage'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ro']

export function detectLocale(): Locale {
  const saved = loadJson<string | null>('orderdesk.locale', null)
  if (saved === 'ro' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, ro },
  // vue-i18n would otherwise warn on every message that contains a "{param}" it cannot resolve.
  missingWarn: false,
  fallbackWarn: false,
})
