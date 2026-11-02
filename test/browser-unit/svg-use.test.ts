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
