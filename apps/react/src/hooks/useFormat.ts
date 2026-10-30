import { useMemo } from 'react'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@orderdesk/shared'
import { useUiStore } from '@/stores/ui'

/** Locale-aware formatters bound to the current UI language. */
export function useFormat() {
  const locale = useUiStore((s) => s.locale)
  return useMemo(
    () => ({
      money: (n: number) => formatMoney(n, locale),
      number: (n: number, digits = 0) => formatNumber(n, locale, digits),
      date: (iso: string) => formatDate(iso, locale),
      dateTime: (iso: string) => formatDateTime(iso, locale),
    }),
    [locale],
  )
}
