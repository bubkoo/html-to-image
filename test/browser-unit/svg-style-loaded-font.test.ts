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
    const renderer = createRenderer({ skipFonts, pixelRatio: 1 })
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
    } finally {
      renderer.dispose()
      root.remove()
      sheet.remove()
    }
  },
)
