import { ordersToSheetRows } from '../csv'
import type { OrderListItem } from '../types'
import { downloadBlob } from './download'

/**
 * Build an .xlsx workbook from grid rows entirely in the browser.
 * SheetJS is ~400 kB, so it is loaded on first use instead of with the page.
 */
export async function exportOrdersXlsx(
  items: readonly OrderListItem[],
  filename = 'orders.xlsx',
): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = ordersToSheetRows(items)
  const sheet = XLSX.utils.json_to_sheet(rows)
  // Reasonable column widths so the file opens readable.
  sheet['!cols'] = [14, 32, 12, 12, 12, 7, 12, 12, 12, 9, 40].map((w) => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Orders')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  downloadBlob(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  )
}
