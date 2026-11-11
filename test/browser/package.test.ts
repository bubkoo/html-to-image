import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const cases = [
  'ESM import and basic PNG',
  'UMD global and pixels',
  'canvas snapshot pixels',
  'explicit dimensions and pixel ratio',
  'fractional fonts and tight last word',
  'SVG font-family glyph pixels',
  'SVG references after clone transforms',
  'iframe fonts and document scope',
  'capture source document lifetime',
  'pseudo background and injected mask resources',
  'SVG dependency graphs and reference precedence',
  'resource cache lifetime',
  'native HTTP cache policy',
  'per-URL resource credentials',
  'relative clone resources and callback errors',
  'per-node customization',
  'shadow slot fallback and assignment',
  'same-origin iframe viewport',
  'nested visible scroll position',
  'mixed text and inline scroll positions',
  'fixed positioning follows its source containing block',
  'horizontal fixed descendants preserve containing blocks',
  'sticky child after spacer',
  'same-document clip path',
  'SVG use local and external symbols',
  'large embedded data image',
  'cross-origin stylesheet fallback',
  'repeated Content-Type embeds image and CSS',
  'asynchronous image error recovery',
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
  expect(report.gitHead).toBe(
    execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
  )
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

test('built UMD validates explicit dimensions and preserves the scaled pixel buffer', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const api = (
      window as typeof window & {
        htmlToImage: typeof import('../../src')
      }
    ).htmlToImage
    const node = document.createElement('div')
    node.style.cssText = 'width:16px;height:12px;background:red'
    document.body.append(node)
    const renderer = api.createRenderer({ skipFonts: true, pixelRatio: 2 })
    try {
      const canvas = await renderer.toCanvas(node, {
        width: 24,
        height: 18,
        canvasWidth: 40,
        canvasHeight: 30,
      })
      const zeros = []
      const invalid = []
      const dimensions = ['width', 'height'] as const
      for (let i = 0; i < dimensions.length; i += 1) {
        const dimension = dimensions[i]
        // eslint-disable-next-line no-await-in-loop
        const capture = await renderer.capture(node, { [dimension]: 0 })
        let rasterError = ''
        try {
          // eslint-disable-next-line no-await-in-loop
          await capture.toCanvas()
        } catch (error) {
          rasterError = (error as Error).message
        }
        // eslint-disable-next-line no-await-in-loop
        const svgURL = await capture.toSvg()
        const svg = new DOMParser().parseFromString(
          decodeURIComponent(svgURL.split(',')[1]),
          'image/svg+xml',
        )
        zeros.push({
          size: capture[dimension],
          svgSize: svg.documentElement.getAttribute(dimension),
          copySize: (svg.querySelector('foreignObject > div') as HTMLElement)
            .style[dimension],
          rasterError,
        })
        capture.dispose()
        try {
          // eslint-disable-next-line no-await-in-loop
          await renderer.capture(node, { [dimension]: NaN })
          invalid.push('accepted')
        } catch (error) {
          invalid.push((error as Error).message)
        }
      }
      return {
        css: [canvas.style.width, canvas.style.height],
        buffer: [canvas.width, canvas.height],
        pixel: Array.from(
          canvas.getContext('2d')!.getImageData(78, 58, 1, 1).data,
        ),
        zeros,
        invalid,
        source: [node.style.width, node.style.height],
      }
    } finally {
      renderer.dispose()
      node.remove()
    }
  })
  expect(result.css).toEqual(['40px', '30px'])
  expect(result.buffer).toEqual([80, 60])
  expect(result.pixel).toEqual([255, 0, 0, 255])
  expect(result.source).toEqual(['16px', '12px'])
  expect(result.zeros).toHaveLength(2)
  result.zeros.forEach((zero) => {
    expect(zero).toMatchObject({ size: 0, svgSize: '0', copySize: '0px' })
    expect(zero.rasterError).toMatch(/zero-sized/)
  })
  expect(result.invalid).toHaveLength(2)
  result.invalid.forEach((error) =>
    expect(error).toMatch(/dimensions must be finite/),
  )
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

test('built UMD preserves video letterboxing instead of stretching the frame', async ({
  page,
}) => {
  await page.route('**/video-fixture.webm', async (route) => {
    await route.fulfill({
      body: await readFile('test/resources/video/flower.webm'),
      contentType: 'video/webm',
    })
  })
  await page.route('**/video-fixture.mp4', async (route) => {
    await route.fulfill({
      body: await readFile('test/resources/video/flower.mp4'),
      contentType: 'video/mp4',
    })
  })
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
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
    const root = document.createElement('div')
    root.style.cssText = 'width:240px;height:160px'
    const video = document.createElement('video')
    video.style.cssText =
      'display:block;width:240px;height:160px;object-fit:contain;background:rgb(255,0,255)'
    video.preload = 'auto'
    video.muted = true
    video.innerHTML =
      '<source src="/test/browser/video-fixture.webm" type="video/webm">' +
      '<source src="/test/browser/video-fixture.mp4" type="video/mp4">'
    root.append(video)
    document.body.append(root)
    try {
      const loaded = new Promise<void>((resolve, reject) => {
        video.addEventListener('loadeddata', () => resolve(), { once: true })
        video.addEventListener(
          'error',
          () => reject(new Error('Video fixture failed to load')),
          { once: true },
        )
      })
      video.load()
      await loaded
      const image = await api.toImageData(root, {
        pixelRatio: 1,
        skipFonts: true,
      })
      const pixel = (y: number) =>
        Array.from(
          image.data.slice(
            (y * image.width + 120) * 4,
            (y * image.width + 121) * 4,
          ),
        )
      return {
        intrinsic: [video.videoWidth, video.videoHeight],
        top: pixel(2),
        center: pixel(80),
      }
    } finally {
      video.pause()
      root.remove()
    }
  })
  expect(result.intrinsic).toEqual([960, 540])
  expect(result.top).toEqual([255, 0, 255, 255])
  expect(result.center).not.toEqual(result.top)
})

