/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { toImageData, toSvg } from '../../src'
import { assertTextRendered, bootstrap, getSvgDocument } from '../spec/helper'

describe('special cases', () => {
  it('renders after an external stylesheet fails to load', async () => {
    const node = await bootstrap('small/node.html', 'ext-css/style.css')
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/base/test/resources/ext-css/missing-for-test.css'
    try {
      await new Promise<void>((resolve, reject) => {
        link.onerror = () => resolve()
        link.onload = () => reject(new Error('Expected stylesheet load failure'))
        document.head.appendChild(link)
      })
      const image = await toImageData(node, { pixelRatio: 1 })
      const offset = 4 * (95 * image.width + 95)
      expect(Array.from(image.data.slice(offset, offset + 4))).toEqual([
        0, 0, 0, 255,
      ])
    } finally {
      link.remove()
    }
  })

  it('renders an open shadow root', async () => {
    const host = document.createElement('div')
    host.attachShadow({ mode: 'open' })
    host.style.cssText = 'display:block;width:40px;height:20px'
    host.shadowRoot!.innerHTML =
      '<div style="width:40px;height:20px;background:rgb(0,128,0)">shadow content</div>'
    document.body.appendChild(host)
    try {
      const svg = await getSvgDocument(await toSvg(host, { skipFonts: true }))
      expect(svg.documentElement.textContent).toContain('shadow content')
      const image = await toImageData(host, { pixelRatio: 1, skipFonts: true })
      const offset = 4 * (18 * image.width + 38)
      expect(Array.from(image.data.slice(offset, offset + 4))).toEqual([
        0, 128, 0, 255,
      ])
      expect(host.shadowRoot!.textContent).toContain('shadow content')
    } finally {
      host.remove()
    }
  })

  it('should caputre lazy loading images', (done) => {
    bootstrap('images/loading.html', 'images/style.css')
      .then(assertTextRendered(['PNG', 'JPG']))
      .then(done)
      .catch(done)
  })
})
