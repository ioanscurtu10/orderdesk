import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/shared/vitest.config.ts',
      'packages/api/vitest.config.ts',
      'apps/vue/vitest.config.ts',
      'apps/react/vitest.config.ts',
    ],
  },
})
