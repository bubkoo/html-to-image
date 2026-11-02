import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const cases = [
  'ESM import and basic PNG',
  'UMD global and pixels',
  'per-node customization',
  'nested visible scroll position',
  'same-document clip path',
  'SVG use local and external symbols',
  'large embedded data image',
  'cross-origin stylesheet fallback',
  'repeated Content-Type embeds image and CSS',
]

cases.forEach((name) => {
  test(`built ESM: ${name}`, async ({ page }) => {
    await page.goto(`/test/browser/smoke.html?case=${encodeURIComponent(name)}`)
    const results = page.locator('#results')
    await expect(results).toContainText('DONE', { timeout: 60000 })
    const text = await results.textContent()
    expect(text).toContain(`PASS ${name}`)
    expect(text).not.toContain('FAIL')
  })
})

test('the full mobile smoke page completes without a hidden failure', async ({
  page,
}) => {
  await page.goto('/test/browser/smoke.html')
  const results = page.locator('#results')
  await expect(results).toContainText('REPORT SAVED', { timeout: 90000 })
  const text = await results.textContent()
  cases.forEach((name) => expect(text).toContain(`PASS ${name}`))
  expect(text).not.toContain('FAIL')
  expect(text).toContain('DPR=')
  const id = text?.match(/REPORT SAVED ([a-f0-9-]{36})/)?.[1]
  expect(id).toBeDefined()
  const report = JSON.parse(
    await readFile(`test-results/mobile-smoke-reports/${id}.json`, 'utf8'),
  )
  expect(report.id).toBe(id)
  expect(report.complete).toBe(true)
  expect(report.userAgent).toBeTruthy()
  expect(report.gitHead).toMatch(/^[a-f0-9]{40}$/)
  expect(report.verdicts).toHaveLength(cases.length + 2)
  const rejected = await page.request.post(
    '/test/browser/mobile-smoke-report',
    { data: { complete: true } },
  )
  expect(rejected.status()).toBe(403)
})

test('built UMD global renders pixels in a browser', async ({ page }) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const node = document.getElementById('capture')!
    const api = (
      window as typeof window & {
        htmlToImage?: {
          toImageData: (
            node: HTMLElement,
            options: { pixelRatio: number; skipFonts: boolean },
          ) => Promise<ImageData>
        }
      }
    ).htmlToImage
    if (!api) throw new Error('UMD global missing')
    const image = await api.toImageData(node, {
      pixelRatio: 1,
      skipFonts: true,
    })
    const offset = 4 * (16 * image.width + 16)
    return {
      width: image.width,
      height: image.height,
      pixel: Array.from(image.data.slice(offset, offset + 4)),
    }
  })
  expect(result).toEqual({ width: 32, height: 32, pixel: [255, 0, 0, 255] })
})
