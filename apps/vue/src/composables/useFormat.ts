import { formatDate, formatDateTime, formatMoney, formatNumber } from '@orderdesk/shared'
import { useUiStore } from '@/stores/ui'

/** Locale-aware formatters bound to the current UI language. */
export function useFormat() {
  const ui = useUiStore()
  return {
    money: (n: number) => formatMoney(n, ui.locale),
    number: (n: number, digits = 0) => formatNumber(n, ui.locale, digits),
    date: (iso: string) => formatDate(iso, ui.locale),
    dateTime: (iso: string) => formatDateTime(iso, ui.locale),
  }
}
