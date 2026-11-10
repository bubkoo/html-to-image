import { afterEach, expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'

const attached: Element[] = []
const namespace = 'http://www.w3.org/2000/svg'

function attach<T extends Element>(node: T): T {
  document.body.append(node)
  attached.push(node)
  return node
}

function imagePixel(image: ImageData) {
  const offset = 4 * (10 * image.width + 10)
  return Array.from(image.data.slice(offset, offset + 4))
}

function scene(href: string) {
  const root = attach(document.createElement('div'))
  root.style.cssText = 'width:20px;height:20px'
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  const use = document.createElementNS(namespace, 'use')
  use.setAttribute('href', href)
  use.setAttribute('width', '20')
  use.setAttribute('height', '20')
  svg.append(use)
  root.append(svg)
  return { root, use }
}

afterEach(() => {
  attached.splice(0).forEach((node) => node.remove())
})

test('modern href resolves an out-of-subtree symbol with a CSS-special ID', async () => {
  const sprite = attach(document.createElementNS(namespace, 'svg'))
  sprite.style.display = 'none'
  sprite.innerHTML =
    '<symbol id="icon:home" viewBox="0 0 20 20"><rect width="20" height="20" fill="red"/></symbol>'
  const { root, use } = scene('#icon:home')

  const svg = await fetch(await toSvg(root, { skipFonts: true })).then(
    (response) => response.text(),
  )
  expect(svg).toContain('id="icon:home"')
  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(imagePixel(image)).toEqual([255, 0, 0, 255])
  expect(use.getAttribute('href')).toBe('#icon:home')
})

test('legacy xlink:href uses an out-of-subtree symbol without changing the source', async () => {
  const sprite = attach(document.createElementNS(namespace, 'svg'))
  sprite.style.display = 'none'
  sprite.innerHTML =
    '<symbol id="legacy-icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="blue"/></symbol>'
  const { root, use } = scene('#legacy-icon')
  use.removeAttribute('href')
  use.setAttributeNS(
    'http://www.w3.org/1999/xlink',
    'xlink:href',
    '#legacy-icon',
  )

  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(imagePixel(image)).toEqual([0, 0, 255, 255])
  expect(use.getAttribute('xlink:href')).toBe('#legacy-icon')
})

test('an external SVG symbol is fetched through the resource resolver and made local', async () => {
  const reference = 'https://assets.example.test/icons.svg#icon'
  const requested: string[] = []
  const { root, use } = scene(reference)
  const options = {
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }: { url: string }) => {
        requested.push(url)
        return new Blob(
          [
            '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="green"/></symbol></svg>',
          ],
          { type: 'image/svg+xml' },
        )
      },
    },
  }

  const svg = await fetch(await toSvg(root, options)).then((response) =>
    response.text(),
  )
  expect(svg).toContain('fill="green"')
  expect(svg).not.toContain(reference)
  const image = await toImageData(root, options)
  expect(imagePixel(image)).toEqual([0, 128, 0, 255])
  expect(requested).toEqual([
    'https://assets.example.test/icons.svg',
    'https://assets.example.test/icons.svg',
  ])
  expect(use.getAttribute('href')).toBe(reference)
})

test('an external symbol resolver failure reaches the caller', async () => {
  const reference = 'https://assets.example.test/icons.svg#icon'
  const { root, use } = scene(reference)
  await expect(
    toSvg(root, {
      skipFonts: true,
      resources: {
        resolve: () => {
          throw new Error('resolver failed')
        },
      },
    }),
  ).rejects.toThrow('Custom resource resolver failed')
  expect(use.getAttribute('href')).toBe(reference)
})

test('an external symbol retains sibling gradient and clip dependencies', async () => {
  const { root } = scene('https://assets.example.test/deps.svg#icon')
  const image = await toImageData(root, {
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: () =>
        new Blob(
          [
            '<svg xmlns="http://www.w3.org/2000/svg">' +
              '<defs><linearGradient id="paint"><stop stop-color="green"/></linearGradient>' +
              '<clipPath id="clip"><rect width="12" height="20"/></clipPath></defs>' +
              '<symbol id="icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="url(#paint)" clip-path="url(#clip)"/></symbol></svg>',
          ],
          { type: 'image/svg+xml' },
        ),
    },
  })
  expect(imagePixel(image)).toEqual([0, 128, 0, 255])
  const outside = 4 * (10 * image.width + 16)
  expect(Array.from(image.data.slice(outside, outside + 4))).toEqual([
    0, 0, 0, 0,
  ])
})

test('a local out-of-subtree symbol retains its sibling paint dependency', async () => {
  const sprite = attach(document.createElementNS(namespace, 'svg'))
  sprite.style.display = 'none'
  sprite.innerHTML =
    '<defs><linearGradient id="local-paint"><stop stop-color="green"/></linearGradient></defs>' +
    '<symbol id="local-dependency" viewBox="0 0 20 20"><rect width="20" height="20" fill="url(#local-paint)"/></symbol>'
  const { root } = scene('#local-dependency')
  const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
  expect(imagePixel(image)).toEqual([0, 128, 0, 255])
})

