import './setup'
import { toImageData, toSvg } from '../../src'
import { getSvgDocument } from './helper'

function rgba(image: ImageData, x: number, y: number) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4))
}

describe('scrolled viewport capture', () => {
  const nodes: HTMLElement[] = []

  function scene(axis: 'vertical' | 'horizontal') {
    const root = document.createElement('div')
    root.style.cssText = 'width:40px;height:40px;padding:0;margin:0'
    const panel = document.createElement('div')
    panel.style.cssText =
      'width:40px;height:40px;overflow:auto;padding:0;margin:0'
    if (axis === 'horizontal') panel.style.display = 'flex'
    ;['red', 'green'].forEach((color) => {
      const child = document.createElement('div')
      child.style.cssText = `background:${color};${
        axis === 'horizontal'
          ? 'width:40px;height:40px;flex:none'
          : 'width:40px;height:40px'
      }`
      panel.appendChild(child)
    })
    root.appendChild(panel)
    document.body.appendChild(root)
    nodes.push(root)
    return { root, panel }
  }

  afterEach(() => nodes.splice(0).forEach((node) => node.remove()))
  ;(['vertical', 'horizontal'] as const).forEach((axis) => {
    it(`preserves the ${axis} visible viewport without moving the source`, async () => {
      const { root, panel } = scene(axis)
      if (axis === 'vertical') panel.scrollTop = 40
      else panel.scrollLeft = 40
      const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
      expect(rgba(image, 20, 20)).toEqual([0, 128, 0, 255])
      expect(axis === 'vertical' ? panel.scrollTop : panel.scrollLeft).toBe(40)
    })
  })

  it('leaves mixed direct text and elements untouched when it cannot shift both', async () => {
    const { root, panel } = scene('vertical')
    panel.insertBefore(document.createTextNode('direct text'), panel.firstChild)
    panel.scrollTop = 40
    const svg = await getSvgDocument(
      await toSvg(root, { pixelRatio: 1, skipFonts: true }),
    )
    const copied = svg.querySelector('foreignObject > div > div') as HTMLElement
    expect(copied.style.overflow).not.toBe('hidden')
    expect(
      (copied.firstElementChild as HTMLElement).style.transform,
    ).not.toContain('translate(')
    expect(panel.scrollTop).toBe(40)
  })

  it('preserves an existing child transform while shifting the viewport', async () => {
    const { root, panel } = scene('vertical')
    const visible = panel.lastElementChild as HTMLElement
    visible.style.transform = 'scale(1)'
    panel.scrollTop = 40
    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(rgba(image, 20, 20)).toEqual([0, 128, 0, 255])
    expect(visible.style.transform).toBe('scale(1)')
  })
})
