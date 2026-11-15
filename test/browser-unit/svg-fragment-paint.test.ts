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
  'nested-page',
  'nested-missing',
].flatMap((name) => [
  { name, paint: 'gradient', shadow: false },
  { name, paint: 'pattern', shadow: false },
  { name, paint: 'pattern', shadow: true },
])
cases.push(
  ...['graph-page', 'graph-missing'].flatMap((name) => [
    { name, paint: 'pattern', shadow: false },
    { name, paint: 'pattern', shadow: true },
  ]),
)
const resolvedCases = [
  { name: 'inline-page', paint: 'pattern', shadow: false, resolved: true },
]
test.each([...cases, ...resolvedCases])(
  '$paint $name shadow=$shadow resolved=$resolved preserves native fragment scope',
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

test.each(['removed', 'kept', 'local'])(
  'sibling SVG tree scopes %s remain distinct',
  async (mode) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkSVGFragmentSiblingScopes(
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
    expect(result.nativePixelMatch).toBe(true)
  },
)
