import './setup'
import { toImageData, toSvg } from '../../src'
import { getSvgDocument } from './helper'

describe('work with canvas element', () => {
  it('preserves intrinsic canvas colors at a different CSS size', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    canvas.style.cssText = 'display:block;width:32px;height:16px'
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 4, 8)
    ctx.fillStyle = 'blue'
    ctx.fillRect(4, 0, 4, 8)
    document.body.appendChild(canvas)

    try {
      const svg = await getSvgDocument(await toSvg(canvas, { skipFonts: true }))
      expect(svg.querySelector('img[src^="data:image/png"]')).not.toBeNull()
      const image = await toImageData(canvas, { pixelRatio: 1, skipFonts: true })
      const pixel = (x: number) =>
        Array.from(image.data.slice(4 * (8 * image.width + x), 4 * (8 * image.width + x) + 4))
      expect([image.width, image.height]).toEqual([32, 16])
      expect(pixel(8)).toEqual([255, 0, 0, 255])
      expect(pixel(24)).toEqual([0, 0, 255, 255])
    } finally {
      canvas.remove()
    }
  })
})
