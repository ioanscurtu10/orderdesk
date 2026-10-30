import type { Cell, Row } from 'write-excel-file/browser'
import { EXPORT_COLUMNS } from '../csv'
import type { OrderListItem } from '../types'
import { downloadBlob } from './download'

/** Column widths in characters, in EXPORT_COLUMNS order. */
const WIDTHS = [14, 32, 12, 12, 12, 7, 12, 12, 12, 9, 40]
const MONEY_KEYS = new Set<keyof OrderListItem>(['subtotal', 'vatAmount', 'total'])

/**
 * Build an .xlsx workbook from grid rows entirely in the browser.
 * The writer is loaded on first use instead of with the page.
 */
export async function exportOrdersXlsx(
  items: readonly OrderListItem[],
  filename = 'orders.xlsx',
): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const header: Row = EXPORT_COLUMNS.map((c) => ({ value: c.header, fontWeight: 'bold' }))
  const body: Row[] = items.map((o) =>
    EXPORT_COLUMNS.map(({ key }): Cell => {
      const value = o[key]
      if (value === null || value === undefined || value === '') return null
      return MONEY_KEYS.has(key) ? { value, format: '#,##0.00' } : { value }
    }),
  )
  const blob = await writeXlsxFile([header, ...body], {
    sheet: 'Orders',
    columns: WIDTHS.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob()
  downloadBlob(blob, filename)
}