test('built UMD awaits image recovery and propagates rejected callbacks', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const api = (
      window as typeof window & { htmlToImage: typeof import('../../src') }
    ).htmlToImage
    const root = document.createElement('div')
    root.style.cssText = 'width:20px;height:20px'
    root.innerHTML =
      '<img src="data:image/png;base64,broken" width="20" height="20">'
    document.body.append(root)
    const source = root.firstChild
    let enter!: () => void
    let release!: () => void
    const started = new Promise<void>((resolve) => {
      enter = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const renderer = api.createRenderer({ skipFonts: true, pixelRatio: 1 })
    const pending = renderer.capture(root, {
      onImageErrorHandler: async function () {
        enter()
        await gate
        const replacement = document.createElement('div')
        replacement.style.cssText = 'width:20px;height:20px;background:green'
        ;(this as unknown as HTMLImageElement).replaceWith(replacement)
      },
    })
    try {
      await started
      const state = await Promise.race([
        pending.then(() => 'finished'),
        new Promise((resolve) => {
          setTimeout(() => resolve('waiting'), 50)
        }),
      ])
      release()
      const capture = await pending
      const image = await capture.toImageData()
      const offset = 4 * (10 * image.width + 10)
      const failure = new Error('recovery failed')
      const rejected = Promise.reject(failure)
      rejected.catch(() => {})
      let originalError = false
      try {
        await renderer.capture(root, { onImageErrorHandler: () => rejected })
      } catch (error) {
        originalError = error === failure
      }
      return {
        state,
        color: Array.from(image.data.slice(offset, offset + 4)),
        originalError,
        sourceUnchanged: root.firstChild === source,
      }
    } finally {
      release()
      await pending.catch(() => {})
      renderer.dispose()
      root.remove()
    }
  })
  expect(result).toEqual({
    state: 'waiting',
    color: [0, 128, 0, 255],
    originalError: true,
    sourceUnchanged: true,
  })
})

test('built UMD preserves fractional font size and text line metrics', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const api = (
      window as typeof window & { htmlToImage: typeof import('../../src') }
    ).htmlToImage
    // Browser-native import exercises the checked-in fixture with the actual UMD API.
    const fixtureURL = '/test/browser/fixtures/font-metrics.mjs'
    const { checkFontMetrics } = await import(/* @vite-ignore */ fixtureURL)
    return checkFontMetrics(api)
  })
  expect(result.fontSize).toBe('20.75px')
  expect(result.sourceLines).toBe(2)
  expect(result.sourceUnchanged).toBe(true)
  expect(result.colors).toHaveLength(6)
  result.colors.forEach((color: number[]) =>
    expect(color).toEqual([255, 0, 0, 255]),
  )
})

const resourceCases = [
  {
    name: 'relative clone resources and callback errors',
    method: 'checkRelativeCloneAssets',
    expected: {
      relativeBackground: true,
      insertedImage: true,
      iframeImage: true,
      originalError: true,
      sourceUnchanged: true,
    },
  },
  {
    name: 'resource cache lifetime',
    method: 'checkResourceCache',
    expected: {
      fetches: 3,
      nativeDuplicates: 0,
      disposed: true,
      rendererDisposed: true,
      sourceUnchanged: true,
    },
  },
  {
    name: 'native HTTP cache policy',
    method: 'checkNativeCachePolicy',
    expected: { revalidated: 'blue', requestRevalidated: true },
  },
  {
    name: 'per-URL resource credentials',
    method: 'checkResourceCredentials',
    expected: {
      negativeControl: true,
      privateCredential: true,
      publicCredential: false,
      font: true,
      publicImage: true,
      sourceUnchanged: true,
    },
  },
]

resourceCases.forEach(({ name, method, expected }) => {
  test(`built UMD: ${name}`, async ({ page }) => {
    await page.goto('/test/browser/umd.html')
    await page.addScriptTag({ url: '/dist/html-to-image.js' })
    const result = await page.evaluate(async (methodName) => {
      const moduleURL = '/test/browser/fixtures/resource-policy.mjs'
      const fixture = await import(/* @vite-ignore */ moduleURL)
      const api = (
        window as typeof window & { htmlToImage: typeof import('../../src') }
      ).htmlToImage
      return fixture[methodName](api)
    }, method)
    expect(result).toMatchObject(expected)
  })
})

test('built UMD preserves document-local iframe fonts and reusable CSS', async ({
  page,
}) => {
  await page.goto('/test/browser/umd.html')
  await page.addScriptTag({ url: '/dist/html-to-image.js' })
  const result = await page.evaluate(async () => {
    const api = (
      window as typeof window & { htmlToImage: typeof import('../../src') }
    ).htmlToImage
    const moduleURL = '/test/browser/fixtures/iframe-fonts.mjs'
    const { checkIframeFonts } = await import(/* @vite-ignore */ moduleURL)
    return checkIframeFonts(api)
  })
  expect(result).toEqual(
    [
      'content',
      'frame',
      'ancestor',
      'reused-css',
      'quoted-family',
      'explicit-css',
      'explicit-comment',
      'important-style',
    ].map((mode) => ({
      mode,
      fonts: mode.startsWith('explicit-') ? 0 : mode === 'content' ? 1 : 2,
      pixels: true,
      sourceUnchanged: true,
    })),
  )
})
