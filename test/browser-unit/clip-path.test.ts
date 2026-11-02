import { afterEach, expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'

const svgNamespace = 'http://www.w3.org/2000/svg'
const nodes: HTMLElement[] = []

afterEach(() => {
  nodes.splice(0).forEach((node) => node.remove())
})

function fixture(reference: string, useStyle: boolean) {
  const root = document.createElement('div')
  root.style.cssText = 'width:40px;height:40px;background:green'
  const svg = document.createElementNS(svgNamespace, 'svg')
  svg.setAttribute('width', '40')
  svg.setAttribute('height', '40')
  const defs = document.createElementNS(svgNamespace, 'defs')
  const clip = document.createElementNS(svgNamespace, 'clipPath')
  clip.id = 'capture-clip'
  const region = document.createElementNS(svgNamespace, 'rect')
  region.setAttribute('width', '20')
  region.setAttribute('height', '40')
  clip.append(region)
  defs.append(clip)
  const color = document.createElementNS(svgNamespace, 'rect')
  color.setAttribute('data-test', 'color')
  color.setAttribute('width', '40')
  color.setAttribute('height', '40')
  color.setAttribute('fill', 'red')
  if (useStyle) color.style.setProperty('clip-path', `url("${reference}")`)
  else color.setAttribute('clip-path', `url("${reference}")`)
  svg.append(defs, color)
  root.append(svg)
  document.body.append(root)
  nodes.push(root)
  return { root, color }
}

function pixel(image: ImageData, x: number, y: number) {
  return Array.from(
    image.data.slice(4 * (y * image.width + x), 4 * (y * image.width + x + 1)),
  )
}

test.each(['attribute', 'inline style'])(
  'normalizes an absolute same-document clip path in an SVG %s',
  async (source) => {
    const documentUrl = new URL(document.URL)
    documentUrl.hash = 'capture-clip'
    const { root, color } = fixture(documentUrl.href, source === 'inline style')
    const originalValue =
      source === 'inline style'
        ? color.style.getPropertyValue('clip-path')
        : color.getAttribute('clip-path')

    const dataURL = await toSvg(root, { skipFonts: true })
    const output = await fetch(dataURL).then((response) => response.text())
    const copy = new DOMParser()
      .parseFromString(output, 'image/svg+xml')
      .querySelector('[data-test="color"]')!
    if (source === 'inline style') {
      expect(copy.getAttribute('style')).toMatch(
        /url\(["']?#capture-clip["']?\)/,
      )
    } else {
      expect(copy.getAttribute('clip-path')).toBe('url(#capture-clip)')
    }
    expect(copy.getAttribute('style')).not.toContain(documentUrl.href)
    expect(
      source === 'inline style'
        ? color.style.getPropertyValue('clip-path')
        : color.getAttribute('clip-path'),
    ).toBe(originalValue)

    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(pixel(image, 10, 20)).toEqual([255, 0, 0, 255])
    expect(pixel(image, 30, 20)).toEqual([0, 128, 0, 255])
  },
)

test('normalizes a root-relative same-document clip path', async () => {
  const documentUrl = new URL(document.URL)
  const reference = `${documentUrl.pathname}${documentUrl.search}#capture-clip`
  const { root } = fixture(reference, false)
  const dataURL = await toSvg(root, { skipFonts: true })
  const output = await fetch(dataURL).then((response) => response.text())
  const copy = new DOMParser()
    .parseFromString(output, 'image/svg+xml')
    .querySelector('[data-test="color"]')!
  expect(copy.getAttribute('clip-path')).toBe('url(#capture-clip)')
})

test('normalizes a computed clip path from a stylesheet', async () => {
  const documentUrl = new URL(document.URL)
  documentUrl.hash = 'capture-clip'
  const { root, color } = fixture('', false)
  color.removeAttribute('clip-path')
  color.classList.add('styled-clip')
  const sheet = document.createElement('style')
  sheet.textContent = `.styled-clip { clip-path: url("${documentUrl.href}") }`
  document.head.append(sheet)
  try {
    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    expect(pixel(image, 10, 20)).toEqual([255, 0, 0, 255])
    expect(pixel(image, 30, 20)).toEqual([0, 128, 0, 255])
  } finally {
    sheet.remove()
  }
})

test.each([
  'https://example.invalid/external.svg#capture-clip',
  `${new URL(document.URL).origin}/another-page#capture-clip`,
  `${new URL(document.URL).origin}${
    new URL(document.URL).pathname
  }?different-query#capture-clip`,
])(
  'keeps a different-document clip-path reference unchanged: %s',
  async (reference) => {
    const { root } = fixture(reference, false)
    const dataURL = await toSvg(root, { skipFonts: true })
    const output = await fetch(dataURL).then((response) => response.text())
    const copy = new DOMParser()
      .parseFromString(output, 'image/svg+xml')
      .querySelector('[data-test="color"]')!
    expect(copy.getAttribute('clip-path')).toBe(`url("${reference}")`)
  },
)
