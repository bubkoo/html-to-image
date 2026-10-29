import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

const names = ['chromium', 'firefox', 'webkit'] as const
const selected = process.env.TEST_BROWSER
if (selected && !names.includes(selected as (typeof names)[number])) {
  throw new Error(`Unsupported TEST_BROWSER: ${selected}`)
}

export default defineConfig({
  test: {
    include: ['test/browser-unit/**/*.test.ts'],
    testTimeout: 30000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: (selected ? [selected] : names).map((browser) => ({
        browser: browser as (typeof names)[number],
      })),
    },
  },
})
