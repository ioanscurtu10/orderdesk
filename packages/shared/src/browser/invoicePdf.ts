import type { jsPDF } from 'jspdf'
import { formatDate, formatMoney, type Locale } from '../format'
import type { Customer, Order } from '../types'

interface InvoiceLabels {
  title: string
  number: string
  orderDate: string
  dueDate: string
  customer: string
  sku: string
  product: string
  qty: string
  unitPrice: string
  discount: string
  lineTotal: string
  subtotal: string
  vat: string
  total: string
}

/**
 * Generate a simple invoice PDF for an order and return it as a Blob.
 * jsPDF is loaded lazily: it is only needed when someone clicks "Download".
 */
export async function buildInvoicePdf(
  order: Order,
  customer: Customer | null,
  labels: InvoiceLabels,
  locale: Locale,
): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const money = (n: number) => formatMoney(n, locale)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('OrderDesk', 14, 20)
  doc.setFontSize(14)
  doc.text(labels.title, 196, 20, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const meta = [
    `${labels.number}: ${order.number}`,
    `${labels.orderDate}: ${formatDate(order.orderDate, locale)}`,
    `${labels.dueDate}: ${formatDate(order.dueDate, locale)}`,
  ]
  meta.forEach((line, i) => doc.text(line, 196, 28 + i * 5, { align: 'right' }))

  doc.setFont('helvetica', 'bold')
  doc.text(labels.customer, 14, 32)
  doc.setFont('helvetica', 'normal')
  const custLines = customer
    ? [customer.name, `${customer.city}, ${customer.country}`, customer.vatId, customer.email]
    : [order.customerName]
  custLines.forEach((line, i) => doc.text(line, 14, 37 + i * 5))

  autoTable(doc, {
    startY: 62,
    head: [
      [labels.sku, labels.product, labels.qty, labels.unitPrice, labels.discount, labels.lineTotal],
    ],
    body: order.lines.map((l) => [
      l.sku,
      l.name,
      String(l.quantity),
      money(l.unitPrice),
      `${l.discountPct}%`,
      money(l.lineTotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [47, 91, 234] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  })

  const afterTable =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100
  const totals: Array<[string, string]> = [
    [labels.subtotal, money(order.subtotal)],
    [`${labels.vat} ${order.vatRate}%`, money(order.vatAmount)],
    [labels.total, money(order.total)],
  ]
  totals.forEach(([k, v], i) => {
    const y = afterTable + 10 + i * 6
    if (i === totals.length - 1) doc.setFont('helvetica', 'bold')
    doc.text(k, 150, y)
    doc.text(v, 196, y, { align: 'right' })
  })

  return doc.output('blob')
}
