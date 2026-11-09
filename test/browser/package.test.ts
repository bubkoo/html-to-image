import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const cases = [
  'ESM import and basic PNG',
  'UMD global and pixels',
  'canvas snapshot pixels',
  'per-node customization',
  'shadow slot fallback and assignment',
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

test('built UMD keeps a fixed child above scrolled content', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const root = document.createElement('div')
    root.style.cssText = 'width:40px;height:40px;overflow:hidden'
    const panel = document.createElement('div')
    panel.style.cssText = 'width:40px;height:40px;overflow:auto'
    const fixed = document.createElement('div')
    fixed.style.cssText =
      'position:fixed;top:0;left:0;width:40px;height:8px;background:blue'
    const red = document.createElement('div')
    red.style.cssText = 'width:40px;height:40px;background:red'
    const green = document.createElement('div')
    green.style.cssText = 'width:40px;height:40px;background:green'
    panel.append(fixed, red, green)
    root.append(panel)
    document.body.append(root)
    panel.scrollTop = 40
    try {
      const api = (
        window as typeof window & {
          htmlToImage?: {
            toImageData: (
              node: HTMLElement,
              options: object,
            ) => Promise<ImageData>
          }
        }
      ).htmlToImage
      if (!api) throw new Error('UMD global missing')
      const image = await api.toImageData(root, {
        pixelRatio: 1,
        skipFonts: true,
      })
      const pixel = (y: number) =>
        Array.from(
          image.data.slice(
            4 * (y * image.width + 20),
            4 * (y * image.width + 20) + 4,
          ),
        )
      return { top: pixel(4), content: pixel(20), scrollTop: panel.scrollTop }
    } finally {
      root.remove()
    }
  })
  expect(result).toEqual({
    top: [0, 0, 255, 255],
    content: [0, 128, 0, 255],
    scrollTop: 40,
  })
})

test('built UMD preserves a same-origin iframe scroll position', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const root = document.createElement('div')
    root.style.cssText = 'width:40px;height:20px'
    const frame = document.createElement('iframe')
    frame.style.cssText = 'display:block;width:40px;height:20px;border:0'
    const loaded = new Promise<void>((resolve) => {
      frame.onload = () => resolve()
    })
    frame.srcdoc =
      '<style>html,body{margin:0}</style>' +
      '<div style="width:40px;height:20px;background:red"></div>' +
      '<div style="width:40px;height:20px;background:green"></div>'
    root.append(frame)
    document.body.append(root)
    try {
      await loaded
      frame.contentWindow!.scrollTo(0, 20)
      const api = (
        window as typeof window & {
          htmlToImage?: {
            toImageData: (
              node: HTMLElement,
              options: object,
            ) => Promise<ImageData>
          }
        }
      ).htmlToImage
      if (!api) throw new Error('UMD global missing')
      const options = {
        pixelRatio: 1,
        skipFonts: true,
      }
      const vertical = await api.toImageData(root, options)
      const verticalOffset = 4 * (10 * vertical.width + 20)
      const verticalPixel = Array.from(
        vertical.data.slice(verticalOffset, verticalOffset + 4),
      )
      const verticalScrollY = frame.contentWindow!.scrollY

      const reloaded = new Promise<void>((resolve) => {
        frame.onload = () => resolve()
      })
      frame.srcdoc =
        '<style>html,body{margin:0}body{width:80px;display:flex}</style>' +
        '<div style="width:40px;height:20px;flex:none;background:red"></div>' +
        '<div style="width:40px;height:20px;flex:none;background:green"></div>'
      await reloaded
      frame.contentWindow!.scrollTo(40, 0)
      const horizontal = await api.toImageData(root, options)
      const horizontalOffset = 4 * (10 * horizontal.width + 20)
      return {
        verticalPixel,
        verticalScrollY,
        horizontalPixel: Array.from(
          horizontal.data.slice(horizontalOffset, horizontalOffset + 4),
        ),
        horizontalScrollX: frame.contentWindow!.scrollX,
      }
    } finally {
      root.remove()
    }
  })
  expect(result).toEqual({
    verticalPixel: [0, 128, 0, 255],
    verticalScrollY: 20,
    horizontalPixel: [0, 128, 0, 255],
    horizontalScrollX: 40,
  })
})

