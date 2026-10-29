import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/browser',
  testMatch: 'package.spec.ts',
  timeout: 90000,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node test/browser/server.mjs',
    url: 'http://127.0.0.1:4173/test/browser/smoke.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
