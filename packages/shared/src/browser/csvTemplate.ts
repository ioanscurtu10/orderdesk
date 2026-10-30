import { IMPORT_COLUMNS } from '../schemas'

/** A two-order sample file users can download, fill in and upload. */
export function importTemplateCsv(): string {
  const header = IMPORT_COLUMNS.join(',')
  const rows = [
    [
      'A1',
      'CUST-001',
      'confirmed',
      '2026-03-01',
      '2026-03-31',
      'SKU-0001',
      '4',
      '12.50',
      '0',
      'First order',
    ],
    ['A1', 'CUST-001', 'confirmed', '2026-03-01', '2026-03-31', 'SKU-0002', '1', '99.00', '10', ''],
    [
      'B7',
      'CUST-002',
      'draft',
      '2026-03-02',
      '2026-04-01',
      'SKU-0003',
      '10',
      '3.20',
      '0',
      'Second order',
    ],
  ]
  return [header, ...rows.map((r) => r.join(','))].join('\r\n')
}
