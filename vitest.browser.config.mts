import { svgResponseURLServer } from './test/browser/fixtures/svg-response-url-server.mjs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { cpus, freemem, totalmem } from 'node:os'
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
const svgStyleTraces = new Map<string, string[]>()
const svgStyleBlobStops = new Map<string, () => void>()

export default defineConfig({
  optimizeDeps: { include: ['pixelmatch'] },
  plugins: [
    {
      name: 'serve-legacy-fixtures',
      configureServer(server) {
        // A real second origin avoids relying on localhost/127 dual-stack aliases.
        const cssOrigin = createServer(async (request, response) => {
          const pathname = new URL(request.url || '/', 'http://localhost')
            .pathname
          if (pathname !== '/test/browser/fixtures/svg-styles/unrelated.css') {
            response.writeHead(404).end()
            return
          }
          const css = await readFile(resolve(root, pathname.slice(1)))
          response
            .writeHead(200, {
              'Content-Type': 'text/css',
              'Cache-Control': 'no-store',
            })
            .end(css)
        })
        server.httpServer?.once('listening', () => {
          const address = server.httpServer!.address()
          if (address && typeof address !== 'string')
            cssOrigin.listen(address.port + 1)
        })
        server.httpServer?.once('close', () => cssOrigin.close())
        server.middlewares.use(async (request, response, next) => {
          const path = request.url || ''
          svgStyleTraces.forEach((urls, marker) => {
            if (path.includes(marker)) urls.push(path)
          })
          if (svgResponseURLServer(request, response)) return
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
      provider: 'istanbul',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'test/coverage',
      include: ['src/**/*.ts'],
    },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      commands: {
        async startSVGStyleResourceTrace(
          { page },
          marker: string,
          blobURLs: string[] = [],
        ) {
          const received: string[] = []
          svgStyleTraces.set(marker, received)
          const listener = (response: { url(): string }) => {
            if (blobURLs.includes(response.url()))
              received.push('blob-response:' + response.url())
          }
          page.on('response', listener)
          svgStyleBlobStops.set(marker, () => page.off('response', listener))
        },
        async endSVGStyleResourceTrace({ page }, marker: string) {
          await page.waitForLoadState('networkidle', { timeout: 5000 })
          const trace = svgStyleTraces.get(marker)
          if (!trace) throw new Error('SVG style trace is missing')
          svgStyleTraces.delete(marker)
          svgStyleBlobStops.get(marker)?.()
          svgStyleBlobStops.delete(marker)
          return trace
        },
        async collectGarbage({ page, frame }) {
          const target = await frame()
          await page.requestGC()
          // Firefox's parent-process GC request can finish before child GC/CC.
          // Round-trip through the test frame before resuming its assertions.
          await target.evaluate(() => undefined)
        },
        async gcObserverDiagnosticsEnabled() {
          return process.env.GC_OBSERVER_DIAGNOSTICS === '1'
        },
        async recordGCObserverEvidence(_, record: string) {
          const data = JSON.parse(record)
          const execution = {
            event: process.env.GITHUB_EVENT_NAME,
            head: process.env.GITHUB_SHA,
            run: process.env.GITHUB_RUN_ID,
            image: process.env.ImageVersion,
            platform: process.platform,
            architecture: process.arch,
            node: process.version,
            cpu: cpus()[0]?.model,
            cpuCount: cpus().length,
            totalMemory: totalmem(),
            freeMemory: freemem(),
          }
          const phase = process.env.GC_OBSERVER_PHASE
          if (phase && !['sandbox-control', 'cc-only-trace'].includes(phase))
            throw new Error('Unsupported GC observer diagnostic phase')
          const folder = resolve(
            '.vitest/attachments/gc-observers',
            phase || '.',
          )
          const graphFiles =
            phase === 'cc-only-trace'
              ? (await readdir(process.env.MOZ_CC_LOG_DIRECTORY!)).sort()
              : undefined
          await mkdir(folder, { recursive: true })
          const name = String(
            suite + '-' + data.engine + '-' + data.kind,
          ).replace(/[^a-z0-9-]/gi, '_')
          await writeFile(
            resolve(folder, name + '.json'),
            JSON.stringify(
              { ...data, execution, phase, observedAt: Date.now(), graphFiles },
              null,
              2,
            ) + '\n',
          )
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
        : suite === 'regression'
          ? ['chromium']
          : names
      ).map((browser) => ({
        browser: browser as (typeof names)[number],
        ...(suite === 'coverage' && browser !== 'chromium'
          ? { exclude: ['test/spec/**'] }
          : {}),
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
