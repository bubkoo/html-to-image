/* eslint-disable promise/no-callback-in-promise */

import * as htmlToImage from '../../src'
import { delay } from '../../src/util'
import {
  clean,
  bootstrap,
  check,
  renderAndCheck,
  assertTextRendered,
} from './helper'
import './setup'

beforeAll(() => {
  process.env.devicePixelRatio = '1'
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
})

afterAll(() => {
  delete process.env.devicePixelRatio
  clean()
})

describe('basic usage', () => {
  it('should render to svg', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then(htmlToImage.toSvg)
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should render to png', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then(htmlToImage.toPng)
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should render to blob', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then(htmlToImage.toBlob)
      .then((blob) => global.URL.createObjectURL(blob!))
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should render to jpeg', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image-jpeg')
      .then((node) => htmlToImage.toJpeg(node))
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should use quality parameter when rendering to jpeg', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image-jpeg-low')
      .then((node) => htmlToImage.toJpeg(node, { quality: 0.5 }))
      .then(check)
      .then(done)
      .catch(done)
  })

  it('should convert an element to an array of pixels', (done) => {
    bootstrap('pixeldata/node.html', 'pixeldata/style.css')
      .then((node) =>
        // eslint-disable-next-line promise/no-nesting
        htmlToImage.toPixelData(node).then((pixels) => ({ node, pixels })),
      )
      .then(({ node, pixels }) => {
        for (let y = 0; y < node.scrollHeight; y += 1) {
          for (let x = 0; x < node.scrollWidth; x += 1) {
            const rgba = [0, 0, 0, 0]

            if (y < 10) {
              rgba[0] = 255
            } else if (y < 20) {
              rgba[1] = 255
            } else {
              rgba[2] = 255
            }

            if (x < 10) {
              rgba[3] = 255
            } else if (x < 20) {
              rgba[3] = 0.4 * 255
            } else {
              rgba[3] = 0.2 * 255
            }

            const offset = 4 * y * node.scrollHeight + 4 * x

            const target: number[] = []
            pixels.slice(offset, offset + 4).forEach((i) => target.push(i))
            expect(target).toEqual(rgba)
          }
        }
      })
      .then(done)
      .catch(done)
  })

  it('should handle border', (done) => {
    bootstrap('border/node.html', 'border/style.css', 'border/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render bigger node', (done) => {
    bootstrap('bigger/node.html', 'bigger/style.css', 'bigger/image')
      .then((parent) => {
        const child = parent.querySelector('.dom-child-node') as HTMLDivElement
        for (let i = 0; i < 10; i += 1) {
          parent.appendChild(child.cloneNode(true))
        }
        return parent
      })
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should handle "#" in colors and attributes', (done) => {
    bootstrap('hash/node.html', 'hash/style.css', 'small/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render whole node when its scrolled', (done) => {
    bootstrap('scroll/node.html', 'scroll/style.css', 'scroll/image')
      .then((node) => node.querySelector('#scrolled') as HTMLDivElement)
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render with external stylesheet', (done) => {
    bootstrap('sheet/node.html', 'sheet/style.css', 'sheet/image')
      .then(delay(1000))
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render text nodes', (done) => {
    bootstrap('text/node.html', 'text/style.css')
      .then(assertTextRendered(['SOME TEXT', 'SOME MORE TEXT']))
      .then(done)
      .catch(done)
  })

  it('should preserve content of ::before and ::after pseudo elements', (done) => {
    bootstrap('pseudo/node.html', 'pseudo/style.css')
      .then(
        assertTextRendered([
          'JUSTBEFORE',
          'BOTHBEFORE',
          'JUSTAFTER',
          'BOTHAFTER',
        ]),
      )
      .then(done)
      .catch(done)
  })

  it('should render web fonts', (done) => {
    bootstrap('fonts/node.html', 'fonts/style.css')
      .then(delay(1000))
      .then(assertTextRendered(['apper']))
      .then(done)
      .catch(done)
  })

  it('should render images', (done) => {
    bootstrap('images/node.html', 'images/style.css')
      .then(delay(500))
      .then(assertTextRendered(['PNG', 'JPG']))
      .then(done)
      .catch(done)
  })

  it('should not fail on empty images', (done) => {
    bootstrap(
      'images/node-empty.html',
      'images/style.css',
      'images/node-empty-png',
    )
      .then(delay(500))
      .then(assertTextRendered(['PNG']))
      .then(done)
      .catch(done)
  })

  it('should render webp images', (done) => {
    bootstrap('webp/node.html', 'webp/style.css')
      .then(delay(500))
      .then(assertTextRendered(['PNG']))
      .then(done)
      .catch(done)
  })

  it('should render background images', (done) => {
    bootstrap('css-bg/node.html', 'css-bg/style.css')
      .then(assertTextRendered(['JPG']))
      .then(done)
      .catch(done)
  })

  it('should render user input from <input>', (done) => {
    const text = 'USER INPUT'
    bootstrap('input/node.html', 'input/style.css')
      .then(() => {
        const input = document.getElementById('input') as HTMLInputElement
        input.value = text
      })
      .then(assertTextRendered([text]) as any)
      .then(done)
      .catch(done)
  })

  it('should render user input from <textarea>', (done) => {
    const text = `USER\nINPUT`

    bootstrap('textarea/node.html', 'textarea/style.css')
      .then(() => {
        const input = document.getElementById('input') as HTMLInputElement
        input.value = text
      })
      .then(assertTextRendered([text]) as any)
      .then(done)
      .catch(done)
  })

  xit('should render content from <canvas>', (done) => {
    const text = 'AB2哈'
    bootstrap('canvas/node.html', 'canvas/style.css')
      .then((node) => {
        const canvas = node.querySelector('#content') as HTMLCanvasElement
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000000'
        ctx.font = '40px serif'
        ctx.fillText(text, 40, 40)
      })
      .then(assertTextRendered([text]) as any)
      .then(done)
      .catch(done)
  })
})
