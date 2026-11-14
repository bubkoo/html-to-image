import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/svg-font-units.mjs'

test.each(['loaded', 'large', 'system'])(
  'external SVG %s font units match an independent image reference',
  async (mode) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkSVGFontUnits(
      api,
      mode,
      async (id: string) => {
        const data = await commands.screenshotScrollSource('#' + id)
        const image = new Image()
        image.src = 'data:image/png;base64,' + data
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
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
    expect(result.fullImageReferenceMatch).toBe(true)
    expect(result.sourceUnchanged).toBe(true)
    expect(result.nativeDifferentChannels).toBe(
      result.referenceNativeDifferentChannels,
    )
    expect(
      result.requests.filter(
        (request: { kind: string }) => request.kind === 'font',
      ),
    ).toHaveLength(mode === 'system' ? 0 : 1)
  },
)

test.each([false, true])(
  'explicit SVG metric font CSS takes precedence with skipFonts=%s',
  async (skipFonts) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkSVGFontUnits(
      api,
      'loaded',
      undefined,
      undefined,
      (fontEmbedCSS: string) => ({ fontEmbedCSS, skipFonts }),
    )
    expect(result.fullImageReferenceMatch).toBe(true)
    expect(result.sourceUnchanged).toBe(true)
    expect(
      result.requests.filter(
        (request: { kind: string }) => request.kind === 'font',
      ),
    ).toHaveLength(0)
  },
)
