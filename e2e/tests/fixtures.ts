import {
  test as base,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test'

export type Framework = 'vue' | 'react'

export const API = 'http://localhost:4000/api'
export const ACCOUNTS = {
  admin: { email: 'admin@orderdesk.dev', password: 'admin123' },
  viewer: { email: 'viewer@orderdesk.dev', password: 'viewer123' },
} as const

/**
 * Framework-specific selectors. Everything else in the apps shares the same data-testid values,
 * so the scenarios themselves are written once.
 */
export class Ui {
  constructor(
    readonly page: Page,
    readonly fw: Framework,
  ) {}

  /** A text input identified by test id (Vuetify puts the id on the wrapper, MUI on the <input>). */
  input(testId: string): Locator {
    const el = this.page.getByTestId(testId)
    return this.fw === 'vue' ? el.locator('input, textarea').first() : el
  }

  /** Rows of the orders grid. */
  rows(): Locator {
    return this.fw === 'vue'
      ? this.page.locator('[data-testid="orders-table"] tbody tr.v-data-table__tr')
      : this.page.locator(
          '[data-testid="orders-table"] .MuiDataGrid-row:not(.MuiDataGrid-rowSkeleton)',
        )
  }

  /** The clickable, non-checkbox cell of a grid row. */
  rowCell(row: Locator): Locator {
    return this.fw === 'vue' ? row.locator('td').nth(2) : row.locator('.MuiDataGrid-cell').nth(2)
  }

  rowCheckbox(row: Locator): Locator {
    return row.locator('input[type="checkbox"]')
  }

  /** Options of the currently open autocomplete / select menu. */
  menuOptions(): Locator {
    return this.fw === 'vue'
      ? this.page.locator('.v-overlay--active .v-list-item')
      : this.page.locator('[role="listbox"] [role="option"], [role="menu"] [role="menuitem"]')
  }

  /** Asserts the text shown for a selected autocomplete value (Vuetify renders it beside the input, MUI inside it). */
  async expectAutocompleteValue(testId: string, pattern: RegExp): Promise<void> {
    if (this.fw === 'vue') await expect(this.page.getByTestId(testId)).toContainText(pattern)
    else await expect(this.page.getByTestId(testId)).toHaveValue(pattern)
  }

  columnHeaders(): Locator {
    return this.fw === 'vue'
      ? this.page.locator('[data-testid="orders-table"] thead th')
      : this.page.locator('[data-testid="orders-table"] .MuiDataGrid-columnHeaderTitle')
  }

  async login(role: keyof typeof ACCOUNTS = 'admin'): Promise<void> {
    await this.page.goto('/login')
    await this.page.getByTestId(`use-${role}`).click()
    await this.page.getByTestId('login-submit').click()
    await this.page.waitForURL('**/dashboard')
  }

  async gotoOrders(query = ''): Promise<void> {
    await this.page.goto(`/orders${query}`)
    await expect(this.rows().first()).toBeVisible()
  }
}

/** Log in through the API and reseed the dataset so every spec starts from the same state. */
export async function resetApi(request: APIRequestContext): Promise<string> {
  const login = await request.post(`${API}/auth/login`, { data: ACCOUNTS.admin })
  const { token } = (await login.json()) as { token: string }
  const res = await request.post(`${API}/dev/reset`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  return token
}

export const test = base.extend<{ ui: Ui }>({
  ui: async ({ page }, use, testInfo) => {
    const fw: Framework = testInfo.project.name.startsWith('react') ? 'react' : 'vue'
    await use(new Ui(page, fw))
  },
})

export { expect }
