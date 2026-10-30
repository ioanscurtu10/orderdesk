import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI

/**
 * The same scenarios run against both front-ends. A test picks framework-specific selectors
 * (grid rows, autocomplete options) from the `ui` fixture based on the project name.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // The API keeps its data in memory and is shared by both apps, so run serially.
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-GB',
    viewport: { width: 1400, height: 900 },
  },
  projects: [
    {
      name: 'vue',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'react',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'vue-mobile',
      use: { ...devices['Pixel 7'], baseURL: 'http://localhost:5173' },
      testMatch: /mobile\.spec\.ts/,
    },
    {
      name: 'react-mobile',
      use: { ...devices['Pixel 7'], baseURL: 'http://localhost:5174' },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @orderdesk/api',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !CI,
      env: { API_DELAY_MS: '0', PORT: '4000' },
      timeout: 60_000,
    },
    {
      command: CI ? 'npm run preview -w @orderdesk/vue-app' : 'npm run dev -w @orderdesk/vue-app',
      url: 'http://localhost:5173',
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
    {
      command: CI
        ? 'npm run preview -w @orderdesk/react-app'
        : 'npm run dev -w @orderdesk/react-app',
      url: 'http://localhost:5174',
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
})