test('an empty modern href does not activate the deprecated reference', async () => {
  const { root, use } = scene('')
  use.setAttributeNS(
    'http://www.w3.org/1999/xlink',
    'xlink:href',
    '#fallback-icon',
  )
  const svg = root.querySelector('svg')!
  const definition = document.createElementNS(namespace, 'defs')
  definition.innerHTML =
    '<g id="fallback-icon"><rect width="20" height="20" fill="green"/></g>'
  svg.prepend(definition)
  const native = new Image()
  native.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
  await native.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 20
  canvas.getContext('2d')!.drawImage(native, 0, 0)
  const expected = Array.from(
    canvas.getContext('2d')!.getImageData(10, 10, 1, 1).data,
  )
  expect(expected).toEqual([0, 0, 0, 0])
  use.setAttributeNS(
    'http://www.w3.org/1999/xlink',
    'xlink:href',
    'https://assets.example.test/fallback.svg#fallback-icon',
  )
  const requests: string[] = []
  const image = await toImageData(root, {
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }) => {
        requests.push(url)
        return new Blob(
          [
            '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="fallback-icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="green"/></symbol></svg>',
          ],
          { type: 'image/svg+xml' },
        )
      },
    },
  })
  expect(imagePixel(image)).toEqual(expected)
  expect(requests).toEqual([])
  expect(use.getAttribute('href')).toBe('')
})

test('an external use without a fragment selects the SVG document root', async () => {
  const { root } = scene('https://assets.example.test/whole.svg')
  const image = await toImageData(root, {
    skipFonts: true,
    pixelRatio: 1,
    resources: {
      resolve: () =>
        new Blob(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>',
          ],
          { type: 'image/svg+xml' },
        ),
    },
  })
  expect(imagePixel(image)).toEqual([0, 128, 0, 255])
})

test('encoded local paint IDs preserve native SVG pixels after URL rewriting', async () => {
  const sprite = attach(document.createElementNS(namespace, 'svg'))
  sprite.style.display = 'none'
  const paint = document.createElementNS(namespace, 'linearGradient')
  paint.id = 'paint"quote:一'
  const stop = document.createElementNS(namespace, 'stop')
  stop.setAttribute('stop-color', 'green')
  paint.append(stop)
  sprite.append(paint)
  const { root } = scene('#encoded-icon')
  const symbol = document.createElementNS(namespace, 'symbol')
  symbol.id = 'encoded-icon'
  symbol.setAttribute('viewBox', '0 0 20 20')
  const rect = document.createElementNS(namespace, 'rect')
  rect.setAttribute('width', '20')
  rect.setAttribute('height', '20')
  rect.setAttribute('fill', 'url("#' + encodeURIComponent(paint.id) + '")')
  symbol.append(rect)
  sprite.append(symbol)
  const control = document.createElementNS(namespace, 'svg')
  control.setAttribute('width', '20')
  control.setAttribute('height', '20')
  control.append(paint.cloneNode(true), symbol.cloneNode(true))
  const controlUse = document.createElementNS(namespace, 'use')
  controlUse.setAttribute('href', '#encoded-icon')
  controlUse.setAttribute('width', '20')
  controlUse.setAttribute('height', '20')
  control.append(controlUse)
  const decoded = new Image()
  decoded.src =
    'data:image/svg+xml,' +
    encodeURIComponent(new XMLSerializer().serializeToString(control))
  await decoded.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 20
  canvas.getContext('2d')!.drawImage(decoded, 0, 0)
  const native = Array.from(
    canvas.getContext('2d')!.getImageData(10, 10, 1, 1).data,
  )
  expect(
    imagePixel(await toImageData(root, { skipFonts: true, pixelRatio: 1 })),
  ).toEqual(native)
})

test('a filtered definition inside the captured subtree is not imported again', async () => {
  const { root, use } = scene('#excluded-icon')
  const defs = document.createElementNS(namespace, 'defs')
  defs.innerHTML =
    '<symbol id="excluded-icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="green"/></symbol>'
  use.parentElement!.prepend(defs)
  const image = await toImageData(root, {
    skipFonts: true,
    pixelRatio: 1,
    exclude: ['defs'],
  })
  expect(imagePixel(image)).toEqual([0, 0, 0, 0])
})

test('a captured shadow subtree can import local SVG dependencies from its own tree', async () => {
  const host = attach(document.createElement('div'))
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML =
    '<svg style="display:none"><defs><linearGradient id="shadow-paint"><stop stop-color="green"/></linearGradient><symbol id="shadow-symbol" viewBox="0 0 20 20"><rect width="20" height="20" fill="url(#shadow-paint)"/></symbol></defs></svg><div style="width:20px;height:20px"><svg width="20" height="20"><use href="#shadow-symbol" width="20" height="20"/></svg></div>'
  const root = shadow.querySelector('div')!
  expect(
    imagePixel(await toImageData(root, { skipFonts: true, pixelRatio: 1 })),
  ).toEqual([0, 128, 0, 255])
})

test('empty modern SVG image href keeps its inactive legacy image inactive', async () => {
  const { root, use } = scene('')
  const imageNode = document.createElementNS(namespace, 'image')
  imageNode.setAttribute('width', '20')
  imageNode.setAttribute('height', '20')
  imageNode.setAttribute('href', '')
  const green =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>',
    )
  imageNode.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', green)
  use.replaceWith(imageNode)
  const image = await toImageData(root, { skipFonts: true, pixelRatio: 1 })
  expect(imagePixel(image)).toEqual([0, 0, 0, 0])
  expect(imageNode.getAttribute('href')).toBe('')
})

test('an SVG image without a reference has no pixels and needs no resource', async () => {
  const { root, use } = scene('')
  const imageNode = document.createElementNS(namespace, 'image')
  imageNode.setAttribute('width', '20')
  imageNode.setAttribute('height', '20')
  use.replaceWith(imageNode)
  const requests: string[] = []
  const image = await toImageData(root, {
    skipFonts: true,
    pixelRatio: 1,
    resources: {
      resolve: ({ url }) => {
        requests.push(url)
        return undefined
      },
    },
  })
  expect(imagePixel(image)).toEqual([0, 0, 0, 0])
  expect(requests).toEqual([])
})
