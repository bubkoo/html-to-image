import { expect, test } from '@playwright/test'

const cases = [
  'ESM import and basic PNG',
  'nested visible scroll position',
  'large embedded data image',
  'cross-origin stylesheet fallback',
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
