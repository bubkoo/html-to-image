import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { resourcePolicyServer } from './test/browser/fixtures/resource-policy-server.mjs'

const names = ['chromium', 'firefox', 'webkit'] as const
const selected = process.env.TEST_BROWSER
if (selected && !names.includes(selected as (typeof names)[number])) {
  throw new Error(`Unsupported TEST_BROWSER: ${selected}`)
}
const suite = process.env.TEST_SUITE || 'browser'
if (!['browser', 'regression', 'coverage'].includes(suite)) {
  throw new Error(`Unsupported TEST_SUITE: ${suite}`)
}

const fixtureTypes: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}
const root = process.cwd()
const resourcePolicy = resourcePolicyServer(root)

export default defineConfig({
  optimizeDeps: { include: ['pixelmatch'] },
  plugins: [
    {
      name: 'serve-legacy-fixtures',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (await resourcePolicy(request, response)) return
          const pathname = new URL(request.url || '/', 'http://localhost')
            .pathname
          if (
            !pathname.startsWith('/base/test/resources/') &&
            !pathname.startsWith(
              '/base/node_modules/@fortawesome/fontawesome-free/',
            )
          ) {
            return next()
          }
          const fileName = resolve(root, pathname.slice('/base/'.length))
          if (!fileName.startsWith(root + sep)) return next()
          try {
            const body = await readFile(fileName)
            response.writeHead(200, {
              'Content-Type': fixtureTypes[extname(fileName)] || 'text/plain',
            })
            response.end(body)
          } catch {
            response.writeHead(404).end()
          }
        })
      },
    },
  ],
  test: {
    globals: true,
    restoreMocks: true,
    include:
      suite === 'browser'
        ? ['test/browser-unit/**/*.test.ts']
        : suite === 'regression'
          ? ['test/spec/**/*.test.ts']
          : ['test/browser-unit/**/*.test.ts', 'test/spec/**/*.test.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'test/coverage',
      include: ['src/**/*.ts'],
    },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      commands: {
        async collectGarbage({ page }) {
          await page.requestGC()
        },
        async screenshotScrollSource({ iframe }, selector: string) {
          const png = await iframe
            .locator(selector)
            .screenshot({ scale: 'css', timeout: 5000 })
          return png.toString('base64')
        },
        async recordScrollbarBoxEvidence(_, record: string) {
          const data = JSON.parse(record)
          if (
            !process.env.SCROLLBAR_BOX_EVIDENCE &&
            !data.nativeDifferentChannels
          )
            return
          const folder = resolve('.vitest/attachments/scrollbar-box')
          await mkdir(folder, { recursive: true })
          const name = String(data.engine + '-' + data.kind).replace(
            /[^a-z0-9-]/gi,
            '_',
          )
          await Promise.all(
            ['native', 'capture', 'authored'].map(async (key) => {
              if (data[key]) {
                await writeFile(
                  resolve(folder, name + '-' + key + '.png'),
                  Buffer.from(data[key], 'base64'),
                )
                delete data[key]
              }
            }),
          )
          await writeFile(
            resolve(folder, name + '.json'),
            JSON.stringify(data, null, 2) + '\n',
          )
        },
      },
      instances: (selected
        ? [selected]
        : suite === 'browser'
          ? names
          : ['chromium']
      ).map((browser) => ({
        browser: browser as (typeof names)[number],
        provider: playwright({
          launchOptions:
            browser === 'chromium'
              ? {
                  ignoreDefaultArgs: ['--hide-scrollbars'],
                  args: [
                    '--disable-features=OverlayScrollbar,FluentOverlayScrollbar',
                  ],
                }
              : undefined,
        }),
      })),
    },
  },
})
