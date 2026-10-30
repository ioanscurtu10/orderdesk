/**
 * Captures the screenshots used in the README from both apps.
 * Requires the API and both dev servers to be running: `npm run dev` in another terminal.
 *
 *   npx tsx scripts/screenshots.ts
 */
import { mkdirSync } from 'node:fs'
import { chromium, type Page } from '@playwright/test'

const OUT = 'docs/screenshots'
const APPS = [
  { name: 'vue', base: 'http://localhost:5173' },
  { name: 'react', base: 'http://localhost:5174' },
] as const

mkdirSync(OUT, { recursive: true })

async function login(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/login`)
  await page.getByTestId('use-admin').click()
  await page.getByTestId('login-submit').click()
  await page.waitForURL('**/dashboard')
}

async function settle(page: Page, ms = 1200): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(ms)
}

const browser = await chromium.launch()
for (const app of APPS) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: 'en-GB' })
  // Force English regardless of the language of the machine running the script.
  await page.addInitScript(() => {
    localStorage.setItem('orderdesk.locale', JSON.stringify('en'))
  })
  await login(page, app.base)

  await page.waitForSelector('[data-testid="kpi-value"]')
  await settle(page)
  await page.screenshot({ path: `${OUT}/${app.name}-dashboard.png` })

  await page.goto(`${app.base}/orders?status=shipped,confirmed&sortBy=total&sortDir=desc`)
  await settle(page)
  await page.screenshot({ path: `${OUT}/${app.name}-orders.png` })

  const firstCell =
    app.name === 'vue'
      ? page
          .locator('[data-testid="orders-table"] tbody tr.v-data-table__tr')
          .first()
          .locator('td')
          .nth(2)
      : page
          .locator('[data-testid="orders-table"] .MuiDataGrid-row')
          .first()
          .locator('.MuiDataGrid-cell')
          .nth(2)
  await firstCell.click()
  await page.waitForSelector('[data-testid="order-number"]')
  await page.getByTestId('tab-lines').click()
  await settle(page, 600)
  await page.screenshot({ path: `${OUT}/${app.name}-order-detail.png` })

  await page.getByTestId('edit-order').click()
  await page.waitForSelector('[data-testid="order-form"]')
  await settle(page, 800)
  await page.screenshot({ path: `${OUT}/${app.name}-order-form.png` })

  await page.getByTestId('theme-toggle').click()
  await page.goto(`${app.base}/dashboard`)
  await page.waitForSelector('[data-testid="kpi-value"]')
  await settle(page)
  await page.screenshot({ path: `${OUT}/${app.name}-dashboard-dark.png` })

  await page.close()
  console.log(`captured ${app.name}`)
}
await browser.close()
