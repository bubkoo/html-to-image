import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/native-scroll.mjs'
const cases = [
  'direct-text',
  'visible-text',
  'fractional',
  'positioned-padding',
  'visible-before',
  'paragraph',
  'inline',
  'float',
  'rtl',
  'padding',
  'padding-shadow',
  'nested',
  'sticky',
  'structural',
  'latent-snap-target',
  'latent-snap-pseudo-target',
  'snap-target',
  'snap-pseudo-target',
]

cases.forEach((kind) => {
  test(`native scroll ${kind} ${kind === 'visible-text' ? 'preserves native glyph placement' : 'matches source pixels'}`, async () => {
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
    const result = await fixture.checkNativeScroll(api, kind, readNative)
    expect(result.sourceUnchanged).toBe(true)
    expect(result.fullPixelMatch).toBe(true)
  })
})
