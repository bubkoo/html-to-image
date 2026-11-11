import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

declare module 'vitest/browser' {
  interface BrowserCommands {
    screenshotScrollSource: (selector: string) => Promise<string>
  }
}

const moduleURL = '/test/browser/fixtures/horizontal-fixed-scroll.mjs'
const cases = [
  'local-nested',
  'local-deep',
  'viewport-nested',
  'ancestor-nested',
  'wrapper-nested',
  'local-rtl',
  'local-reverse',
  'local-relative',
  'local-absolute',
  'local-margin',
  'local-important',
  'local-selected',
  'local-diagonal',
  'viewport-diagonal',
  'ancestor-diagonal',
  'wrapper-diagonal',
  'local-diagonal-deep',
  'local-diagonal-absolute',
  'local-diagonal-important',
  'local-diagonal-selected',
  'local-diagonal-rtl',
  'local-column',
  'local-column-reverse',
  'local-column-diagonal',
  'local-column-diagonal-rtl',
  'local-wrap',
  'local-wrap-reverse',
  'local-center-diagonal',
  'local-baseline-diagonal',
  'local-absolute-only',
  'local-absolute-only-diagonal',
  'local-relative-absolute-only-diagonal',
  'ancestor-absolute-only-diagonal',
  'wrapper-absolute-only-diagonal',
]

cases.forEach((kind) => {
  test(`flex scroll ${kind} matches the actual source pixels`, async () => {
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
    expect(await fixture.checkHorizontalFixed(api, kind, readNative)).toBe(true)
  })
})
