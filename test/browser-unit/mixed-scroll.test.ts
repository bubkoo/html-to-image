import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

declare module 'vitest/browser' {
  interface BrowserCommands {
    screenshotScrollSource: (selector: string) => Promise<string>
  }
}
const moduleURL = '/test/browser/fixtures/mixed-scroll.mjs'
const cases = [
  'direct',
  'wrapped',
  'padding',
  'negative-margin',
  'structural',
  'layered-structural',
  'before-block',
  'sticky',
  'fixed-inside',
  'nested',
  'rtl',
  'after',
  'inline-elements',
  'iframe',
]

cases.forEach((kind) => {
  test(`mixed scroll ${kind} preserves the actual visible source pixels`, async () => {
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
    expect(await fixture.checkMixedScroll(api, kind, readNative)).toBe(true)
  })
})
