import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.HTML_TO_IMAGE_SMOKE_PORT || 4173)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './test/browser',
  testMatch: 'package.test.ts',
  timeout: 90000,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node test/browser/server.mjs',
    url: `${baseURL}/test/browser/smoke.html`,
    reuseExistingServer: false,
    timeout: 30000,
  },
})
