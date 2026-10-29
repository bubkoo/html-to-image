import { afterEach, expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'

const nodes: Element[] = []

function attach<T extends HTMLElement>(node: T): T {
  document.body.append(node)
  nodes.push(node)
  return node
}

function pixel(image: ImageData, x: number, y: number) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4))
}

afterEach(() => {
  nodes.splice(0).forEach((node) => node.remove())
})

test('a nested scroller exports its visible viewport without moving the source', async () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:40px;height:40px;padding:0;margin:0'
  const panel = document.createElement('div')
  panel.style.cssText =
    'width:40px;height:40px;overflow:auto;padding:0;margin:0'
  panel.innerHTML =
    '<div style="height:40px;background:red"></div>' +
    '<div style="height:40px;background:green"></div>'
  root.append(panel)
  attach(root)
  panel.scrollTop = 40

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 20, 20)).toEqual([0, 128, 0, 255])
  expect(panel.scrollTop).toBe(40)
})

test('two nested scrollers preserve their combined visible viewport', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:40px;padding:0;margin:0'
  const outer = document.createElement('div')
  outer.style.cssText = 'width:40px;height:40px;overflow:auto'
  const top = document.createElement('div')
  top.style.cssText = 'width:40px;height:40px;background:red'
  const inner = document.createElement('div')
  inner.style.cssText = 'width:40px;height:40px;overflow:auto'
  const blue = document.createElement('div')
  blue.style.cssText = 'width:40px;height:40px;background:blue'
  const green = document.createElement('div')
  green.style.cssText = 'width:40px;height:40px;background:green'
  inner.append(blue, green)
  outer.append(top, inner)
  root.append(outer)
  outer.scrollTop = 40
  inner.scrollTop = 40

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 20, 20)).toEqual([0, 128, 0, 255])
  expect([outer.scrollTop, inner.scrollTop]).toEqual([40, 40])
})

test('a sticky header stays visible while scrolled content advances', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:40px;padding:0;margin:0'
  const panel = document.createElement('div')
  panel.style.cssText = 'width:40px;height:40px;overflow:auto'
  const header = document.createElement('div')
  header.style.cssText =
    'position:sticky;top:0;width:40px;height:10px;background:red'
  const first = document.createElement('div')
  first.style.cssText = 'width:40px;height:40px;background:blue'
  const second = document.createElement('div')
  second.style.cssText = 'width:40px;height:40px;background:green'
  panel.append(header, first, second)
  root.append(panel)
  panel.scrollTop = 40
  expect(Math.round(header.getBoundingClientRect().top)).toBe(
    Math.round(panel.getBoundingClientRect().top),
  )

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 20, 5)).toEqual([255, 0, 0, 255])
  expect(pixel(image, 20, 20)).toEqual([0, 128, 0, 255])
  expect(panel.scrollTop).toBe(40)
})

test('SVG foreignObject children are individually filterable', async () => {
  const root = attach(document.createElement('div'))
  root.innerHTML =
    '<svg width="16" height="12">' +
    '<foreignObject class="keep" width="8" height="12"><div xmlns="http://www.w3.org/1999/xhtml">visible</div></foreignObject>' +
    '<foreignObject class="omit" x="8" width="8" height="12"><div xmlns="http://www.w3.org/1999/xhtml">secret</div></foreignObject>' +
    '</svg>'

  const dataURL = await toSvg(root, {
    skipFonts: true,
    filter: (node) => !node.classList?.contains('omit'),
  })
  const source = await fetch(dataURL).then((response) => response.text())
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml')
  expect(svg.querySelectorAll('foreignObject.keep')).toHaveLength(1)
  expect(svg.querySelector('foreignObject.omit')).toBeNull()
  expect(svg.documentElement.textContent).toContain('visible')
  expect(svg.documentElement.textContent).not.toContain('secret')
})

test('a custom element with an open shadow root renders its content', async () => {
  const tag = 'html-to-image-browser-shadow'
  if (!customElements.get(tag)) {
    customElements.define(
      tag,
      class extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ mode: 'open' })
        }
      },
    )
  }
  const host = attach(document.createElement(tag))
  host.style.cssText = 'display:block;width:40px;height:20px'
  host.shadowRoot!.innerHTML =
    '<div style="width:40px;height:20px;background:rgb(0,128,0)">shadow content</div>'

  const image = await toImageData(host, { pixelRatio: 1, skipFonts: true })
  expect([image.width, image.height]).toEqual([40, 20])
  expect(pixel(image, 38, 18)).toEqual([0, 128, 0, 255])
  expect(host.shadowRoot!.textContent).toContain('shadow content')
})
