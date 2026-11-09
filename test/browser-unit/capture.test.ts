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

test('an RTL horizontal scroller keeps its negative visible offset', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:40px;overflow:hidden'
  const panel = document.createElement('div')
  panel.style.cssText =
    'width:40px;height:40px;overflow:auto;display:flex;direction:rtl'
  ;['red', 'green'].forEach((color) => {
    const child = document.createElement('div')
    child.style.cssText = `width:40px;height:40px;flex:none;background:${color}`
    panel.append(child)
  })
  root.append(panel)
  panel.scrollLeft = -40

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 20, 20)).toEqual([0, 128, 0, 255])
  expect(panel.scrollLeft).toBe(-40)
})

test('a fixed child stays visible while normal scrolled content advances', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:40px;overflow:hidden'
  const panel = document.createElement('div')
  panel.style.cssText = 'width:40px;height:40px;overflow:auto'
  const fixed = document.createElement('div')
  fixed.style.cssText =
    'position:fixed;top:0;left:0;width:40px;height:8px;background:blue'
  const first = document.createElement('div')
  first.style.cssText = 'width:40px;height:40px;background:red'
  const second = document.createElement('div')
  second.style.cssText = 'width:40px;height:40px;background:green'
  panel.append(fixed, first, second)
  root.append(panel)
  panel.scrollTop = 40

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 20, 4)).toEqual([0, 0, 255, 255])
  expect(pixel(image, 20, 20)).toEqual([0, 128, 0, 255])
  expect(panel.scrollTop).toBe(40)
  expect(fixed.style.transform).toBe('')

  fixed.style.zIndex = '2'
  const explicitLayer = await toImageData(root, {
    pixelRatio: 1,
    skipFonts: true,
  })
  expect(pixel(explicitLayer, 20, 4)).toEqual([0, 0, 255, 255])
  expect(pixel(explicitLayer, 20, 20)).toEqual([0, 128, 0, 255])
  expect(fixed.style.zIndex).toBe('2')
})

test('a fixed child can remain visible outside its scroller viewport', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:80px;background:white'
  const panel = document.createElement('div')
  panel.style.cssText = 'width:40px;height:40px;overflow:auto'
  const fixed = document.createElement('div')
  fixed.style.cssText =
    'position:fixed;top:50px;left:0;width:40px;height:8px;background:blue'
  const first = document.createElement('div')
  first.style.cssText = 'width:40px;height:40px;background:red'
  const second = document.createElement('div')
  second.style.cssText = 'width:40px;height:40px;background:green'
  panel.append(fixed, first, second)
  root.append(panel)
  panel.scrollTop = 40

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(pixel(image, 20, 20)).toEqual([0, 128, 0, 255])
  expect(pixel(image, 20, 54)).toEqual([0, 0, 255, 255])
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

test('a shadow slot renders fallback content until a node is assigned', async () => {
  const host = attach(document.createElement('div'))
  host.style.cssText = 'display:block;width:40px;height:20px'
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML =
    '<slot><div id="fallback" style="width:40px;height:20px;background:green">fallback</div></slot>'

  const fallback = await toImageData(host, {
    pixelRatio: 1,
    skipFonts: true,
  })
  expect(pixel(fallback, 20, 10)).toEqual([0, 128, 0, 255])

  const assigned = document.createElement('div')
  assigned.id = 'assigned'
  assigned.style.cssText = 'width:40px;height:20px;background:red'
  host.append(assigned)
  const assignedSvg = await fetch(await toSvg(host, { skipFonts: true })).then(
    (response) => response.text(),
  )
  expect(assignedSvg).toContain('id="assigned"')
  expect(assignedSvg).not.toContain('id="fallback"')
  const output = await toImageData(host, { pixelRatio: 1, skipFonts: true })
  expect(pixel(output, 20, 10)).toEqual([255, 0, 0, 255])
  expect(shadow.querySelector('#fallback')).not.toBeNull()
})

test('duplicate Content-Type values still embed image and CSS resources', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:20px;display:flex'
  const image = document.createElement('img')
  image.src = 'asset:foreground'
  image.width = 20
  image.height = 20
  const background = document.createElement('div')
  background.style.cssText =
    'width:20px;height:20px;background-image:url(asset:background)'
  root.append(image, background)

  const output = await toImageData(root, {
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }) =>
        new Blob(
          [
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="${
              url.endsWith('foreground') ? 'red' : 'green'
            }"/></svg>`,
          ],
          { type: 'image/svg+xml, image/svg+xml' },
        ),
    },
  })
  expect(pixel(output, 10, 10)).toEqual([255, 0, 0, 255])
  expect(pixel(output, 30, 10)).toEqual([0, 128, 0, 255])
  expect(image.src).toBe('asset:foreground')
  expect(background.style.backgroundImage).toContain('asset:background')
})

