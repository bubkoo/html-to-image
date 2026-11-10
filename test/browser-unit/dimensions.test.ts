import { afterEach, expect, test } from 'vitest'
import { createRenderer, toCanvas } from '../../src'

const nodes: HTMLElement[] = []

function scene() {
  const node = document.createElement('div')
  node.style.cssText = 'width:16px;height:12px;background:red'
  document.body.append(node)
  nodes.push(node)
  return node
}

afterEach(() => nodes.splice(0).forEach((node) => node.remove()))

test.each([1, 2])(
  'PR #409 keeps CSS dimensions separate from the %ix pixel buffer',
  async (pixelRatio) => {
    const node = scene()
    const canvas = await toCanvas(node, {
      width: 24,
      height: 18,
      canvasWidth: 40,
      canvasHeight: 30,
      pixelRatio,
      skipFonts: true,
    })
    expect([canvas.style.width, canvas.style.height]).toEqual(['40px', '30px'])
    expect([canvas.width, canvas.height]).toEqual([
      40 * pixelRatio,
      30 * pixelRatio,
    ])
    expect(
      Array.from(
        canvas
          .getContext('2d')!
          .getImageData(canvas.width - 2, canvas.height - 2, 1, 1).data,
      ),
    ).toEqual([255, 0, 0, 255])
    expect([node.style.width, node.style.height]).toEqual(['16px', '12px'])
  },
)

test.each(['width', 'height'] as const)(
  'an explicit zero %s remains a zero-sized SVG and rejects rasterization',
  async (dimension) => {
    const node = scene()
    const renderer = createRenderer({ skipFonts: true, pixelRatio: 1 })
    try {
      const capture = await renderer.capture(node, { [dimension]: 0 })
      expect(capture[dimension]).toBe(0)
      const svg = new DOMParser().parseFromString(
        decodeURIComponent((await capture.toSvg()).split(',')[1]),
        'image/svg+xml',
      )
      expect(svg.documentElement.getAttribute(dimension)).toBe('0')
      const copy = svg.querySelector('foreignObject > div') as HTMLElement
      expect(copy.style[dimension]).toBe('0px')
      await expect(capture.toCanvas()).rejects.toThrow(/zero-sized/)
      expect([node.style.width, node.style.height]).toEqual(['16px', '12px'])
    } finally {
      renderer.dispose()
    }
  },
)

test.each(['width', 'height'] as const)(
  'a NaN %s fails dimension validation before clone callbacks run',
  async (dimension) => {
    const renderer = createRenderer({ skipFonts: true })
    let clones = 0
    try {
      await expect(
        renderer.capture(scene(), {
          [dimension]: NaN,
          onClone: () => {
            clones += 1
          },
        }),
      ).rejects.toThrow(/dimensions must be finite/)
      expect(clones).toBe(0)
    } finally {
      renderer.dispose()
    }
  },
)
