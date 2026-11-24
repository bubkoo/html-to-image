import { expect, test } from 'vitest'
import { canvasToBlob, checkCanvasDimensions } from '../../src/util'

test.each([
  { width: 40000, height: 20000, expected: [16384, 8192] },
  { width: 20000, height: 40000, expected: [8192, 16384] },
  { width: 32768, height: 32768, expected: [16384, 16384] },
  { width: 32768, height: 8192, expected: [16384, 4096] },
  { width: 8192, height: 32768, expected: [4096, 16384] },
  { width: 16384, height: 8192, expected: [16384, 8192] },
  { width: 16385, height: 8193, expected: [16384, 8192] },
])(
  'canvas auto-fit preserves the aspect of $width by $height without changing CSS size',
  ({ width, height, expected }) => {
    // Exercise native dimension setters without requesting a large bitmap.
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'width:73px;height:41px'
    try {
      canvas.width = width
      canvas.height = height
      checkCanvasDimensions(canvas)
      expect([canvas.width, canvas.height]).toEqual(expected)
      expect([canvas.style.width, canvas.style.height]).toEqual([
        '73px',
        '41px',
      ])
    } finally {
      canvas.width = 0
      canvas.height = 0
    }
  },
)

test.each([
  {
    label: 'default options',
    options: {},
    expectedArgs: [undefined, undefined],
  },
  {
    label: 'explicit PNG and zero quality',
    options: { type: 'image/png', quality: 0 },
    expectedArgs: ['image/png', 0],
  },
])(
  'a canvas without native toBlob preserves PNG pixels with $label',
  async ({ options, expectedArgs }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 1
    const context = canvas.getContext('2d')!
    context.fillStyle = 'red'
    context.fillRect(0, 0, 1, 1)
    context.fillStyle = 'blue'
    context.fillRect(1, 0, 1, 1)
    const encode = canvas.toDataURL
    const calls: unknown[][] = []
    Object.defineProperty(canvas, 'toBlob', { value: undefined })
    Object.defineProperty(canvas, 'toDataURL', {
      value(this: HTMLCanvasElement, type?: string, quality?: unknown) {
        expect(this).toBe(canvas)
        calls.push([type, quality])
        return Reflect.apply(encode, this, [type, quality])
      },
    })
    let bitmap: ImageBitmap | undefined
    try {
      const blob = await canvasToBlob(canvas, options)
      expect(blob).not.toBeNull()
      expect(blob!.type).toBe('image/png')
      expect(calls).toEqual([expectedArgs])
      bitmap = await createImageBitmap(blob!)
      expect([bitmap.width, bitmap.height]).toEqual([2, 1])
      context.clearRect(0, 0, 2, 1)
      context.drawImage(bitmap, 0, 0)
      expect(Array.from(context.getImageData(0, 0, 2, 1).data)).toEqual([
        255, 0, 0, 255, 0, 0, 255, 255,
      ])
    } finally {
      bitmap?.close()
      canvas.width = 0
      canvas.height = 0
    }
  },
)