test('built UMD omits HTML comments that invalidate XML', async ({ page }) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const node = document.createElement('div')
    node.style.cssText = 'width:20px;height:20px;background:red'
    const comment = document.createComment('bad -- XML comment')
    node.append(comment)
    document.body.append(node)
    try {
      const api = (
        window as typeof window & {
          htmlToImage?: {
            toSvg: (node: HTMLElement, options: object) => Promise<string>
            toImageData: (
              node: HTMLElement,
              options: object,
            ) => Promise<ImageData>
          }
        }
      ).htmlToImage
      if (!api) throw new Error('UMD global missing')
      const options = { pixelRatio: 1, skipFonts: true }
      const xml = await fetch(await api.toSvg(node, options)).then((response) =>
        response.text(),
      )
      const parsed = new DOMParser().parseFromString(xml, 'image/svg+xml')
      const image = await api.toImageData(node, options)
      return {
        parserError: Boolean(parsed.querySelector('parsererror')),
        hasComments: xml.includes('<!--'),
        pixel: Array.from(image.data.slice(0, 4)),
        sourceComment: comment.data,
      }
    } finally {
      node.remove()
    }
  })
  expect(result).toEqual({
    parserError: false,
    hasComments: false,
    pixel: [255, 0, 0, 255],
    sourceComment: 'bad -- XML comment',
  })
})

test('built UMD keeps inherited CSS variables without repeating them per child', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const root = document.createElement('div')
    root.style.cssText = 'width:20px;height:20px;--fill:rgb(0,128,0)'
    const child = document.createElement('div')
    child.style.cssText = 'width:20px;height:20px;background:var(--fill)'
    root.append(child)
    document.body.append(root)
    try {
      const api = (
        window as typeof window & {
          htmlToImage?: {
            toSvg: (node: HTMLElement, options: object) => Promise<string>
            toImageData: (
              node: HTMLElement,
              options: object,
            ) => Promise<ImageData>
          }
        }
      ).htmlToImage
      if (!api) throw new Error('UMD global missing')
      const options = { skipFonts: true, pixelRatio: 1 }
      const xml = await fetch(await api.toSvg(root, options)).then((response) =>
        response.text(),
      )
      const image = await api.toImageData(root, options)
      return {
        variableCopies: (xml.match(/--fill:/g) || []).length,
        pixel: Array.from(image.data.slice(0, 4)),
      }
    } finally {
      root.remove()
    }
  })
  expect(result).toEqual({ variableCopies: 1, pixel: [0, 128, 0, 255] })
})

test('built UMD preserves canvas pixels inside the exported image', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const pixels = await page.evaluate(async () => {
    const source = document.createElement('canvas')
    source.width = 16
    source.height = 8
    source.style.cssText = 'display:block;width:32px;height:16px'
    const context = source.getContext('2d')!
    context.fillStyle = 'red'
    context.fillRect(0, 0, 8, 8)
    context.fillStyle = 'blue'
    context.fillRect(8, 0, 8, 8)
    document.body.append(source)
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
    const image = await api.toImageData(source, {
      pixelRatio: 1,
      skipFonts: true,
    })
    const pixel = (x: number) =>
      Array.from(
        image.data.slice(
          4 * (8 * image.width + x),
          4 * (8 * image.width + x) + 4,
        ),
      )
    return {
      size: [image.width, image.height],
      red: pixel(8),
      blue: pixel(24),
    }
  })
  expect(pixels).toEqual({
    size: [32, 16],
    red: [255, 0, 0, 255],
    blue: [0, 0, 255, 255],
  })
})
