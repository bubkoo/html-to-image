import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import * as api from '../../src'
const moduleURL = '/test/browser/fixtures/svg-fragment-paint.mjs'
const cases = [
  'attribute-page',
  'attribute-missing',
  'inline-page',
  'inline-missing',
  'inner-page',
  'inner-missing',
].flatMap((name) => [
  { name, paint: 'gradient', shadow: false },
  { name, paint: 'pattern', shadow: false },
  { name, paint: 'pattern', shadow: true },
])
test.each(cases)(
  '$paint $name shadow=$shadow preserves native fragment scope',
  async (mode) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkSVGFragmentPaint(
      api,
      mode,
      async (id: string) => {
        const png = await commands.screenshotScrollSource('#' + id),
          image = new Image()
        image.src = 'data:image/png;base64,' + png
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        canvas.getContext('2d')!.drawImage(image, 0, 0)
        return canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height)
      },
      (record: object) =>
        commands.recordScrollbarBoxEvidence(
          JSON.stringify({ ...record, engine: server.browser }),
        ),
    )
    expect(result.sourceUnchanged).toBe(true)
    expect(result.imagePixelMatch).toBe(true)
    expect(result.nativeSourceMatchesReference).toBe(true)
    if (mode.paint === 'pattern') expect(result.nativePixelMatch).toBe(true)
  },
)
