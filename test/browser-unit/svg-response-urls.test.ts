import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import * as api from '../../src'
const moduleURL = '/test/browser/fixtures/svg-response-urls.mjs'
test.each([false, true])(
  'SVG file CSS uses final response bases with cacheBust=%s',
  async (cacheBust) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkSVGResponseURLs(
      api,
      cacheBust,
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
    expect(result.fullPixelMatch).toBe(true)
    expect(result.sourceUnchanged).toBe(true)
  },
)
