import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

declare module 'vitest/browser' {
  interface BrowserCommands {
    screenshotScrollSource: (selector: string) => Promise<string>
  }
}
const moduleURL = '/test/browser/fixtures/fixed-scroll.mjs'
const cases = [
  'transform-block',
  'transform-sticky-first',
  'transform-sticky-last',
  'transform-horizontal',
  'transform-diagonal',
  'filter-block',
  'perspective-block',
  'contain-block',
  'will-change-block',
  'translate-block',
  'transform-mixed',
  'filter-mixed',
  'viewport-block',
  'viewport-mixed',
  'transform-nested',
  'viewport-nested',
  'transform-visible',
  'transform-bottom',
  'transform-auto',
  'transform-right-horizontal',
  'transform-rtl-horizontal',
  'transform-chain',
  'transform-transformed-chain',
  'transform-inner',
  'ancestor-block',
  'relative-block',
  'transform-important',
  'transform-selected-bottom',
  'transform-selected-auto',
  'transform-selected-right-horizontal',
]

cases.forEach((kind) => {
  test(`fixed scroll ${kind} preserves the actual visible source pixels`, async () => {
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
    expect(await fixture.checkFixedScroll(api, kind, readNative)).toBe(true)
  })
})
