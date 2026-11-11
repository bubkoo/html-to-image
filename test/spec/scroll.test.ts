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

  it('scrolls a container-fixed child while keeping later sticky rows visible', async () => {
    const { root, panel } = scene('vertical')
    panel.style.transform = 'translate(0,0)'
    const spacer = panel.firstElementChild as HTMLElement
    spacer.style.background = 'blue'
    const fixed = document.createElement('div')
    fixed.style.cssText =
      'position:fixed;top:0;left:0;width:40px;height:4px;background:blue'
    const hidden = document.createElement('div')
    hidden.style.display = 'none'
    const header = document.createElement('div')
    header.style.cssText =
      'position:sticky;top:8px;width:40px;height:10px;background:red'
    panel.prepend(hidden, fixed)
    panel.insertBefore(header, panel.lastElementChild)
    ;(panel.lastElementChild as HTMLElement).style.height = '80px'
    panel.scrollTop = 50

    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(rgba(image, 20, 2)).toEqual([0, 128, 0, 255])
    expect(rgba(image, 20, 13)).toEqual([255, 0, 0, 255])
    expect(rgba(image, 20, 25)).toEqual([0, 128, 0, 255])
    expect(panel.scrollTop).toBe(50)
  })

  it('does not fail when a scroller contains only a hidden sticky child', async () => {
    const root = document.createElement('div')
    root.style.cssText = 'width:40px;height:40px;background:white'
    const style = document.createElement('style')
    style.textContent =
      '.hidden-sticky-scroller::after{content:"";display:block;height:100px}'
    const panel = document.createElement('div')
    panel.className = 'hidden-sticky-scroller'
    panel.style.cssText = 'width:40px;height:40px;overflow:auto'
    const hidden = document.createElement('div')
    hidden.style.cssText = 'display:none;position:sticky;top:0'
    panel.append(hidden)
    root.append(style, panel)
    document.body.append(root)
    nodes.push(root)
    panel.scrollTop = 50

    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(rgba(image, 20, 20)).toEqual([255, 255, 255, 255])
    expect(panel.scrollTop).toBe(50)
  })

  it('keeps an absolutely positioned sticky-scroll layout outside the margin path', async () => {
    const { root, panel } = scene('vertical')
    const unusual = document.createElement('span')
    unusual.style.position = 'absolute'
    unusual.textContent = 'separate layout'
    const header = document.createElement('div')
    header.style.cssText =
      'position:sticky;top:8px;width:40px;height:10px;background:red'
    panel.insertBefore(unusual, panel.lastElementChild)
    panel.insertBefore(header, panel.lastElementChild)
    panel.scrollTop = 50
    const svg = await getSvgDocument(
      await toSvg(root, { pixelRatio: 1, skipFonts: true }),
    )
    const copied = svg.querySelector('foreignObject > div > div') as HTMLElement
    expect(copied.style.overflow).not.toBe('hidden')
    expect(
      (copied.firstElementChild as HTMLElement).style.marginTop,
    ).not.toContain('calc(')
    expect(panel.scrollTop).toBe(50)
  })

  it('preserves inline flow together with a later sticky header', async () => {
    const { root, panel } = scene('vertical')
    const inline = document.createElement('span')
    inline.textContent = 'separate layout'
    const header = document.createElement('div')
    header.style.cssText =
      'position:sticky;top:8px;width:40px;height:10px;background:red'
    const visible = panel.lastElementChild as HTMLElement
    visible.style.height = '80px'
    panel.insertBefore(inline, visible)
    panel.insertBefore(header, visible)
    panel.scrollTop =
      visible.getBoundingClientRect().top -
      panel.getBoundingClientRect().top -
      10
    const scroll = panel.scrollTop
    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(rgba(image, 20, 13)).toEqual([255, 0, 0, 255])
    expect(rgba(image, 20, 25)).toEqual([0, 128, 0, 255])
    expect(panel.scrollTop).toBe(scroll)
  })

  it('preserves direct text and element flow at the visible scroll position', async () => {
    const { root, panel } = scene('vertical')
    panel.insertBefore(document.createTextNode('direct text'), panel.firstChild)
    const visible = panel.lastElementChild as HTMLElement
    panel.scrollTop =
      visible.getBoundingClientRect().top - panel.getBoundingClientRect().top
    const scroll = panel.scrollTop
    const source = panel.outerHTML
    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(rgba(image, 20, 20)).toEqual([0, 128, 0, 255])
    expect(panel.outerHTML).toBe(source)
    expect(panel.scrollTop).toBe(scroll)
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
