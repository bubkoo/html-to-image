import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/native-scrollbars.mjs'
const cases = [
  'legacy-zero',
  'legacy-scrolled',
  'standard-zero',
  'standard-scrolled',
]
cases.forEach((kind) => {
  test.skipIf(
    kind.startsWith('legacy') && !CSS.supports('selector(::-webkit-scrollbar)'),
  )(`native scrollbar ${kind} matches the actual source`, async () => {
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
    expect(
      (await fixture.checkNativeScrollbars(api, kind, readNative)).kind,
    ).toBe(kind)
  })
})
