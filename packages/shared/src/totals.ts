import type { OrderTotals } from './types'

export const DEFAULT_VAT_RATE = 19

/** Round half away from zero to 2 decimals, avoiding the classic 1.005 problem. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function lineTotal(quantity: number, unitPrice: number, discountPct: number): number {
  const gross = quantity * unitPrice
  return round2(gross * (1 - discountPct / 100))
}

export function computeTotals(
  lines: ReadonlyArray<{ quantity: number; unitPrice: number; discountPct: number }>,
  vatRate: number = DEFAULT_VAT_RATE,
): OrderTotals {
  const subtotal = round2(
    lines.reduce((sum, l) => sum + lineTotal(l.quantity, l.unitPrice, l.discountPct), 0),
  )
  const vatAmount = round2(subtotal * (vatRate / 100))
  return { subtotal, vatRate, vatAmount, total: round2(subtotal + vatAmount) }
}
