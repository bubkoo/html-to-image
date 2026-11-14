import { expect, test } from 'vitest'
import { createRenderer } from '../../src'

test.each([true, false])(
  'a loaded page font permits SVG evaluation with skipFonts=%s',
  async (skipFonts) => {
    const sheet = document.createElement('style')
    sheet.textContent =
      '@font-face{font-family:"External SVG font control";src:url("/test/browser/fixtures/font-metrics.ttf")}'
    document.head.append(sheet)
    const faces = await document.fonts.load('20px "External SVG font control"')
    expect(faces.length).toBe(1)
    expect(faces[0].status).toBe('loaded')
    const root = document.createElement('div')
    root.style.cssText =
      'width:20px;height:20px;font-family:"External SVG font control"'
    root.innerHTML =
      '<svg width="20" height="20"><use href="/test/browser/fixtures/svg-styles/class.svg#icon" width="20" height="20" fill="green"/></svg>'
    document.body.append(root)
    const fontRequests: string[] = []
    const renderer = createRenderer({
      skipFonts,
      pixelRatio: 1,
      resources: {
        resolve: ({ url, kind }) => {
          if (kind === 'font') fontRequests.push(url)
          return undefined
        },
      },
    })
    try {
      const capture = await renderer.capture(root)
      expect(
        capture.diagnostics.filter(
          (item) => item.resource === 'external-svg-style-probe',
        ),
      ).toHaveLength(0)
      const image = await capture.toImageData()
      capture.dispose()
      expect(
        Array.from(
          image.data.slice((10 * 20 + 10) * 4, (10 * 20 + 10) * 4 + 4),
        ),
      ).toEqual([0, 128, 0, 255])
      expect(fontRequests).toHaveLength(skipFonts ? 0 : 1)
    } finally {
      renderer.dispose()
      root.remove()
      sheet.remove()
    }
  },
)

test.each(['invalid', 'reject'])(
  'SVG metric font %s keeps diagnostics and resolver error ownership',
  async (mode) => {
    const sheet = document.createElement('style')
    sheet.textContent =
      '@font-face{font-family:"SVG Metric Failure";src:url("/test/browser/fixtures/font-metrics.ttf")}'
    document.head.append(sheet)
    await document.fonts.load('20px "SVG Metric Failure"', 'A')
    const root = document.createElement('div')
    root.style.cssText =
      'width:20px;height:30px;font-size:20px;font-family:"SVG Metric Failure"'
    root.innerHTML =
      '<svg width="20" height="30"><use href="/test/browser/fixtures/svg-styles/font-units.svg#icon" width="20" height="30"/></svg>'
    document.body.append(root)
    const source = root.outerHTML
    const frames = Array.from(document.querySelectorAll('iframe'))
    const reason = new Error('owned metric font resolver failure')
    const renderer = createRenderer({
      resources: {
        resolve: ({ kind }) => {
          if (kind !== 'font') return undefined
          if (mode === 'reject') throw reason
          return new Blob(['invalid font bytes'], { type: 'font/ttf' })
        },
      },
    })
    try {
      if (mode === 'reject') {
        await expect(renderer.capture(root)).rejects.toMatchObject({
          cause: reason,
        })
      } else {
        const capture = await renderer.capture(root)
        expect(decodeURIComponent(await capture.toSvg())).toContain('<rect')
        expect(
          capture.diagnostics.some(
            (item) => item.resource === 'external-svg-font-metrics',
          ),
        ).toBe(true)
        capture.dispose()
      }
      expect(root.outerHTML).toBe(source)
      expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
    } finally {
      renderer.dispose()
      root.remove()
      sheet.remove()
    }
  },
)
