import { afterEach, expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'
import type { Options } from '../../src'

const nodes: Element[] = []

function attach<T extends Element>(node: T) {
  document.body.append(node)
  nodes.push(node)
  return node
}

afterEach(() => nodes.splice(0).forEach((node) => node.remove()))

function pixel(image: ImageData, x: number, y: number) {
  const offset = 4 * (Math.floor(y) * image.width + Math.floor(x))
  return Array.from(image.data.slice(offset, offset + 4))
}

async function metricsScene(kerning: string, fontSize = 20.75) {
  const sheet = document.createElement('style')
  sheet.textContent =
    '@font-face { font-family: "Capture Metrics"; src: url("/test/browser/fixtures/font-metrics.ttf") format("truetype"); }'
  attach(sheet)
  await document.fonts.load('20.75px "Capture Metrics"')
  const root = attach(document.createElement('div'))
  root.style.cssText = `width:max-content;height:56px;line-height:28px;font-size:${fontSize}px;font-family:"Capture Metrics";font-kerning:${kerning};background:white;color:red;white-space:nowrap`
  root.textContent = 'AAAAA BBBBB'
  return root
}

test.each(['default', 'selected', 'per-node'])(
  'preserves fractional font sizes with %s style selection',
  async (mode) => {
    const root = attach(document.createElement('div'))
    root.style.cssText = 'width:100px;height:40px;font-size:20.75px'
    root.textContent = 'fractional'
    const options: Options = { skipFonts: true }
    if (mode === 'selected') options.includeStyleProperties = ['font-size']
    if (mode === 'per-node')
      options.stylePropertiesForNode = () => ['font-size']
    const svg = new DOMParser().parseFromString(
      decodeURIComponent((await toSvg(root, options)).split(',')[1]),
      'image/svg+xml',
    )
    const copy = svg.querySelector('foreignObject > div') as HTMLElement
    expect(copy.style.fontSize).toBe(getComputedStyle(root).fontSize)
    expect(root.style.fontSize).toBe('20.75px')
  },
)

test('fractional text retains its second line instead of shrinking into the first', async () => {
  const root = await metricsScene('normal')
  const range = document.createRange()
  range.selectNodeContents(root)
  const fullWidth = range.getBoundingClientRect().width
  root.style.width = `${(fullWidth * (1 + 19.9 / 20.75)) / 2}px`
  root.style.whiteSpace = 'normal'
  const sourceLines = Array.from(range.getClientRects())
  expect(sourceLines).toHaveLength(2)
  const box = root.getBoundingClientRect()
  const x = sourceLines[1].left - box.left + 2.4 * 20.75
  const y = sourceLines[1].top - box.top + sourceLines[1].height / 2
  const image = await toImageData(root, { pixelRatio: 1 })
  expect(pixel(image, x, y)).toEqual([255, 0, 0, 255])
  expect(Array.from(range.getClientRects())).toHaveLength(2)
  expect(root.style.fontSize).toBe('20.75px')
})

test.each([
  ['auto', 20.75, 1],
  ['normal', 20.75, 2],
  ['none', 20.75, 1],
  ['auto', 8.75, 2],
  ['auto', 13.75, 2],
] as const)(
  'a tight last word stays on its source line with kerning %s at %spx and %sx pixels',
  async (kerning, fontSize, pixelRatio) => {
    const root = await metricsScene(kerning, fontSize)
    const range = document.createRange()
    range.selectNodeContents(root)
    root.style.width = `${range.getBoundingClientRect().width + 0.25}px`
    root.style.whiteSpace = 'normal'
    expect(Array.from(range.getClientRects())).toHaveLength(1)
    range.setStart(root.firstChild!, 8)
    range.setEnd(root.firstChild!, 9)
    const letter = range.getBoundingClientRect()
    const box = root.getBoundingClientRect()
    const x = letter.left - box.left + letter.width * 0.4
    const y = letter.top - box.top + letter.height / 2
    const image = await toImageData(root, { pixelRatio })
    expect(pixel(image, x * pixelRatio, y * pixelRatio)).toEqual([
      255, 0, 0, 255,
    ])
    expect(getComputedStyle(root).fontKerning).toBe(kerning)
  },
)

test('the metrics fixture actually distinguishes enabled and disabled kerning', async () => {
  const root = await metricsScene('normal')
  const range = document.createRange()
  range.selectNodeContents(root)
  const enabled = range.getBoundingClientRect().width
  root.style.fontKerning = 'none'
  expect(range.getBoundingClientRect().width - enabled).toBeGreaterThan(5)
})

test('Issue #132 flex items keep their last word on the source line', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText =
    'width:400px;display:flex;justify-content:space-between;align-items:center;font:16px serif;line-height:20px;background:white;color:red'
  root.innerHTML =
    '<span style="font-weight:bold;padding-bottom:30px">Some-Test not left</span>' +
    '<span style="font-weight:bold;padding-bottom:30px">Some-Test not right</span>'
  const box = root.getBoundingClientRect()
  const words = Array.from(root.children).map((child) => {
    const text = child.firstChild!
    const range = document.createRange()
    range.setStart(text, text.textContent!.lastIndexOf(' ') + 1)
    range.setEnd(text, text.textContent!.length)
    expect(range.getClientRects()).toHaveLength(1)
    const rect = range.getBoundingClientRect()
    return {
      x: rect.left - box.left,
      y: rect.top - box.top,
      width: rect.width,
      height: rect.height,
    }
  })
  const image = await toImageData(root, { skipFonts: true, pixelRatio: 1 })
  words.forEach((word) => {
    let ink = 0
    for (
      let y = Math.ceil(word.y);
      y < Math.floor(word.y + word.height);
      y += 1
    ) {
      for (
        let x = Math.ceil(word.x + 1);
        x < Math.floor(word.x + word.width - 1);
        x += 1
      ) {
        const color = pixel(image, x, y)
        if (
          color[0] > 150 &&
          color[1] < 100 &&
          color[2] < 100 &&
          color[3] > 200
        )
          ink += 1
      }
    }
    expect(ink).toBeGreaterThan(5)
  })
})
