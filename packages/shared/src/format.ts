export type Locale = 'ro' | 'en'

const intlLocale: Record<Locale, string> = { ro: 'ro-RO', en: 'en-GB' }

export function formatMoney(value: number, locale: Locale, currency = 'EUR'): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** YYYY-MM-DD (or full ISO) to a short local date. */
export function formatDate(iso: string, locale: Locale): string {
  if (!iso) return ''
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'medium' }).format(d)
}

export function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

/** Today as YYYY-MM-DD in local time. */
export function todayIso(): string {
  return toIsoDate(new Date())
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

/** "YYYY-MM" label for a YYYY-MM-DD date. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}
