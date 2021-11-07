/* eslint-disable */
import * as util from '../../src/util'
import * as htmlToImage from '../../src'
import * as embeding from '../../src/embedResources'
import { Helper } from './helper'

describe('html to image', () => {
  beforeAll(() => {
    process.env.devicePixelRatio = '1'
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
  })

  afterAll(() => {
    delete process.env.devicePixelRatio
    Helper.clean()
  })

  describe('basic usage', () => {
    it('should render to svg', (done) => {
      Helper.bootstrap('small/node.html', 'small/style.css', 'small/image')
        .then(htmlToImage.toSvg)
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should render to png', (done) => {
      Helper.bootstrap('small/node.html', 'small/style.css', 'small/image')
        .then(htmlToImage.toPng)
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should render to blob', (done) => {
      Helper.bootstrap('small/node.html', 'small/style.css', 'small/image')
        .then(htmlToImage.toBlob)
        .then(global.URL.createObjectURL)
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should render to jpeg', (done) => {
      Helper.bootstrap('small/node.html', 'small/style.css', 'small/image-jpeg')
        .then((node) => htmlToImage.toJpeg(node))
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should use quality parameter when rendering to jpeg', (done) => {
      Helper.bootstrap(
        'small/node.html',
        'small/style.css',
        'small/image-jpeg-low',
      )
        .then((node) => htmlToImage.toJpeg(node, { quality: 0.5 }))
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should convert an element to an array of pixels', (done) => {
      Helper.bootstrap('pixeldata/node.html', 'pixeldata/style.css')
        .then(util.delay(1000))
        .then((node) =>
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
      Helper.bootstrap('border/node.html', 'border/style.css', 'border/image')
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render bigger node', (done) => {
      Helper.bootstrap('bigger/node.html', 'bigger/style.css', 'bigger/image')
        .then((parent) => {
          const child = parent.querySelector(
            '.dom-child-node',
          ) as HTMLDivElement
          for (let i = 0; i < 10; i += 1) {
            parent.appendChild(child.cloneNode(true))
          }
          return parent
        })
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should handle "#" in colors and attributes', (done) => {
      Helper.bootstrap('hash/node.html', 'hash/style.css', 'small/image')
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render whole node when its scrolled', (done) => {
      Helper.bootstrap('scroll/node.html', 'scroll/style.css', 'scroll/image')
        .then((node) => node.querySelector('#scrolled') as HTMLDivElement)
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render children in a scrolled node at the correct position', (done) => {
      Helper.bootstrap(
        'scrolled-child/node.html',
        'scrolled-child/style.css',
        'scrolled-child/image',
      )
        .then((node) => node.querySelector('#parent') as HTMLDivElement)
        .then((node) => {
          const scrolled = node.querySelector('#scrolled')
          if (!scrolled) {
            return node
          }
          scrolled.scrollTop = 50
          return node
        })
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render text nodes', (done) => {
      Helper.bootstrap('text/node.html', 'text/style.css')
        .then(Helper.assertTextRendered(['SOME TEXT', 'SOME MORE TEXT']))
        .then(done)
        .catch(done)
    })

    it('should preserve content of ::before and ::after pseudo elements', (done) => {
      Helper.bootstrap('pseudo/node.html', 'pseudo/style.css')
        .then(
          Helper.assertTextRendered([
            'JUSTBEFORE',
            'BOTHBEFORE',
            'JUSTAFTER',
            'BOTHAFTER',
          ]),
        )
        .then(done)
        .catch(done)
    })

    it('should render with external stylesheet', (done) => {
      Helper.bootstrap('sheet/node.html', 'sheet/style.css', 'sheet/image')
        .then(util.delay(1000))
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render web fonts', (done) => {
      Helper.bootstrap('fonts/node.html', 'fonts/style.css')
        .then(util.delay(1000))
        .then(Helper.assertTextRendered(['apper']))
        .then(done)
        .catch(done)
    })

    it('should render images', (done) => {
      Helper.bootstrap('images/node.html', 'images/style.css')
        .then(util.delay(500))
        .then(Helper.assertTextRendered(['PNG', 'JPG']))
        .then(done)
        .catch(done)
    })

    it('should render background images', (done) => {
      Helper.bootstrap('css-bg/node.html', 'css-bg/style.css')
        .then(Helper.assertTextRendered(['JPG']))
        .then(done)
        .catch(done)
    })

    it('should render user input from <input>', (done) => {
      const text = 'USER INPUT'
      Helper.bootstrap('input/node.html', 'input/style.css')
        .then(() => {
          const input = document.getElementById('input') as HTMLInputElement
          input.value = text
        })
        .then(() => Helper.assertTextRendered([text]))
        .then(done)
        .catch(done)
    })

    it('should render user input from <textarea>', (done) => {
      const text = 'USER\nINPUT'

      Helper.bootstrap('textarea/node.html', 'textarea/style.css')
        .then(() => {
          const input = document.getElementById('input') as HTMLInputElement
          input.value = text
        })
        .then(() => Helper.assertTextRendered([text]))
        .then(done)
        .catch(done)
    })

    it('should render content from <canvas>', (done) => {
      Helper.bootstrap('canvas/node.html', 'canvas/style.css')
        .then(() => {
          const canvas = document.getElementById('content') as HTMLCanvasElement
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#000000'
          ctx.font = '100px monospace'
          ctx.fillText('0', canvas.width / 2, canvas.height / 2)
        })
        .then(() => Helper.assertTextRendered(['0']))
        .then(done)
        .catch(done)
    })

    describe('custom element', () => {
      let link: HTMLLinkElement
      beforeAll(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/mathlive/dist/mathlive.min.js'
        link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/mathlive/dist/mathlive-fonts.css'
        const tasks = [
          new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
          }),
          new Promise((resolve, reject) => {
            link.onload = resolve
            link.onerror = reject
          }),
        ]
        document.head.append(script, link)
        return Promise.all(tasks)
      })

      afterAll(() => {
        link.remove()
      })

      xit('should render content from shadow node of custom element', (done) => {
        Helper.bootstrap(
          'custom-element/node.html',
          'custom-element/style.css',
          'custom-element/image',
        )
          .then(util.delay(1000))
          .then(Helper.renderAndCheck)
          .then(util.delay(1000))
          .then(done)
          .catch(done)
      })
    })
  })

  describe('work with svg', () => {
    xit('should render nested svg with broken namespace', (done) => {
      Helper.bootstrap('svg-ns/node.html', 'svg-ns/style.css', 'svg-ns/image')
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render svg `<rect>` with width and heigth', (done) => {
      Helper.bootstrap(
        'svg-rect/node.html',
        'svg-rect/style.css',
        'svg-rect/image',
      )
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should render svg `<rect>` with applied css styles', (done) => {
      Helper.bootstrap(
        'svg-color/node.html',
        'svg-color/style.css',
        'svg-color/image',
      )
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })

    it('should include a viewBox attribute', (done) => {
      Helper.bootstrap('small/node.html', 'small/style.css', 'small/image')
        .then(htmlToImage.toSvg)
        .then(Helper.getSvgDocument)
        .then((doc) => {
          const width = doc.documentElement.getAttribute('width')
          const height = doc.documentElement.getAttribute('height')
          const viewBox = doc.documentElement.getAttribute('viewBox')
          expect(viewBox).toEqual(`0 0 ${width} ${height}`)
        })
        .then(done)
        .catch(done)
    })

    xit('should render svg `<image>` with href', (done) => {
      Helper.bootstrap(
        'svg-image/node.html',
        'svg-image/style.css',
        'svg-image/image',
      )
        .then(Helper.renderAndCheck)
        .then(done)
        .catch(done)
    })
  })

  describe('work with options', () => {
    it('should apply width and height options to node copy being rendered', (done) => {
      Helper.bootstrap(
        'dimensions/node.html',
        'dimensions/style.css',
        'dimensions/image',
      )
        .then((node) =>
          htmlToImage.toPng(node, {
            width: 200,
            height: 200,
          }),
        )
        .then((dataUrl) =>
          Helper.drawDataUrl(dataUrl, { width: 200, height: 200 }),
        )
        .then(Helper.compareToRefImage)
        .then(done)
        .catch(done)
    })

    it('should render backgroundColor', (done) => {
      Helper.bootstrap(
        'bgcolor/node.html',
        'bgcolor/style.css',
        'bgcolor/image',
      )
        .then((node) => {
          return htmlToImage.toPng(node, {
            backgroundColor: '#ff0000',
          })
        })
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should render backgroundColor in SVG', (done) => {
      Helper.bootstrap(
        'bgcolor/node.html',
        'bgcolor/style.css',
        'bgcolor/image',
      )
        .then((node) => {
          return htmlToImage.toSvg(node, {
            backgroundColor: '#ff0000',
          })
        })
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should apply style text to node copy being rendered', (done) => {
      Helper.bootstrap('style/node.html', 'style/style.css', 'style/image')
        .then((node) => {
          return htmlToImage.toPng(node, {
            style: { backgroundColor: 'red', transform: 'scale(0.5)' },
          })
        })
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should combine dimensions and style', (done) => {
      Helper.bootstrap('scale/node.html', 'scale/style.css', 'scale/image')
        .then((node) => {
          return htmlToImage.toPng(node, {
            width: 200,
            height: 200,
            style: {
              transform: 'scale(2)',
              transformOrigin: 'top left',
            },
          })
        })
        .then((dataUrl) =>
          Helper.drawDataUrl(dataUrl, { width: 200, height: 200 }),
        )
        .then(Helper.compareToRefImage)
        .then(done)
        .catch(done)
    })

    it('should use node filter', (done) => {
      Helper.bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
        .then((node) =>
          htmlToImage.toPng(node, {
            filter(node) {
              if (node.classList) {
                return !node.classList.contains('omit')
              }
              return true
            },
          }),
        )
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should not apply node filter to root node', (done) => {
      Helper.bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
        .then((node) =>
          htmlToImage.toPng(node, {
            filter(node) {
              if (node.classList) {
                return node.classList.contains('include')
              }
              return false
            },
          }),
        )
        .then(Helper.check)
        .then(done)
        .catch(done)
    })

    it('should only use fontEmbedCss if it is supplied', (done) => {
      const testCss = `
        @font-face {
          name: "Arial";
          src: url("data:AAA") format("woff2");
        }
      `
      Helper.bootstrap(
        'fonts/web-fonts/empty.html',
        'fonts/web-fonts/remote.css',
      )
        .then((node) => htmlToImage.toSvg(node, { fontEmbedCSS: testCss }))
        .then(Helper.getSvgDocument)
        .then((doc) => {
          const styles = Array.from(doc.getElementsByTagName('style'))

          expect(styles).toHaveSize(1)
          expect(styles[0].textContent).toEqual(testCss)
        })
        .then(done)
    })

    it('should embed only the preferred font', (done) => {
      Helper.bootstrap(
        'fonts/web-fonts/empty.html',
        'fonts/web-fonts/remote.css',
      )
        .then((node) =>
          htmlToImage.toSvg(node, { preferredFontFormat: 'woff2' }),
        )
        .then(Helper.getSvgDocument)
        .then((doc) => {
          const [style] = Array.from(doc.getElementsByTagName('style'))

          expect(style.textContent).toMatch(/url\([^)]+\) format\("woff2"\)/)
          expect(style.textContent).not.toMatch(/url\([^)]+\) format\("woff"\)/)
        })
        .then(done)
    })
  })

  describe('special cases', () => {
    it('should not crash when loading external stylesheet causes error', (done) => {
      Helper.bootstrap('ext-css/node.html', 'ext-css/style.css')
        .then(util.delay(1000))
        .then(Helper.renderToPng)
        .then(done)
        .catch(done)
    })
  })

  describe('util', () => {
    describe('parseURLs', () => {
      it('should parse urls', () => {
        expect(embeding.parseURLs('url("http://acme.com/file")')).toEqual([
          'http://acme.com/file',
        ])

        expect(embeding.parseURLs("url(foo.com), url('bar.org')")).toEqual([
          'foo.com',
          'bar.org',
        ])
      })

      it('should ignore data urls', () => {
        expect(embeding.parseURLs('url(foo.com), url(data:AAA)')).toEqual([
          'foo.com',
        ])
      })
    })

    describe('embed', () => {
      it('should embed url', (done) => {
        embeding
          .embed(
            'url(http://acme.com/image.png), url(foo.com)',
            'http://acme.com/image.png',
            null,
            {},
            () => Promise.resolve('AAA'),
          )
          .then((result) => {
            expect(result).toEqual(
              'url(data:image/png;base64,AAA), url(foo.com)',
            )
          })
          .then(done)
          .catch(done)
      })

      it('should resolve urls if base url given', (done) => {
        embeding
          .embed(
            'url(images/image.png)',
            'images/image.png',
            'http://acme.com/',
            {},
            (url) =>
              Promise.resolve(
                (
                  {
                    'http://acme.com/images/image.png': 'AAA',
                  } as any
                )[url],
              ),
          )
          .then((result) => {
            expect(result).toEqual('url(data:image/png;base64,AAA)')
          })
          .then(done)
          .catch(done)
      })
    })
  })
})
