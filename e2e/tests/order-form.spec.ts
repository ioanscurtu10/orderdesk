import { expect, resetApi, test } from './fixtures'

test.describe('order form', () => {
  test.beforeAll(async ({ request }) => {
    await resetApi(request)
  })
  test.beforeEach(async ({ ui }) => {
    await ui.login('admin')
  })

  test('creates an order with two lines and shows computed totals', async ({ page, ui }) => {
    await page.goto('/orders/new')
    await expect(page.getByTestId('order-form')).toBeVisible()

    await ui.input('customer-select').click()
    await ui.input('customer-select').fill('CUST-001')
    await ui.menuOptions().first().click()

    await ui.input('line-product-0').click()
    await ui.input('line-product-0').fill('SKU-0001')
    await ui.menuOptions().first().click()
    await ui.input('line-qty-0').fill('2')
    await ui.input('line-price-0').fill('100')
    await ui.input('line-discount-0').fill('10')

    await page.getByTestId('add-line').click()
    await ui.input('line-product-1').click()
    await ui.input('line-product-1').fill('SKU-0002')
    await ui.menuOptions().first().click()
    await ui.input('line-qty-1').fill('1')
    await ui.input('line-price-1').fill('50')
    await ui.input('line-discount-1').fill('0')

    // 2 × 100 − 10% = 180, + 50 = 230, VAT 19% = 43.70, total 273.70
    await expect(page.getByTestId('line-total-0')).toHaveText(/180\.00/)
    await expect(page.getByTestId('totals-total')).toHaveText(/273\.70/)

    await ui.input('notes').fill('Created by the e2e suite')
    await page.getByTestId('save-order').click()

    await expect(page).toHaveURL(/\/orders\/ord_\d+$/)
    await expect(page.getByTestId('order-number')).toHaveText(/ORD-\d{4}-\d{5}/)
    await expect(page.getByTestId('toast')).toContainText(/created/)
    await page.getByTestId('tab-lines').click()
    await expect(page.getByTestId('order-total')).toHaveText(/273\.70/)
  })

  test('validates required fields and the due date rule', async ({ page, ui }) => {
    await page.goto('/orders/new')
    await ui.input('order-date').fill('2026-05-10')
    await ui.input('due-date').fill('2026-05-01')
    await page.getByTestId('save-order').click()
    await expect(page.getByTestId('order-form')).toContainText(
      /Due date must be on or after the order date/,
    )
    await expect(page.getByTestId('order-form')).toContainText(/Required/)
    await expect(page).toHaveURL(/\/orders\/new/)
  })

  test('warns about unsaved changes and lets the user stay', async ({ page, ui }) => {
    await page.goto('/orders/new')
    await ui.input('notes').fill('dirty')
    await expect(page.getByTestId('dirty-indicator')).toBeVisible()
    await page.getByTestId('nav-orders').click()
    await expect(page.getByTestId('confirm-dialog')).toBeVisible()
    await page.getByTestId('confirm-cancel').click()
    await expect(page).toHaveURL(/\/orders\/new/)
    await page.getByTestId('nav-orders').click()
    await page.getByTestId('confirm-ok').click()
    await expect(page).toHaveURL(/\/orders$/)
  })

  test('edits an existing order and records the change in history', async ({ page, ui }) => {
    await ui.gotoOrders('?q=ORD-2026-00003')
    await ui.rowCell(ui.rows().first()).click()
    await expect(page.getByTestId('order-number')).toBeVisible()
    await page.getByTestId('edit-order').click()
    await expect(page.getByTestId('order-form')).toBeVisible()
    await ui.expectAutocompleteValue('line-product-0', /SKU-\d{4}/)
    await ui.input('notes').fill('Edited by the e2e suite')
    await page.getByTestId('save-order').click()
    await expect(page.getByTestId('toast')).toContainText(/saved/)
    await expect(page).toHaveURL(/\/orders\/ord_\d+$/)
    await page.getByTestId('tab-history').click()
    await expect(page.getByTestId('history-timeline')).toContainText(/Updated/)
  })

  test('downloads a PDF invoice generated in the browser', async ({ page, ui }) => {
    await ui.gotoOrders('?q=ORD-2026-00004')
    await ui.rowCell(ui.rows().first()).click()
    await expect(page.getByTestId('download-invoice')).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByTestId('download-invoice').click()
    expect((await download).suggestedFilename()).toMatch(/^ORD-\d{4}-\d{5}\.pdf$/)
  })
})
