import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/scrollbar-style-resources.mjs'
const cases = [
  'cors-opaque',
  'cors-readable',
  'readable-mutation',
  'resolver-opaque',
  'deny-diagnostic',
  'resolver-reject',
  'cancel-pending',
  'cancel-decode',
  'shared-url',
  'inactive-import',
  'cyclic-import',
  'unrelated-relative',
  'media-page-viewport',
  'nesting-relative',
  'stable-no-overflow',
  'x-overflow-only',
  'y-overflow-only',
  'encoding-parent-header-1252',
  'encoding-parent-charset-1252',
  'encoding-readable-chain',
  'encoding-child-header-1252',
  'encoding-child-charset-1252',
  'encoding-child-utf8-override',
  'encoding-child-bom-override',
  'encoding-parent-utf8-negative',
  'declarations-direct-tail',
  'declarations-active-media',
  'declarations-active-supports',
  'declarations-nested-tail',
  'declarations-ordinary-tail',
  'declarations-inactive-tail',
  'warning-callback',
]

cases.forEach((kind) => {
  test.skipIf(!CSS.supports('selector(::-webkit-scrollbar)'))(
    `native scrollbar stylesheet resources: ${kind}`,
    async ({ annotate }) => {
      const fixture = await import(/* @vite-ignore */ moduleURL)
      const readNative = async (id: string) => {
        const png = await commands.screenshotScrollSource('#' + id)
        const image = new Image()
        image.src = 'data:image/png;base64,' + png
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, canvas.width, canvas.height)
      }
      const result = await fixture.checkScrollbarStyleResources(
        api,
        kind,
        readNative,
        async (record: unknown) => {
          await commands.recordScrollbarBoxEvidence(JSON.stringify(record))
        },
      )
      expect(result.sourceUnchanged).toBe(true)
      if (kind === 'stable-no-overflow') {
        await annotate(
          'Observed native empty scrollbar gutter',
          'native-control',
          {
            contentType: 'application/json',
            body: JSON.stringify(
              {
                browser: server.browser,
                hasNativeReserve: result.hasNativeReserve,
                metrics: result.metrics,
              },
              null,
              2,
            ),
            bodyEncoding: 'utf-8',
          },
        )
        if (server.browser === 'chromium')
          expect(result.hasNativeReserve).toBe(true)
      }
    },
  )
})
