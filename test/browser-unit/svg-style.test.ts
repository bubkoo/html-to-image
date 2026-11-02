import { afterEach, expect, test } from 'vitest'
import { getFontEmbedCSS, toImageData, toSvg } from '../../src'

const attached: Element[] = []

function attach<T extends Element>(node: T): T {
  document.body.append(node)
  attached.push(node)
  return node
}

function pixel(image: ImageData, x: number, y: number) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4))
}

afterEach(() => {
  attached.splice(0).forEach((node) => node.remove())
})

test('SVG descendants keep CSS custom properties from a stylesheet', async () => {
  const style = document.createElement('style')
  style.textContent =
    '.svg-var-scene { --shape-fill: rgb(0, 128, 0) }' +
    '.svg-var-scene rect { fill: var(--shape-fill) }'
  document.head.append(style)
  attached.push(style)
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:20px;height:20px'
  root.innerHTML =
    '<svg class="svg-var-scene" width="20" height="20"><rect width="20" height="20"/></svg>'

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 10, 10)).toEqual([0, 128, 0, 255])
  const output = await fetch(await toSvg(root, { skipFonts: true })).then(
    (response) => response.text(),
  )
  expect(output).toContain('fill: rgb(0, 128, 0)')
  expect(root.querySelector('rect')?.getAttribute('style')).toBeNull()
})

test('a repeating gradient keeps its tiles after style serialization', async () => {
  const style = document.createElement('style')
  style.textContent =
    '.repeating-gradient { background-image: repeating-linear-gradient(90deg, red 0px, red 10px, blue 10px, blue 20px) }'
  document.head.append(style)
  attached.push(style)
  const root = attach(document.createElement('div'))
  root.className = 'repeating-gradient'
  root.style.cssText = 'width:40px;height:20px'

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 5, 10)[0]).toBeGreaterThan(250)
  expect(pixel(image, 15, 10)[2]).toBeGreaterThan(250)
  expect(pixel(image, 25, 10)[0]).toBeGreaterThan(250)
  expect(pixel(image, 35, 10)[2]).toBeGreaterThan(250)
  const svg = await fetch(await toSvg(root, { skipFonts: true })).then(
    (response) => response.text(),
  )
  expect(svg).toContain('repeating-linear-gradient')
  expect(root.style.backgroundImage).toBe('')
})

test('an SVG text font-family attribute selects its font face', async () => {
  const style = document.createElement('style')
  style.textContent =
    '@font-face { font-family: SvgAttributeFont; src: url(asset:svg-font.woff2) format("woff2") }'
  document.head.append(style)
  attached.push(style)
  const root = attach(document.createElement('div'))
  root.innerHTML =
    '<svg width="40" height="20"><text x="0" y="16" font-family="SvgAttributeFont">SVG</text></svg>'

  const css = await getFontEmbedCSS(root, {
    resources: {
      resolve: ({ url }) =>
        url === 'asset:svg-font.woff2'
          ? new Blob(['font bytes'], { type: 'font/woff2' })
          : undefined,
    },
  })
  expect(css).toContain('font-family: SvgAttributeFont')
  expect(css).toContain('data:font/woff2;base64,')
  expect(root.querySelector('text')?.getAttribute('font-family')).toBe(
    'SvgAttributeFont',
  )
})
