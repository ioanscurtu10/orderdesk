import { expect, resetApi, test } from './fixtures'

test.describe('orders grid', () => {
  test.beforeAll(async ({ request }) => {
    await resetApi(request)
  })
  test.beforeEach(async ({ ui }) => {
    await ui.login('admin')
  })

  test('lists the first page with the default sort and count', async ({ page, ui }) => {
    await ui.gotoOrders()
    await expect(ui.rows()).toHaveCount(25)
    await expect(page.getByTestId('orders-count')).toHaveText(/10,000 orders/)
  })

  test('filters by status through the UI and reflects it in the URL', async ({ page, ui }) => {
    await ui.gotoOrders()
    await page.getByTestId('filter-status').click()
    if (ui.fw === 'vue') await ui.menuOptions().filter({ hasText: 'Cancelled' }).click()
    else await page.getByTestId('filter-status-cancelled').click()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/status=cancelled/)
    await expect(ui.rows().first()).toBeVisible()
    await expect(page.getByTestId('orders-count')).not.toHaveText(/10,000/)
    const chips = ui.rows().locator('[data-testid^="status-chip-"]')
    await expect(chips.first()).toBeVisible()
    for (const chip of await chips.all())
      await expect(chip).toHaveAttribute('data-testid', 'status-chip-cancelled')
  })

  test('search is debounced and narrows the result set', async ({ page, ui }) => {
    await ui.gotoOrders()
    await ui.input('filter-search').fill('ORD-2026-00001')
    await expect(page).toHaveURL(/q=ORD-2026-00001/)
    await expect(ui.rows()).toHaveCount(1)
    await expect(ui.rows().first()).toContainText('ORD-2026-00001')
  })

  test('a shared URL restores filters, sort and page', async ({ ui }) => {
    await ui.gotoOrders(
      '?status=shipped,draft&sortBy=total&sortDir=asc&minTotal=100&page=2&pageSize=10',
    )
    await expect(ui.rows()).toHaveCount(10)
    const chips = ui.rows().locator('[data-testid^="status-chip-"]')
    for (const chip of await chips.all()) {
      await expect(chip).toHaveAttribute('data-testid', /status-chip-(shipped|draft)/)
    }
    // Ascending totals: the first row must not exceed the last row on the page.
    const money = async (i: number) =>
      Number(
        (await ui.rows().nth(i).innerText()).match(/€([\d,]+\.\d{2})/)?.[1]?.replace(/,/g, '') ??
          '0',
      )
    expect(await money(0)).toBeLessThanOrEqual(await money(9))
    expect(await money(0)).toBeGreaterThanOrEqual(100)
  })

  test('reset clears every filter', async ({ page, ui }) => {
    await ui.gotoOrders('?status=cancelled&q=inc')
    await page.getByTestId('filter-reset').click()
    await expect(page).toHaveURL(/\/orders$/)
    await expect(page.getByTestId('orders-count')).toHaveText(/10,000 orders/)
  })

  test('column visibility can be toggled and is remembered', async ({ page, ui }) => {
    await ui.gotoOrders()
    await expect(ui.columnHeaders().filter({ hasText: /^Due date$/ })).toHaveCount(1)
    await page.getByTestId('columns-menu').click()
    await page.getByTestId('column-toggle-dueDate').click()
    await page.keyboard.press('Escape')
    await expect(ui.columnHeaders().filter({ hasText: /^Due date$/ })).toHaveCount(0)
    await page.reload()
    await expect(ui.rows().first()).toBeVisible()
    await expect(ui.columnHeaders().filter({ hasText: /^Due date$/ })).toHaveCount(0)
    // Restore for the other tests.
    await page.getByTestId('columns-menu').click()
    await page.getByTestId('column-toggle-dueDate').click()
    await page.keyboard.press('Escape')
    await expect(ui.columnHeaders().filter({ hasText: /^Due date$/ })).toHaveCount(1)
  })

  test('clicking a row opens the detail page with lines and history', async ({ page, ui }) => {
    await ui.gotoOrders('?q=ORD-2026-00002&sortBy=number&sortDir=asc')
    const number = (await ui.rows().first().innerText()).match(/ORD-\d{4}-\d{5}/)?.[0]
    await ui.rowCell(ui.rows().first()).click()
    await expect(page.getByTestId('order-number')).toHaveText(number ?? 'x')
    await page.getByTestId('tab-lines').click()
    await expect(page.getByTestId('order-total')).toContainText('€')
    await page.getByTestId('tab-history').click()
    await expect(page.getByTestId('history-timeline')).toContainText(/Created/)
  })

  test('bulk status change updates the selected rows', async ({ page, ui }) => {
    await ui.gotoOrders('?status=draft&sortBy=number&sortDir=asc')
    const first = ui.rows().nth(0)
    const second = ui.rows().nth(1)
    const numbers = [await first.innerText(), await second.innerText()].map(
      (t) => t.match(/ORD-\d{4}-\d{5}/)?.[0],
    )
    await ui.rowCheckbox(first).check()
    await ui.rowCheckbox(second).check()
    await expect(page.getByTestId('bulk-bar')).toContainText('2 selected')
    await page.getByTestId('status-menu').click()
    await page.getByTestId('status-option-confirmed').click()
    await expect(page.getByTestId('toast')).toContainText('2 orders updated')
    // They are no longer drafts, so they disappear from this filtered view.
    await expect(ui.rows().filter({ hasText: numbers[0] ?? 'none' })).toHaveCount(0)
    await ui.gotoOrders(`?q=${numbers[0]}`)
    await expect(ui.rows().first().locator('[data-testid="status-chip-confirmed"]')).toBeVisible()
  })

  test('language switch translates the grid and number formats', async ({ page, ui }) => {
    await ui.gotoOrders()
    await page.getByTestId('lang-ro').click()
    await expect(page.getByTestId('orders-count')).toHaveText(/comenzi/)
    await expect(ui.columnHeaders().filter({ hasText: /^Client$/ })).toHaveCount(1)
    await expect(ui.rows().first()).toContainText(/EUR/)
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('orders-count')).toHaveText(/orders/)
  })
})
