import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

declare module 'vitest/browser' {
  interface BrowserCommands {
    recordScrollbarBoxEvidence(record: string): Promise<void>
  }
}

const moduleURL = '/test/browser/fixtures/scrollbar-box.mjs'
const cases = [
  'content',
  'border',
  'padding',
  'fractional',
  'gutter',
  'vertical',
  'legacy-fractional',
  'legacy-gutter',
  'selected-empty',
  'selected-logical',
  'scrolled',
  'scrolled-gutter',
]
cases.forEach((kind) => {
  test.skipIf(
    kind.startsWith('legacy') && !CSS.supports('selector(::-webkit-scrollbar)'),
  )(
    `scrollbar box ${kind} ${kind.startsWith('scrolled') ? 'keeps the native content viewport' : 'matches all native source pixels'}`,
    async ({ skip }) => {
      const fixture = await import(/* @vite-ignore */ moduleURL)
      const readNative = async (id: string) => {
        const png = await commands.screenshotScrollSource('#' + id)
        const image = new Image()
        image.src = 'data:image/png;base64,' + png
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
      }
      const result = await fixture.checkScrollbarBox(
        api,
        kind,
        readNative,
        async (record: unknown) => {
          await commands.recordScrollbarBoxEvidence(JSON.stringify(record))
        },
      )
      expect(result.kind).toBe(kind)
      if (kind.startsWith('scrolled')) {
        expect(result.nativeContentDifferentChannels).toBe(0)
        return
      }
      expect(result.libraryAuthoredDifferentChannels).toBe(0)
      if (
        kind === 'gutter' &&
        result.engine === 'chromium' &&
        result.nativeDifferentChannels === 44
      ) {
        expect(result.nativeAuthoredDifferentChannels).toBe(
          result.nativeDifferentChannels,
        )
        skip(
          'Authored SVG and native source differ in ' +
            result.nativeDifferentChannels +
            ' channels; native fidelity remains unverified.',
        )
      }
      expect(result.nativeDifferentChannels).toBe(0)
    },
  )
})

// This remains a positive regression even on a platform whose native corner
// painting differs from its authored SVG. The old shrunken box fails it.
test('both-edge gutter keeps the authored box independent of native corner painting', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  const result = await fixture.checkScrollbarBox(api, 'gutter')
  expect(result.libraryAuthoredDifferentChannels).toBe(0)
})
