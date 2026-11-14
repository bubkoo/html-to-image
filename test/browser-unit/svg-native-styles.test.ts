import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

const cases = [
  'class',
  'cascade',
  'inheritance',
  'dependencies',
  'plain',
  'main-tag',
  'host-contexts',
  'host-inherit-no-page',
  'host-vars',
  'main-id',
  'page-outside',
  'page-ancestor',
  'page-structural',
  'whole-style',
  'nested-style',
  'nested-style-plain',
  'nested-simple',
  'nested-external',
  'late-page-css',
  'unreadable-sheet',
  'page-paint',
  'file-media',
  'file-media-active',
  'file-type',
]
const moduleURL = '/test/browser/fixtures/svg-native-styles.mjs'

test.each(cases)(
  'external SVG %s preserves current native-page pixels',
  async (name) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkSVGNativeStyles(
      api,
      name,
      async (id: string) => {
        const png = await commands.screenshotScrollSource('#' + id)
        const image = new Image()
        image.src = 'data:image/png;base64,' + png
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        canvas.getContext('2d')!.drawImage(image, 0, 0)
        return canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height)
      },
      async (record: unknown) =>
        commands.recordScrollbarBoxEvidence(JSON.stringify(record)),
    )
    expect(result.fullPixelMatch).toBe(true)
    expect(result.sourceUnchanged).toBe(true)
  },
)
