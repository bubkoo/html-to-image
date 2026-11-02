/* eslint-disable promise/no-callback-in-promise */

import './setup'
import {
  bootstrap,
  check,
  drawDataUrl,
  getSvgDocument,
  compareToRefImage,
  assertTextRendered,
} from './helper'
import { toPng, toSvg } from '../../src'

describe('work with options', () => {
  it('should apply width and height options to node copy being rendered', async () => {
    await bootstrap(
      'dimensions/node.html',
      'dimensions/style.css',
      'dimensions/image',
    )
      .then((node) =>
        toPng(node, {
          width: 200,
          height: 200,
        }),
      )
      .then((dataUrl) => drawDataUrl(dataUrl, { width: 200, height: 200 }))
      .then(compareToRefImage)
  })

  it('should render backgroundColor', async () => {
    await bootstrap('bgcolor/node.html', 'bgcolor/style.css', 'bgcolor/image')
      .then((node) => {
        return toPng(node, {
          backgroundColor: '#ff0000',
        })
      })
      .then(check)
  })

  it('should render backgroundColor in SVG', async () => {
    await bootstrap('bgcolor/node.html', 'bgcolor/style.css', 'bgcolor/image')
      .then((node) => {
        return toSvg(node, {
          backgroundColor: '#ff0000',
        })
      })
      .then(check)
  })

  it('should apply style text to node copy being rendered', async () => {
    await bootstrap('style/node.html', 'style/style.css', 'style/image')
      .then((node) => {
        return toPng(node, {
          style: { backgroundColor: 'red', transform: 'scale(0.5)' },
        })
      })
      .then(check)
  })

  it('should only clone specified style properties when includeStyleProperties is provided', async () => {
    await bootstrap('style/node.html', 'style/style.css')
      .then((node) => {
        return toSvg(node, {
          includeStyleProperties: ['width', 'height'],
        })
      })
      .then(getSvgDocument)
      .then((svg) => {
        const root = svg.querySelector('foreignObject > div') as HTMLElement
        const child = root.querySelector('.child') as HTMLElement
        expect(root.style.width).toBe('100px')
        expect(root.style.height).toBe('100px')
        expect(root.style.backgroundColor).toBe('')
        expect(child.style.backgroundColor).toBe('')
      })
  })

  it('should combine dimensions and style', async () => {
    await bootstrap('scale/node.html', 'scale/style.css', 'scale/image')
      .then((node) => {
        return toPng(node, {
          width: 200,
          height: 200,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left',
          },
        })
      })
      .then((dataUrl) => drawDataUrl(dataUrl, { width: 200, height: 200 }))
      .then(compareToRefImage)
  })

  it('should use node filter', async () => {
    await bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
      .then((node) =>
        toPng(node, {
          filter(node) {
            if (node.classList) {
              return !node.classList.contains('omit')
            }
            return true
          },
        }),
      )
      .then(check)
  })

  it('should not apply node filter to root node', async () => {
    await bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
      .then((node) =>
        toPng(node, {
          filter(node) {
            if (node.classList) {
              return node.classList.contains('include')
            }
            return false
          },
        }),
      )
      .then(check)
  })

  it('should only use fontEmbedCss if it is supplied', async () => {
    const testCss = `
        @font-face {
          name: "Arial";
          src: url("data:AAA") format("woff2");
        }
      `
    await bootstrap('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
      .then((node) => toSvg(node, { fontEmbedCSS: testCss }))
      .then(getSvgDocument)
      .then((doc) => {
        const styles = Array.from(doc.getElementsByTagName('style'))
        expect(styles).toHaveLength(1)
        expect(styles[0].textContent).toEqual(testCss)
      })
  })

  it('should embed only the preferred font', async () => {
    await bootstrap('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
      .then((node) => toSvg(node, { preferredFontFormat: 'woff2' }))
      .then(getSvgDocument)
      .then((doc) => {
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toMatch(/url\([^)]+\) format\("woff2"\)/)
        expect(style.textContent).not.toMatch(/url\([^)]+\) format\("woff"\)/)
      })
  })

  it('should support cache busting', async () => {
    await bootstrap('images/node.html', 'images/style.css').then(
      assertTextRendered(['PNG', 'JPG'], { cacheBust: true }),
    )
  })
})
