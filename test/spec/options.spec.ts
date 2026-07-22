/* eslint-disable promise/no-callback-in-promise */

import './setup'
import {
  bootstrap,
  check,
  drawDataUrl,
  // renderAndCheck,
  getSvgDocument,
  compareToRefImage,
  assertTextRendered,
} from './helper'
import { toCanvas, toPng, toSvg } from '../../src'
import { cloneNode } from '../../src/clone-node'

describe('work with options', () => {
  it('should apply width and height options to node copy being rendered', (done) => {
    bootstrap(
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
      .then(done)
      .catch(done)
  })

  it('should render backgroundColor', (done) => {
    bootstrap('bgcolor/node.html', 'bgcolor/style.css', 'bgcolor/image')
      .then((node) => {
        return toPng(node, {
          style: {
            backgroundColor: '#ff0000',
          },
        })
      })
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should render backgroundColor in SVG', (done) => {
    bootstrap('bgcolor/node.html', 'bgcolor/style.css', 'bgcolor/image')
      .then((node) => {
        return toSvg(node, {
          style: {
            backgroundColor: '#ff0000',
          },
        })
      })
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should apply style text to node copy being rendered', (done) => {
    bootstrap('style/node.html', 'style/style.css', 'style/image')
      .then((node) => {
        return toPng(node, {
          style: { background: 'red', transform: 'scale(0.5)' },
        })
      })
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should only clone specified style properties when includeStyleProperties is provided', (done) => {
    bootstrap('style/node.html', 'style/style.css', 'style/image-include-style')
      .then((node) => {
        return toPng(node, {
          includeStyleProperties: ['width', 'height'],
        })
      })
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should combine dimensions and style', (done) => {
    bootstrap('scale/node.html', 'scale/style.css', 'scale/image')
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
      .then(done)
      .catch(done)
  })

  it('should measure dimensions supplied through style on the cloned node', async () => {
    const node = document.createElement('div')
    node.style.cssText = 'width: 40px; height: 30px; background: red;'
    document.body.appendChild(node)

    try {
      const canvas = await toCanvas(node, {
        pixelRatio: 1,
        skipFonts: true,
        style: {
          width: '160px',
          height: '90px',
        },
      })

      expect(canvas.width).toBe(160)
      expect(canvas.height).toBe(90)
      expect(canvas.style.width).toBe('160px')
      expect(canvas.style.height).toBe('90px')
      expect(node.style.width).toBe('40px')
      expect(node.style.height).toBe('30px')
    } finally {
      node.remove()
    }
  })

  it('should measure reflow after applying a consumer-provided width', async () => {
    const node = document.createElement('div')
    node.style.cssText = 'width: 40px; aspect-ratio: 2 / 1; background: red;'
    document.body.appendChild(node)

    try {
      const canvas = await toCanvas(node, {
        width: 160,
        pixelRatio: 1,
        skipFonts: true,
      })

      expect(canvas.width).toBe(160)
      expect(canvas.height).toBe(80)
      expect(node.getBoundingClientRect().width).toBe(40)
      expect(node.getBoundingClientRect().height).toBe(20)
    } finally {
      node.remove()
    }
  })

  it('should preserve logical size and full content at high pixel ratios', async () => {
    const node = document.createElement('div')
    node.style.cssText = 'position: relative; width: 100px; height: 100px;'

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
    colors.forEach((color, index) => {
      const child = document.createElement('div')
      child.style.cssText = `
        position: absolute;
        left: ${(index % 2) * 50}px;
        top: ${Math.floor(index / 2) * 50}px;
        width: 50px;
        height: 50px;
        background: ${color};
      `
      node.appendChild(child)
    })
    document.body.appendChild(node)

    try {
      const canvas = await toCanvas(node, {
        pixelRatio: 2,
        skipFonts: true,
      })
      const context = canvas.getContext('2d')!
      const pixelAt = (x: number, y: number) =>
        Array.from(context.getImageData(x, y, 1, 1).data)

      expect(canvas.width).toBe(200)
      expect(canvas.height).toBe(200)
      expect(canvas.style.width).toBe('100px')
      expect(canvas.style.height).toBe('100px')
      expect(pixelAt(50, 50)).toEqual([255, 0, 0, 255])
      expect(pixelAt(150, 50)).toEqual([0, 255, 0, 255])
      expect(pixelAt(50, 150)).toEqual([0, 0, 255, 255])
      expect(pixelAt(150, 150)).toEqual([255, 255, 0, 255])
    } finally {
      node.remove()
    }
  })

  it('should redraw canvas output on iOS', async () => {
    const platformDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'platform',
    )
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    })

    const drawImage = spyOn(
      CanvasRenderingContext2D.prototype,
      'drawImage',
    ).and.callThrough()
    const clearRect = spyOn(
      CanvasRenderingContext2D.prototype,
      'clearRect',
    ).and.callThrough()
    const node = document.createElement('div')
    node.style.cssText = 'width: 20px; height: 20px; background: red;'
    document.body.appendChild(node)

    try {
      await toCanvas(node, { pixelRatio: 1, skipFonts: true })

      expect(drawImage).toHaveBeenCalledTimes(2)
      expect(clearRect).toHaveBeenCalledTimes(1)
    } finally {
      node.remove()
      restoreProperty(navigator, 'platform', platformDescriptor)
    }
  })

  it('should use node filter', (done) => {
    bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
      .then((node) =>
        toPng(node, {
          filter(node) {
            if (node.classList) {
              return node.classList.contains('omit') ? 'remove' : 'keep'
            }
            return 'keep'
          },
        }),
      )
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should apply node filter to root node', async () => {
    const root = document.createElement('div')

    const clone = await cloneNode(root, {
      filter: (node) => (node === root ? 'remove' : 'keep'),
    })

    expect(clone).toBeNull()
  })

  it('should preserve children when the filter unwraps the root', async () => {
    const root = document.createElement('section')
    const child = document.createElement('span')
    child.textContent = 'preserved'
    root.appendChild(child)

    const clone = await cloneNode(root, {
      filter: (node) => (node === root ? 'unwrap' : 'keep'),
    })

    expect(clone?.tagName).toBe('DIV')
    expect(clone?.textContent).toBe('preserved')
  })

  it('should exclude descendants when the filter removes their parent', async () => {
    const root = document.createElement('div')
    const excluded = document.createElement('section')
    excluded.className = 'excluded'
    excluded.appendChild(document.createElement('span'))
    root.appendChild(excluded)

    const clone = await cloneNode(root, {
      filter: (node) =>
        node.classList.contains('excluded') ? 'remove' : 'keep',
    })

    expect(clone?.querySelector('.excluded')).toBeNull()
    expect(clone?.children).toHaveSize(0)
  })

  it('should preserve descendants when the filter unwraps their parent', async () => {
    const root = document.createElement('div')
    const excluded = document.createElement('section')
    const preserved = document.createElement('span')
    preserved.className = 'preserved'
    excluded.appendChild(preserved)
    root.appendChild(excluded)

    const clone = await cloneNode(root, {
      filter: (node) => (node === excluded ? 'unwrap' : 'keep'),
    })

    expect(clone?.querySelector('section')).toBeNull()
    expect(clone?.querySelector('.preserved')).not.toBeNull()
  })

  it('should only use fontEmbedCss if it is supplied', (done) => {
    const testCss = `
        @font-face {
          name: "Arial";
          src: url("data:AAA") format("woff2");
        }
      `
    bootstrap('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
      .then((node) => toSvg(node, { fontEmbedCSS: testCss }))
      .then(getSvgDocument)
      .then((doc) => {
        const styles = Array.from(doc.getElementsByTagName('style'))
        expect(styles).toHaveSize(1)
        expect(styles[0].textContent).toEqual(testCss)
      })
      .then(done)
      .catch(done)
  })

  it('should embed only the preferred font', (done) => {
    bootstrap('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
      .then((node) => toSvg(node, { preferredFontFormat: 'woff2' }))
      .then(getSvgDocument)
      .then((doc) => {
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toMatch(/url\([^)]+\) format\("woff2"\)/)
        expect(style.textContent).not.toMatch(/url\([^)]+\) format\("woff"\)/)
      })
      .then(done)
      .catch(done)
  })

  // it('should use the placeholder image when fetching an image fails', (done) => {
  //   bootstrap(
  //     'placeholder/node.html',
  //     'placeholder/style.css',
  //     'placeholder/image',
  //   )
  //     .then((node) => {
  //       renderAndCheck(node, {
  //         imagePlaceholder:
  //           'data:image/png;base64,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',
  //       })
  //     })
  //     .then(done)
  //     .catch(done)
  // })

  it('should support cache busting', (done) => {
    bootstrap('images/node.html', 'images/style.css')
      .then(assertTextRendered(['PNG', 'JPG'], { cacheBust: true }))
      .then(done)
      .catch(done)
  })
})

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    delete (target as Record<PropertyKey, unknown>)[property]
  }
}
