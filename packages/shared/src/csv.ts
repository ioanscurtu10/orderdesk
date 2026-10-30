import { importRowSchema, type ImportRow } from './schemas'
import type { OrderListItem } from './types'

export interface RowValidation {
  /** 1-based data row number (header excluded), as shown to the user. */
  row: number
  data: ImportRow | null
  errors: string[]
}

/** Validate raw CSV rows (already parsed into objects) against the import schema. */
export function validateImportRows(rows: Array<Record<string, unknown>>): RowValidation[] {
  return rows.map((raw, i) => {
    const parsed = importRowSchema.safeParse(raw)
    if (parsed.success) return { row: i + 1, data: parsed.data, errors: [] }
    const errors = parsed.error.issues.map(
      (iss) => `${iss.path.join('.') || 'row'}: ${iss.message}`,
    )
    return { row: i + 1, data: null, errors }
  })
}

export interface GroupedImportOrder {
  ref: string
  customerCode: string
  status: ImportRow['status']
  orderDate: string
  dueDate: string
  notes: string
  rows: number[]
  lines: Array<{ sku: string; quantity: number; unitPrice: number; discountPct: number }>
}

/** Group valid rows by `ref`. Header fields are taken from the first row of each group. */
export function groupImportRows(valid: RowValidation[]): GroupedImportOrder[] {
  const map = new Map<string, GroupedImportOrder>()
  for (const v of valid) {
    if (!v.data) continue
    const r = v.data
    let g = map.get(r.ref)
    if (!g) {
      g = {
        ref: r.ref,
        customerCode: r.customerCode,
        status: r.status,
        orderDate: r.orderDate,
        dueDate: r.dueDate,
        notes: r.notes,
        rows: [],
        lines: [],
      }
      map.set(r.ref, g)
    }
    g.rows.push(v.row)
    g.lines.push({
      sku: r.sku,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      discountPct: r.discountPct,
    })
  }
  return [...map.values()]
}

export const EXPORT_COLUMNS: Array<{ key: keyof OrderListItem; header: string }> = [
  { key: 'number', header: 'Number' },
  { key: 'customerName', header: 'Customer' },
  { key: 'status', header: 'Status' },
  { key: 'orderDate', header: 'Order date' },
  { key: 'dueDate', header: 'Due date' },
  { key: 'lineCount', header: 'Lines' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'vatAmount', header: 'VAT' },
  { key: 'total', header: 'Total' },
  { key: 'currency', header: 'Currency' },
  { key: 'notes', header: 'Notes' },
]

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function ordersToCsv(items: readonly OrderListItem[]): string {
  const header = EXPORT_COLUMNS.map((c) => c.header).join(',')
  const body = items.map((o) => EXPORT_COLUMNS.map((c) => csvEscape(o[c.key])).join(','))
  return [header, ...body].join('\r\n')
}

/** Rows ready for SheetJS (array of plain objects with the human headers as keys). */
export function ordersToSheetRows(items: readonly OrderListItem[]): Array<Record<string, unknown>> {
  return items.map((o) => Object.fromEntries(EXPORT_COLUMNS.map((c) => [c.header, o[c.key]])))
}