test('a failed image request uses the configured placeholder without changing the source', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:20px;height:20px'
  const image = document.createElement('img')
  image.width = 20
  image.height = 20
  image.src = '/base/test/resources/missing-for-placeholder.png'
  root.append(image)
  const placeholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>',
  )}`

  const output = await toImageData(root, {
    pixelRatio: 1,
    skipFonts: true,
    imagePlaceholder: placeholder,
  })
  expect(pixel(output, 10, 10)).toEqual([255, 0, 0, 255])
  expect(image.getAttribute('src')).toBe(
    '/base/test/resources/missing-for-placeholder.png',
  )
})

test('per-node clone callback changes output pixels but leaves the source alone', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:20px;background:red'
  const image = await toImageData(root, {
    pixelRatio: 1,
    skipFonts: true,
    onCloneNode: (original, copy) => {
      if (original === root) (copy as HTMLElement).style.background = 'green'
    },
  })
  expect(pixel(image, 20, 10)).toEqual([0, 128, 0, 255])
  expect(root.style.background).toBe('red')
})

test('large clones let browser tasks run between copied nodes', async () => {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:4px;height:300px'
  for (let i = 0; i < 300; i += 1) {
    const child = document.createElement('div')
    child.style.cssText = 'width:4px;height:1px;background:green'
    root.append(child)
  }

  let timerFired = false
  let timerStarted = false
  let observedDuringClone = false
  const dataURL = await toSvg(root, {
    skipFonts: true,
    onCloneNode: (original) => {
      if (original === root.firstElementChild && !timerStarted) {
        timerStarted = true
        setTimeout(() => {
          timerFired = true
        }, 0)
      } else if (timerStarted && timerFired) {
        observedDuringClone = true
      }
    },
  })

  expect(timerStarted).toBe(true)
  expect(observedDuringClone).toBe(true)
  const svg = new DOMParser().parseFromString(
    await fetch(dataURL).then((response) => response.text()),
    'image/svg+xml',
  )
  expect(svg.querySelectorAll('div')).toHaveLength(301)
  expect(root.children).toHaveLength(300)
})

test('clone time slice rejects invalid values', async () => {
  const root = attach(document.createElement('div'))
  await expect(toSvg(root, { cloneTimeSliceMs: -1 })).rejects.toThrow(
    /cloneTimeSliceMs/,
  )
  await expect(toSvg(root, { cloneTimeSliceMs: Infinity })).rejects.toThrow(
    /cloneTimeSliceMs/,
  )
})

test('clone time slicing can be disabled for a stable source', async () => {
  const root = attach(document.createElement('div'))
  for (let i = 0; i < 300; i += 1) {
    root.append(document.createElement('div'))
  }

  let timerFired = false
  let observedDuringClone = false
  await toSvg(root, {
    skipFonts: true,
    cloneTimeSliceMs: 0,
    onCloneNode: (original) => {
      if (original === root.firstElementChild) {
        setTimeout(() => {
          timerFired = true
        }, 0)
      } else if (timerFired) {
        observedDuringClone = true
      }
    },
  })

  expect(observedDuringClone).toBe(false)
  expect(root.children).toHaveLength(300)
})

test('per-node style selection overrides the global computed-style list', async () => {
  const sheet = document.createElement('style')
  sheet.textContent = '.style-child { background: green; color: blue }'
  document.head.append(sheet)
  nodes.push(sheet)
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:40px;height:20px'
  const child = document.createElement('div')
  child.className = 'style-child'
  child.style.cssText = 'width:40px;height:20px'
  root.append(child)

  const dataURL = await toSvg(root, {
    skipFonts: true,
    includeStyleProperties: ['color'],
    stylePropertiesForNode: (original) =>
      original === child ? ['background-color'] : undefined,
  })
  const source = await fetch(dataURL).then((response) => response.text())
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml')
  const copy = svg.querySelector('.style-child') as HTMLElement
  expect(copy.style.backgroundColor).toBe('rgb(0, 128, 0)')
  expect(copy.style.color).toBe('')
  expect(child.style.backgroundColor).toBe('')
  expect(child.style.color).toBe('')
})
