import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, resetApi, test } from './fixtures'

test.describe('export and import', () => {
  test.beforeAll(async ({ request }) => {
    await resetApi(request)
  })
  test.beforeEach(async ({ ui }) => {
    await ui.login('admin')
  })

  test('exports the current filter as CSV from the server', async ({ page, ui }) => {
    await ui.gotoOrders('?status=cancelled')
    const download = page.waitForEvent('download')
    await page.getByTestId('export-menu').click()
    await page.getByTestId('export-csv').click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = readFileSync(await file.path(), 'utf8')
    const lines = csv.trim().split(/\r?\n/)
    expect(lines[0]).toContain('Number,Customer,Status')
    expect(lines.length).toBeGreaterThan(100)
    expect(lines.slice(1).every((l) => l.includes(',cancelled,'))).toBe(true)
  })

  test('exports an XLSX workbook built in the browser', async ({ page, ui }) => {
    await ui.gotoOrders('?q=ORD-2026-0000')
    const download = page.waitForEvent('download')
    await page.getByTestId('export-menu').click()
    await page.getByTestId('export-xlsx').click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.xlsx$/)
    const bytes = readFileSync(await file.path())
    // XLSX files are zip archives: they start with "PK".
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
  })

  test('previews a CSV, reports invalid rows and imports the valid orders', async ({
    page,
    ui,
  }) => {
    const csv = [
      'ref,customerCode,status,orderDate,dueDate,sku,quantity,unitPrice,discountPct,notes',
      'E1,CUST-001,confirmed,2026-03-01,2026-03-31,SKU-0001,4,12.50,0,e2e import',
      'E1,CUST-001,confirmed,2026-03-01,2026-03-31,SKU-0002,1,99,10,',
      'E2,CUST-002,draft,2026-03-02,2026-04-01,SKU-0003,10,3.2,0,second',
      'E3,NOPE,draft,2026-03-02,2026-04-01,SKU-0003,10,3.2,0,unknown customer',
      'E4,CUST-002,bogus,2026-03-02,2026-04-01,SKU-0003,0,3.2,0,invalid row',
    ].join('\r\n')
    const path = join(tmpdir(), `orderdesk-e2e-${Date.now()}.csv`)
    writeFileSync(path, csv)

    await page.goto('/import')
    await expect(page.getByTestId('import-page')).toBeVisible()
    await ui.input('import-file').setInputFiles(path)

    await expect(page.getByTestId('valid-count')).toHaveText(/4 valid rows/)
    await expect(page.getByTestId('invalid-count')).toHaveText(/1 rows with errors/)
    await expect(page.getByTestId('orders-to-create')).toHaveText(/3 orders will be created/)
    await expect(page.getByTestId('import-preview')).toContainText(/status|quantity/)

    await page.getByTestId('run-import').click()
    const result = page.getByTestId('import-result')
    await expect(result).toContainText(/2 created, 1 skipped/)
    await expect(result).toContainText(/unknown customer NOPE/)

    await ui.gotoOrders('?q=e2e+import')
    await expect(ui.rows()).toHaveCount(1)
    await expect(ui.rows().first()).toContainText(/€/)
  })

  test('offers a downloadable CSV template', async ({ page }) => {
    await page.goto('/import')
    const download = page.waitForEvent('download')
    await page.getByTestId('download-template').click()
    const file = await download
    expect(file.suggestedFilename()).toBe('orderdesk-import-template.csv')
    expect(readFileSync(await file.path(), 'utf8')).toContain('ref,customerCode,status')
  })
})
