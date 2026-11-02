/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { toImageData, toSvg } from '../../src'
import { bootstrap, renderAndCheck, getSvgDocument } from '../spec/helper'

describe('work with svg element', () => {
  it('should render nested svg with broken namespace', (done) => {
    bootstrap('svg-ns/node.html', 'svg-ns/style.css', 'svg-ns/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render svg `<rect>` with width and heigth', (done) => {
    bootstrap('svg-rect/node.html', 'svg-rect/style.css', 'svg-rect/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render svg `<rect>` with applied css styles', async () => {
    const node = await bootstrap('svg-color/node.html', 'svg-color/style.css')
    const svg = await getSvgDocument(await toSvg(node))
    const rect = svg.querySelector('rect') as SVGRectElement
    expect(rect.style.fill).toBe('rgb(0, 0, 0)')
    const image = await toImageData(node, { pixelRatio: 1 })
    const offset = 4 * (70 * image.width + 70)
    expect(Array.from(image.data.slice(offset, offset + 4))).toEqual([
      0, 0, 0, 255,
    ])
  })

  it('should include a viewBox attribute', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then(toSvg)
      .then(getSvgDocument)
      .then((doc) => {
        const width = doc.documentElement.getAttribute('width')
        const height = doc.documentElement.getAttribute('height')
        const viewBox = doc.documentElement.getAttribute('viewBox')
        expect(viewBox).toEqual(`0 0 ${width} ${height}`)
      })
      .then(done)
      .catch(done)
  })

  it('should render svg `<image>` with href', (done) => {
    bootstrap('svg-image/node.html', 'svg-image/style.css', 'svg-image/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render SVG use tags', function (done) {
    bootstrap(
      'svg-use-tag/node.html',
      'svg-use-tag/style.css',
      'svg-use-tag/image',
    )
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('copies a modern local use symbol with a CSS-special ID', async () => {
    const namespace = 'http://www.w3.org/2000/svg'
    const sprite = document.createElementNS(namespace, 'svg')
    sprite.style.display = 'none'
    sprite.innerHTML =
      '<symbol id="icon:local" viewBox="0 0 20 20"><rect width="20" height="20" fill="red"/></symbol>'
    const root = document.createElement('div')
    root.style.cssText = 'width:20px;height:20px'
    root.innerHTML =
      '<svg width="20" height="20"><use href="#icon:local" width="20" height="20"/></svg>'
    document.body.append(sprite, root)
    try {
      const output = await getSvgDocument(await toSvg(root, { skipFonts: true }))
      expect(output.querySelector('symbol[id="icon:local"]')).not.toBeNull()
      const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
      const offset = 4 * (10 * image.width + 10)
      expect(Array.from(image.data.slice(offset, offset + 4))).toEqual([
        255, 0, 0, 255,
      ])
      expect(root.querySelector('use')!.getAttribute('href')).toBe('#icon:local')
    } finally {
      sprite.remove()
      root.remove()
    }
  })

  it('loads an external use symbol once for two references in one capture', async () => {
    const reference = 'https://assets.example.test/icons.svg#icon'
    const root = document.createElement('div')
    root.style.cssText = 'width:40px;height:20px'
    root.innerHTML =
      `<svg width="40" height="20"><use href="${reference}" width="20" height="20"/>` +
      `<use href="${reference}" x="20" width="20" height="20"/></svg>`
    document.body.append(root)
    const requests: string[] = []
    try {
      const image = await toImageData(root, {
        pixelRatio: 1,
        skipFonts: true,
        resources: {
          resolve: ({ url }) => {
            requests.push(url)
            return new Blob(
              [
                '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="blue"/></symbol></svg>',
              ],
              { type: 'image/svg+xml' },
            )
          },
        },
      })
      for (const x of [10, 30]) {
        const offset = 4 * (10 * image.width + x)
        expect(Array.from(image.data.slice(offset, offset + 4))).toEqual([
          0, 0, 255, 255,
        ])
      }
      expect(requests).toEqual(['https://assets.example.test/icons.svg'])
      expect(root.querySelector('use')!.getAttribute('href')).toBe(reference)
    } finally {
      root.remove()
    }
  })

  it('reports a malformed external symbol and rejects resolver failures', async () => {
    const root = document.createElement('div')
    root.style.cssText = 'width:20px;height:20px'
    root.innerHTML =
      '<svg width="20" height="20"><use href="https://assets.example.test/bad.svg#icon"/></svg>'
    document.body.append(root)
    try {
      const warnings: string[] = []
      await toSvg(root, {
        skipFonts: true,
        resources: {
          resolve: () => new Blob(['<svg><broken>'], { type: 'image/svg+xml' }),
        },
        onEvent: (event) => {
          if (event.type === 'warning') warnings.push(event.diagnostic.code)
        },
      })
      expect(warnings).toEqual(['resource-error'])
      await expectAsync(
        toSvg(root, {
          skipFonts: true,
          resources: {
            resolve: () => {
              throw new Error('resolver failed')
            },
          },
        }),
      ).toBeRejectedWithError(/Custom resource resolver failed/)
      expect(root.querySelector('use')!.getAttribute('href')).toContain(
        'bad.svg#icon',
      )
    } finally {
      root.remove()
    }
  })
})
