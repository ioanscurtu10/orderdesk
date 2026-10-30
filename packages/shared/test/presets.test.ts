import { describe, expect, it } from 'vitest'
import { presetRange } from '../src/presets'

describe('presetRange', () => {
  it('starts "last 12 months" on the first day of the month eleven months back', () => {
    expect(presetRange('last12m', '2026-10-30')).toEqual({
      dateFrom: '2025-11-01',
      dateTo: '2026-10-30',
    })
    expect(presetRange('last12m', '2026-01-15')).toEqual({
      dateFrom: '2025-02-01',
      dateTo: '2026-01-15',
    })
  })

  it('computes the day-based and calendar presets', () => {
    expect(presetRange('last30', '2026-03-10').dateFrom).toBe('2026-02-08')
    expect(presetRange('last90', '2026-03-10').dateFrom).toBe('2025-12-10')
    expect(presetRange('thisYear', '2026-03-10').dateFrom).toBe('2026-01-01')
    expect(presetRange('all', '2026-03-10').dateFrom).toBe('2000-01-01')
  })
})
