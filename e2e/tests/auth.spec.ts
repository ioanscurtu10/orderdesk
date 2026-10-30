import { expect, test } from './fixtures'

test.describe('authentication and roles', () => {
  test('redirects anonymous users to login and back after signing in', async ({ page, ui }) => {
    await page.goto('/orders?status=draft')
    await expect(page).toHaveURL(/\/login/)
    await page.getByTestId('use-admin').click()
    await page.getByTestId('login-submit').click()
    // Lands on the page that was originally requested, query string included.
    await expect(page).toHaveURL(/\/orders\?status=draft/)
    await expect(ui.rows().first()).toBeVisible()
  })

  test('shows an error for wrong credentials', async ({ page, ui }) => {
    await page.goto('/login')
    await ui.input('login-email').fill('admin@orderdesk.dev')
    await ui.input('login-password').fill('wrong-password')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('login-error')).toHaveText(/Invalid email or password/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin sees the dashboard with KPIs and charts', async ({ page, ui }) => {
    await ui.login('admin')
    await expect(page.getByTestId('kpi-value')).toHaveCount(4)
    await expect(page.getByTestId('kpi-value').first()).not.toHaveText('')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('viewer is read-only: no create button, forbidden page on /orders/new', async ({
    page,
    ui,
  }) => {
    await ui.login('viewer')
    await page.goto('/orders')
    await expect(ui.rows().first()).toBeVisible()
    await expect(page.getByTestId('new-order')).toHaveCount(0)
    await expect(page.getByTestId('nav-import')).toHaveCount(0)
    await page.goto('/orders/new')
    await expect(page.getByTestId('forbidden-page')).toBeVisible()
  })

  test('sign out returns to login and protects routes again', async ({ page, ui }) => {
    await ui.login('admin')
    await page.getByTestId('user-menu').click()
    await page.getByTestId('sign-out').click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('an expired or forged token sends the user back to login with a notice', async ({
    page,
    ui,
  }) => {
    await ui.login('admin')
    // Corrupt the stored token: the next API call answers 401 and the interceptor logs out.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        const raw = localStorage.getItem(key) ?? ''
        if (raw.includes('"token"'))
          localStorage.setItem(key, raw.replace(/"token":"[^"]+"/, '"token":"forged.token"'))
      }
    })
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/session has expired/i)).toBeVisible()
  })
})
