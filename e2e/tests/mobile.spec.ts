import { expect, test } from './fixtures'

/** Runs only in the *-mobile projects (Pixel 7 viewport). */
test.describe('mobile layout', () => {
  test('navigation drawer collapses behind a menu button and pages have no horizontal overflow', async ({
    page,
    ui,
  }) => {
    await ui.login('admin')
    // Drawer is off-screen on phones; the nav item becomes reachable through the menu button.
    await expect(page.getByTestId('nav-orders')).not.toBeInViewport()
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await expect(page.getByTestId('nav-orders')).toBeInViewport()
    await page.getByTestId('nav-orders').click()
    await expect(ui.rows().first()).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    await page.goto('/orders/new')
    await expect(page.getByTestId('order-form')).toBeVisible()
    await expect(page.getByTestId('save-order')).toBeVisible()
  })
})
