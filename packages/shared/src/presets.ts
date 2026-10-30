import { addDays, todayIso } from './format'
import type { DashboardRange } from './types'

export type DashboardPreset = 'last30' | 'last90' | 'thisYear' | 'last12m' | 'all'

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  'last30',
  'last90',
  'thisYear',
  'last12m',
  'all',
]

/**
 * Date range for a dashboard preset. "Last 12 months" starts on the first day of the month
 * eleven months back, so the revenue-by-month chart shows twelve whole months instead of
 * opening with a nearly empty partial month.
 */
export function presetRange(preset: DashboardPreset, today: string = todayIso()): DashboardRange {
  switch (preset) {
    case 'last30':
      return { dateFrom: addDays(today, -30), dateTo: today }
    case 'last90':
      return { dateFrom: addDays(today, -90), dateTo: today }
    case 'thisYear':
      return { dateFrom: `${today.slice(0, 4)}-01-01`, dateTo: today }
    case 'last12m':
      return { dateFrom: firstOfMonthsAgo(today, 11), dateTo: today }
    case 'all':
      return { dateFrom: '2000-01-01', dateTo: today }
  }
}

function firstOfMonthsAgo(iso: string, months: number): string {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7)) - 1 - months
  const y = year + Math.floor(month / 12)
  const m = ((month % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}-01`
}
