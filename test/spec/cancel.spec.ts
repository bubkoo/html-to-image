/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { toPng, toSvg, toJpeg, toBlob, toCanvas, toPixelData } from '../../src'
import { bootstrap } from './helper'

declare const describe: any
declare const it: any
declare const expect: any

describe('cancel functionality', () => {
  it('should cancel toPng operation', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toPng(node, { signal: controller.signal })

        // Cancel immediately
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  it('should cancel toSvg operation', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toSvg(node, { signal: controller.signal })

        // Cancel immediately
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  it('should cancel toJpeg operation', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toJpeg(node, { signal: controller.signal })

        // Cancel immediately
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  it('should cancel toBlob operation', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toBlob(node, { signal: controller.signal })

        // Cancel immediately
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  it('should cancel toCanvas operation', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toCanvas(node, { signal: controller.signal })

        // Cancel immediately
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  it('should cancel toPixelData operation', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toPixelData(node, { signal: controller.signal })

        // Cancel immediately
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  it('should allow successful operation when not cancelled', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        return toPng(node, { signal: controller.signal })
      })
      .then((dataUrl) => {
        expect(dataUrl).toMatch(/^data:image\/png;base64,/)
        done()
      })
      .catch(done)
  })

  it('should cancel font embedding operation', (done: any) => {
    const controller = new AbortController()

    // Create a node with web fonts that will trigger font embedding
    const node = document.createElement('div')
    node.innerHTML =
      '<div style="font-family: Arial, sans-serif;">Test content with fonts</div>'

    // Add a style element with @font-face that will trigger font embedding
    const style = document.createElement('style')
    style.textContent = `
      @font-face {
        font-family: 'TestFont';
        src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2') format('woff2');
      }
      .test-font {
        font-family: 'TestFont', Arial, sans-serif;
      }
    `
    document.head.appendChild(style)

    // Add the font class to trigger font embedding
    const divElement = node.querySelector('div')
    if (divElement) {
      divElement.classList.add('test-font')
    }

    const promise = toPng(node, {
      signal: controller.signal,
      skipFonts: false, // Ensure font embedding is enabled
    })

    // Cancel immediately
    controller.abort()

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        // Clean up
        document.head.removeChild(style)
        done()
      })
  })

  it('should cancel during CSS import processing', (done: any) => {
    const controller = new AbortController()

    // Create a node with external CSS that would trigger import processing
    const node = document.createElement('div')
    node.innerHTML = '<div style="font-family: Arial;">Test content</div>'

    // Add a link to external CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap'
    document.head.appendChild(link)

    const promise = toPng(node, {
      signal: controller.signal,
      skipFonts: false,
    })

    // Cancel immediately
    controller.abort()

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        // Clean up
        document.head.removeChild(link)
        done()
      })
  })

  // 実際の処理進行中にキャンセルできることをテストするケース
  xit('should cancel during image processing', (done: any) => {
    const controller = new AbortController()

    // Create a node with data URLs instead of external images
    const node = document.createElement('div')
    node.innerHTML = `
      <div style="width: 200px; height: 200px;">
        <div style="width: 50px; height: 50px; background: red; display: inline-block; margin: 5px;"></div>
        <div style="width: 50px; height: 50px; background: green; display: inline-block; margin: 5px;"></div>
        <div style="width: 50px; height: 50px; background: blue; display: inline-block; margin: 5px;"></div>
        <div style="width: 50px; height: 50px; background: yellow; display: inline-block; margin: 5px;"></div>
      </div>
    `

    const promise = toPng(node, {
      signal: controller.signal,
      cacheBust: true, // Force fresh processing
    })

    // Cancel after a short delay to allow processing to start
    setTimeout(() => {
      controller.abort()
    }, 50)

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  xit('should cancel during complex DOM processing', (done: any) => {
    const controller = new AbortController()

    // Create a complex DOM structure with many elements
    const node = document.createElement('div')
    let html = '<div style="width: 300px; height: 300px; padding: 20px;">'

    // Add many nested elements to create complex processing
    for (let i = 0; i < 50; i++) {
      html += `<div style="margin: 2px; padding: 5px; border: 1px solid #ccc;">
        <span style="color: #333;">Element ${i}</span>
        <div style="background: linear-gradient(45deg, #f0f0f0, #e0e0e0); padding: 3px;">
          <p style="margin: 0; font-size: 12px;">Nested content ${i}</p>
        </div>
      </div>`
    }
    html += '</div>'
    node.innerHTML = html

    const promise = toPng(node, {
      signal: controller.signal,
      pixelRatio: 2, // Higher resolution for more processing
    })

    // Cancel after a short delay
    setTimeout(() => {
      controller.abort()
    }, 30)

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  xit('should cancel during font embedding with multiple fonts', (done: any) => {
    const controller = new AbortController()

    // Create a node with multiple web fonts using data URLs
    const node = document.createElement('div')
    node.innerHTML =
      '<div style="font-family: Arial, sans-serif;">Test content with multiple fonts</div>'

    // Add multiple font faces using data URLs to avoid network requests
    const style = document.createElement('style')
    style.textContent = `
      @font-face {
        font-family: 'TestFont1';
        src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
      }
      @font-face {
        font-family: 'TestFont2';
        src: url('data:font/woff2;base64,d09GMgABAAAAAB') format('woff2');
      }
      @font-face {
        font-family: 'TestFont3';
        src: url('data:font/woff2;base64,d09GMgABAAAAAC') format('woff2');
      }
      .font1 { font-family: 'TestFont1', Arial, sans-serif; }
      .font2 { font-family: 'TestFont2', Arial, sans-serif; }
      .font3 { font-family: 'TestFont3', Arial, sans-serif; }
    `
    document.head.appendChild(style)

    // Add font classes to trigger embedding
    const divElement = node.querySelector('div')
    if (divElement) {
      divElement.classList.add('font1', 'font2', 'font3')
    }

    const promise = toPng(node, {
      signal: controller.signal,
      skipFonts: false,
    })

    // Cancel after a short delay to allow font embedding to start
    setTimeout(() => {
      controller.abort()
    }, 40)

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        // Clean up
        document.head.removeChild(style)
        done()
      })
  })

  it('should handle multiple cancel operations', (done: any) => {
    const controller1 = new AbortController()
    const controller2 = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        // Start first operation
        const promise1 = toPng(node, { signal: controller1.signal })

        // Start second operation
        const promise2 = toPng(node, { signal: controller2.signal })

        // Cancel first operation
        controller1.abort()

        // Cancel second operation
        controller2.abort()

        // Both should be rejected
        return Promise.allSettled([promise1, promise2])
      })
      .then((results) => {
        expect(results[0].status).toBe('rejected')
        expect(results[1].status).toBe('rejected')
        expect((results[0] as any).reason.message).toBe('Operation aborted')
        expect((results[1] as any).reason.message).toBe('Operation aborted')
        done()
      })
      .catch(done)
  })

  it('should cancel and then start new operation successfully', (done: any) => {
    const controller1 = new AbortController()
    const controller2 = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        // Start and cancel first operation
        const promise1 = toPng(node, { signal: controller1.signal })
        controller1.abort()

        return promise1.catch(() => {
          // After first operation is cancelled, start second operation
          return toPng(node, { signal: controller2.signal })
        })
      })
      .then((dataUrl) => {
        expect(dataUrl).toMatch(/^data:image\/png;base64,/)
        done()
      })
      .catch(done)
  })

  xit('should demonstrate cancellation effectiveness', (done: any) => {
    const controller = new AbortController()

    // Create a complex node that takes time to process
    const node = document.createElement('div')
    let html = '<div style="width: 400px; height: 400px; padding: 20px;">'

    // Add many elements with complex styling
    for (let i = 0; i < 100; i++) {
      html += `<div style="
        margin: 1px; 
        padding: 8px; 
        border: 1px solid #ccc;
        background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <span style="color: #333; font-weight: bold;">Element ${i}</span>
        <div style="background: rgba(255,255,255,0.8); padding: 4px; margin-top: 4px;">
          <p style="margin: 0; font-size: 11px; line-height: 1.4;">Complex nested content with multiple lines of text ${i}</p>
        </div>
      </div>`
    }
    html += '</div>'
    node.innerHTML = html

    const startTime = Date.now()

    const promise = toPng(node, {
      signal: controller.signal,
      pixelRatio: 2, // Higher resolution for more processing
      cacheBust: true,
    })

    // Cancel after a short delay
    setTimeout(() => {
      controller.abort()
    }, 20)

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        const endTime = Date.now()
        const processingTime = endTime - startTime

        expect(error.message).toBe('Operation aborted')
        // Verify that processing was cancelled quickly (should be less than 100ms)
        expect(processingTime).toBeLessThan(100)
        done()
      })
  })

  it('should handle rapid cancellation requests', (done: any) => {
    const controller = new AbortController()

    bootstrap('text/node.html', 'text/style.css')
      .then((node) => {
        const promise = toPng(node, { signal: controller.signal })

        // Rapidly call abort multiple times
        controller.abort()
        controller.abort()
        controller.abort()

        return promise
      })
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        done()
      })
  })

  // キャンセル時間測定テスト
  describe('cancellation timing tests', () => {
    it('should cancel within 100ms for simple content', (done: any) => {
      const controller = new AbortController()

      // Create a simple node
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="width: 100px; height: 100px; background: red;">Simple content</div>'

      const promise = toPng(node, { signal: controller.signal })

      // Measure cancellation time
      const cancelStartTime = Date.now()
      controller.abort()

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const cancelEndTime = Date.now()
          const cancellationTime = cancelEndTime - cancelStartTime

          // eslint-disable-next-line no-console
          console.log(`Simple content cancellation time: ${cancellationTime}ms`)
          expect(error.message).toBe('Operation aborted')
          expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms
          done()
        })
    })

    it('should cancel within 100ms for complex content', (done: any) => {
      const controller = new AbortController()

      // Create a complex node
      const node = document.createElement('div')
      let html = '<div style="width: 300px; height: 300px; padding: 20px;">'
      for (let i = 0; i < 50; i++) {
        html += `<div style="margin: 2px; padding: 5px; border: 1px solid #ccc; background: #f9f9f9;">
          <span>Element ${i}</span>
        </div>`
      }
      html += '</div>'
      node.innerHTML = html

      const promise = toPng(node, {
        signal: controller.signal,
        pixelRatio: 2,
      })

      // Measure cancellation time
      const cancelStartTime = Date.now()
      controller.abort()

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const cancelEndTime = Date.now()
          const cancellationTime = cancelEndTime - cancelStartTime

          // eslint-disable-next-line no-console
          console.log(
            `Complex content cancellation time: ${cancellationTime}ms`,
          )
          expect(error.message).toBe('Operation aborted')
          expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms
          done()
        })
    })

    it('should cancel within 100ms during font embedding', (done: any) => {
      const controller = new AbortController()

      // Create a node with web fonts
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="font-family: Arial, sans-serif;">Test content with fonts</div>'

      // Add font face to trigger embedding
      const style = document.createElement('style')
      style.textContent = `
        @font-face {
          font-family: 'TestFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
        }
        .test-font {
          font-family: 'TestFont', Arial, sans-serif;
        }
      `
      document.head.appendChild(style)

      // Add font class to trigger embedding
      const divElement = node.querySelector('div')
      if (divElement) {
        divElement.classList.add('test-font')
      }

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
      })

      // Measure cancellation time
      const cancelStartTime = Date.now()
      controller.abort()

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const cancelEndTime = Date.now()
          const cancellationTime = cancelEndTime - cancelStartTime

          // eslint-disable-next-line no-console
          console.log(`Font embedding cancellation time: ${cancellationTime}ms`)
          expect(error.message).toBe('Operation aborted')
          expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

          // Clean up
          document.head.removeChild(style)
          done()
        })
    })

    it('should cancel within 100ms for all main functions', (done: any) => {
      const controller = new AbortController()

      // Create a simple node
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="width: 100px; height: 100px; background: blue;">Test content</div>'

      // Test all main functions
      const functions = [
        { name: 'toPng', func: toPng },
        { name: 'toSvg', func: toSvg },
        { name: 'toJpeg', func: toJpeg },
        { name: 'toBlob', func: toBlob },
        { name: 'toCanvas', func: toCanvas },
        { name: 'toPixelData', func: toPixelData },
      ]

      let completedTests = 0
      const totalTests = functions.length

      functions.forEach(({ name, func }) => {
        const promise = func(node, { signal: controller.signal })

        // Measure cancellation time
        const cancelStartTime = Date.now()
        controller.abort()

        promise
          .then(() => {
            done.fail(`Promise for ${name} should have been rejected`)
          })
          .catch((error) => {
            const cancelEndTime = Date.now()
            const cancellationTime = cancelEndTime - cancelStartTime

            // eslint-disable-next-line no-console
            console.log(`${name} cancellation time: ${cancellationTime}ms`)
            expect(error.message).toBe('Operation aborted')
            expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

            completedTests += 1
            if (completedTests === totalTests) {
              done()
            }
          })
      })
    })

    it('should cancel within 100ms for multiple simultaneous operations', (done: any) => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const controller3 = new AbortController()

      // Create a simple node
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="width: 100px; height: 100px; background: green;">Test content</div>'

      // Test multiple simultaneous operations
      const promise1 = toPng(node, { signal: controller1.signal })
      const promise2 = toSvg(node, { signal: controller2.signal })
      const promise3 = toJpeg(node, { signal: controller3.signal })

      // Cancel all operations and measure time
      const cancelStartTime = Date.now()
      controller1.abort()
      controller2.abort()
      controller3.abort()

      Promise.allSettled([promise1, promise2, promise3]).then((results) => {
        const cancelEndTime = Date.now()
        const cancellationTime = cancelEndTime - cancelStartTime

        // eslint-disable-next-line no-console
        console.log(
          `Multiple operations cancellation time: ${cancellationTime}ms`,
        )

        results.forEach((result) => {
          expect(result.status).toBe('rejected')
          expect((result as any).reason.message).toBe('Operation aborted')
        })

        expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms
        done()
      })
    })

    it('should measure cancellation time with different content complexities', (done: any) => {
      const controller = new AbortController()

      // Create nodes with different complexities
      const simpleNode = document.createElement('div')
      simpleNode.innerHTML =
        '<div style="width: 50px; height: 50px; background: red;">Simple</div>'

      const mediumNode = document.createElement('div')
      let mediumHtml =
        '<div style="width: 200px; height: 200px; padding: 10px;">'
      for (let i = 0; i < 20; i++) {
        mediumHtml += `<div style="margin: 1px; padding: 3px; border: 1px solid #ccc;">Item ${i}</div>`
      }
      mediumHtml += '</div>'
      mediumNode.innerHTML = mediumHtml

      const complexNode = document.createElement('div')
      let complexHtml =
        '<div style="width: 400px; height: 400px; padding: 20px;">'
      for (let i = 0; i < 100; i++) {
        complexHtml += `<div style="margin: 2px; padding: 5px; border: 1px solid #ccc; background: linear-gradient(45deg, #f0f0f0, #e0e0e0);">
          <span>Complex Item ${i}</span>
        </div>`
      }
      complexHtml += '</div>'
      complexNode.innerHTML = complexHtml

      const nodes = [
        { name: 'Simple', node: simpleNode },
        { name: 'Medium', node: mediumNode },
        { name: 'Complex', node: complexNode },
      ]

      let completedTests = 0
      const totalTests = nodes.length

      nodes.forEach(({ name, node }) => {
        const promise = toPng(node, { signal: controller.signal })

        // Measure cancellation time
        const cancelStartTime = Date.now()
        controller.abort()

        promise
          .then(() => {
            done.fail(`Promise for ${name} should have been rejected`)
          })
          .catch((error) => {
            const cancelEndTime = Date.now()
            const cancellationTime = cancelEndTime - cancelStartTime

            // eslint-disable-next-line no-console
            console.log(
              `${name} content cancellation time: ${cancellationTime}ms`,
            )
            expect(error.message).toBe('Operation aborted')
            expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

            completedTests += 1
            if (completedTests === totalTests) {
              done()
            }
          })
      })
    })
  })

  // Font Embed処理中のキャンセル詳細検証テスト
  describe('font embedding cancellation detailed tests', () => {
    xit('should cancel during multiple font embedding with timing measurement', (done: any) => {
      const controller = new AbortController()

      // Create a node with multiple web fonts
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="font-family: Arial, sans-serif;">Test content with multiple fonts</div>'

      // Add multiple font faces to trigger longer font embedding
      const style = document.createElement('style')
      style.textContent = `
        @font-face {
          font-family: 'TestFont1';
          src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
        }
        @font-face {
          font-family: 'TestFont2';
          src: url('data:font/woff2;base64,d09GMgABAAAAAB') format('woff2');
        }
        @font-face {
          font-family: 'TestFont3';
          src: url('data:font/woff2;base64,d09GMgABAAAAAC') format('woff2');
        }
        @font-face {
          font-family: 'TestFont4';
          src: url('data:font/woff2;base64,d09GMgABAAAAAD') format('woff2');
        }
        @font-face {
          font-family: 'TestFont5';
          src: url('data:font/woff2;base64,d09GMgABAAAAAE') format('woff2');
        }
        .font1 { font-family: 'TestFont1', Arial, sans-serif; }
        .font2 { font-family: 'TestFont2', Arial, sans-serif; }
        .font3 { font-family: 'TestFont3', Arial, sans-serif; }
        .font4 { font-family: 'TestFont4', Arial, sans-serif; }
        .font5 { font-family: 'TestFont5', Arial, sans-serif; }
      `
      document.head.appendChild(style)

      // Add font classes to trigger embedding
      const divElement = node.querySelector('div')
      if (divElement) {
        divElement.classList.add('font1', 'font2', 'font3', 'font4', 'font5')
      }

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
      })

      // Cancel after a short delay to allow font embedding to start
      setTimeout(() => {
        const cancelStartTime = Date.now()
        controller.abort()

        promise
          .then(() => {
            done.fail('Promise should have been rejected')
          })
          .catch((error) => {
            const cancelEndTime = Date.now()
            const totalTime = cancelEndTime - startTime
            const cancellationTime = cancelEndTime - cancelStartTime

            // eslint-disable-next-line no-console
            console.log(
              `Multiple font embedding - Total time: ${totalTime}ms, Cancellation time: ${cancellationTime}ms`,
            )
            expect(error.message).toBe('Operation aborted')
            expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

            // Clean up
            document.head.removeChild(style)
            done()
          })
      }, 10) // Very short delay to allow processing to start
    })

    xit('should cancel during CSS import processing with timing measurement', (done: any) => {
      const controller = new AbortController()

      // Create a node with external CSS that would trigger import processing
      const node = document.createElement('div')
      node.innerHTML = '<div style="font-family: Arial;">Test content</div>'

      // Add multiple link elements to trigger CSS import processing
      const link1 = document.createElement('link')
      link1.rel = 'stylesheet'
      link1.href = 'data:text/css;base64,LyogVGVzdCBDU1MgMSAqLw=='
      document.head.appendChild(link1)

      const link2 = document.createElement('link')
      link2.rel = 'stylesheet'
      link2.href = 'data:text/css;base64,LyogVGVzdCBDU1MgMiAqLw=='
      document.head.appendChild(link2)

      const link3 = document.createElement('link')
      link3.rel = 'stylesheet'
      link3.href = 'data:text/css;base64,LyogVGVzdCBDU1MgMyAqLw=='
      document.head.appendChild(link3)

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
      })

      // Cancel after a short delay
      setTimeout(() => {
        const cancelStartTime = Date.now()
        controller.abort()

        promise
          .then(() => {
            done.fail('Promise should have been rejected')
          })
          .catch((error) => {
            const cancelEndTime = Date.now()
            const totalTime = cancelEndTime - startTime
            const cancellationTime = cancelEndTime - cancelStartTime

            // eslint-disable-next-line no-console
            console.log(
              `CSS import processing - Total time: ${totalTime}ms, Cancellation time: ${cancellationTime}ms`,
            )
            expect(error.message).toBe('Operation aborted')
            expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

            // Clean up
            document.head.removeChild(link1)
            document.head.removeChild(link2)
            document.head.removeChild(link3)
            done()
          })
      }, 10) // Very short delay
    })

    xit('should cancel during font embedding with external font URLs', (done: any) => {
      const controller = new AbortController()

      // Create a node with external font URLs
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="font-family: Arial, sans-serif;">Test content with external fonts</div>'

      // Add font face with external URL to trigger network request
      const style = document.createElement('style')
      style.textContent = `
        @font-face {
          font-family: 'ExternalFont';
          src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2') format('woff2');
        }
        .external-font {
          font-family: 'ExternalFont', Arial, sans-serif;
        }
      `
      document.head.appendChild(style)

      // Add font class to trigger embedding
      const divElement = node.querySelector('div')
      if (divElement) {
        divElement.classList.add('external-font')
      }

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
      })

      // Cancel after a short delay to allow network request to start
      setTimeout(() => {
        const cancelStartTime = Date.now()
        controller.abort()

        promise
          .then(() => {
            done.fail('Promise should have been rejected')
          })
          .catch((error) => {
            const cancelEndTime = Date.now()
            const totalTime = cancelEndTime - startTime
            const cancellationTime = cancelEndTime - cancelStartTime

            // eslint-disable-next-line no-console
            console.log(
              `External font embedding - Total time: ${totalTime}ms, Cancellation time: ${cancellationTime}ms`,
            )
            expect(error.message).toBe('Operation aborted')
            expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

            // Clean up
            document.head.removeChild(style)
            done()
          })
      }, 10) // Very short delay
    })

    xit('should cancel during complex font embedding scenario', (done: any) => {
      const controller = new AbortController()

      // Create a complex node with multiple font scenarios
      const node = document.createElement('div')
      node.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1>Title with custom font</h1>
          <p>Paragraph with different font</p>
          <span>Span with another font</span>
          <div>Div with yet another font</div>
        </div>
      `

      // Add multiple font faces with different scenarios
      const style = document.createElement('style')
      style.textContent = `
        @font-face {
          font-family: 'TitleFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
        }
        @font-face {
          font-family: 'ParagraphFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAB') format('woff2');
        }
        @font-face {
          font-family: 'SpanFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAC') format('woff2');
        }
        @font-face {
          font-family: 'DivFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAD') format('woff2');
        }
        .title-font { font-family: 'TitleFont', Arial, sans-serif; }
        .paragraph-font { font-family: 'ParagraphFont', Arial, sans-serif; }
        .span-font { font-family: 'SpanFont', Arial, sans-serif; }
        .div-font { font-family: 'DivFont', Arial, sans-serif; }
      `
      document.head.appendChild(style)

      // Add font classes to different elements
      const h1Element = node.querySelector('h1')
      const pElement = node.querySelector('p')
      const spanElement = node.querySelector('span')
      const divElement = node.querySelector('div > div')

      if (h1Element) h1Element.classList.add('title-font')
      if (pElement) pElement.classList.add('paragraph-font')
      if (spanElement) spanElement.classList.add('span-font')
      if (divElement) divElement.classList.add('div-font')

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
        pixelRatio: 2,
      })

      // Cancel after a short delay
      setTimeout(() => {
        const cancelStartTime = Date.now()
        controller.abort()

        promise
          .then(() => {
            done.fail('Promise should have been rejected')
          })
          .catch((error) => {
            const cancelEndTime = Date.now()
            const totalTime = cancelEndTime - startTime
            const cancellationTime = cancelEndTime - cancelStartTime

            // eslint-disable-next-line no-console
            console.log(
              `Complex font embedding - Total time: ${totalTime}ms, Cancellation time: ${cancellationTime}ms`,
            )
            expect(error.message).toBe('Operation aborted')
            expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

            // Clean up
            document.head.removeChild(style)
            done()
          })
      }, 10) // Very short delay
    })

    it('should measure cancellation time at different stages of font embedding', (done: any) => {
      const controller = new AbortController()

      // Create a node with fonts
      const node = document.createElement('div')
      node.innerHTML =
        '<div style="font-family: Arial, sans-serif;">Test content</div>'

      // Add font face
      const style = document.createElement('style')
      style.textContent = `
        @font-face {
          font-family: 'TestFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
        }
        .test-font {
          font-family: 'TestFont', Arial, sans-serif;
        }
      `
      document.head.appendChild(style)

      // Add font class
      const divElement = node.querySelector('div')
      if (divElement) {
        divElement.classList.add('test-font')
      }

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
      })

      // Cancel immediately
      const cancelStartTime = Date.now()
      controller.abort()

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const cancelEndTime = Date.now()
          const totalTime = cancelEndTime - startTime
          const cancellationTime = cancelEndTime - cancelStartTime

          // eslint-disable-next-line no-console
          console.log(
            `Font embedding immediate cancel - Total time: ${totalTime}ms, Cancellation time: ${cancellationTime}ms`,
          )
          expect(error.message).toBe('Operation aborted')
          expect(cancellationTime).toBeLessThan(100) // Should cancel within 100ms

          // Clean up
          document.head.removeChild(style)
          done()
        })
    })
  })

  xit('should cancel during different processing stages', (done: any) => {
    const controller = new AbortController()

    // Create a node that triggers multiple processing stages
    const node = document.createElement('div')
    node.innerHTML = `
      <div style="width: 200px; height: 200px; padding: 10px;">
        <h2 style="font-family: Arial, sans-serif; color: #333;">Test Title</h2>
        <p style="font-family: Arial, sans-serif; color: #666;">Test paragraph with some text content.</p>
        <div style="width: 80px; height: 60px; background: red; margin: 10px 0;"></div>
        <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); padding: 10px; margin-top: 10px;">
          <span style="color: white; font-weight: bold;">Gradient Background</span>
        </div>
      </div>
    `

    // Add external font using data URL to trigger font embedding
    const style = document.createElement('style')
    style.textContent = `
      @font-face {
        font-family: 'TestFont';
        src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
      }
      .custom-font {
        font-family: 'TestFont', Arial, sans-serif;
      }
    `
    document.head.appendChild(style)

    // Add font class to trigger embedding
    const h2Element = node.querySelector('h2')
    if (h2Element) {
      h2Element.classList.add('custom-font')
    }

    const promise = toPng(node, {
      signal: controller.signal,
      skipFonts: false,
      cacheBust: true,
    })

    // Cancel at different stages
    setTimeout(() => {
      controller.abort()
    }, 25)

    promise
      .then(() => {
        done.fail('Promise should have been rejected')
      })
      .catch((error) => {
        expect(error.message).toBe('Operation aborted')
        // Clean up
        document.head.removeChild(style)
        done()
      })
  })

  // 総合テストケース：数秒置きにキャンセルするテスト
  describe('comprehensive cancellation scenarios', () => {
    xit('should cancel after 1 second delay', (done: any) => {
      const controller = new AbortController()

      // Create a complex node that takes time to process
      const node = document.createElement('div')
      let html = '<div style="width: 500px; height: 500px; padding: 30px;">'

      // Add many elements with complex styling to ensure processing takes time
      for (let i = 0; i < 200; i++) {
        html += `<div style="
          margin: 2px; 
          padding: 10px; 
          border: 2px solid #ccc;
          background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          position: relative;
        ">
          <span style="color: #333; font-weight: bold; font-size: 14px;">Element ${i}</span>
          <div style="background: rgba(255,255,255,0.9); padding: 6px; margin-top: 6px; border-radius: 4px;">
            <p style="margin: 0; font-size: 12px; line-height: 1.5;">Complex nested content with multiple lines of text for element ${i}. This should create enough processing load.</p>
          </div>
        </div>`
      }
      html += '</div>'
      node.innerHTML = html

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        pixelRatio: 2, // Higher resolution for more processing
        cacheBust: true,
      })

      // Cancel after 1 second
      setTimeout(() => {
        controller.abort()
      }, 1000)

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const endTime = Date.now()
          const processingTime = endTime - startTime

          expect(error.message).toBe('Operation aborted')
          // Should be cancelled within reasonable time (1-2 seconds)
          expect(processingTime).toBeGreaterThan(900) // At least 900ms
          expect(processingTime).toBeLessThan(2000) // Less than 2 seconds
          done()
        })
    })

    xit('should cancel after 2 seconds delay', (done: any) => {
      const controller = new AbortController()

      // Create a node with external resources to trigger longer processing
      const node = document.createElement('div')
      node.innerHTML = `
        <div style="width: 400px; height: 400px; padding: 20px;">
          <h1 style="font-family: Arial, sans-serif; color: #333; font-size: 24px;">Large Document Title</h1>
          <p style="font-family: Arial, sans-serif; color: #666; font-size: 16px; line-height: 1.6;">
            This is a large document with multiple paragraphs and complex styling. 
            It should take some time to process and render properly.
          </p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">
              <h3>Section 1</h3>
              <p>Content with gradient background</p>
            </div>
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; color: white;">
              <h3>Section 2</h3>
              <p>More content with different gradient</p>
            </div>
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; color: white;">
              <h3>Section 3</h3>
              <p>Even more content with blue gradient</p>
            </div>
          </div>
          <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #333; margin-top: 0;">Summary</h2>
            <p style="color: #666; margin-bottom: 0;">This document contains various styling elements including gradients, grids, and complex layouts.</p>
          </div>
        </div>
      `

      // Add multiple font faces to trigger font embedding
      const style = document.createElement('style')
      style.textContent = `
        @font-face {
          font-family: 'TestFont1';
          src: url('data:font/woff2;base64,d09GMgABAAAAAA') format('woff2');
        }
        @font-face {
          font-family: 'TestFont2';
          src: url('data:font/woff2;base64,d09GMgABAAAAAB') format('woff2');
        }
        .font1 { font-family: 'TestFont1', Arial, sans-serif; }
        .font2 { font-family: 'TestFont2', Arial, sans-serif; }
      `
      document.head.appendChild(style)

      // Add font classes to trigger embedding
      const h1Element = node.querySelector('h1')
      const h2Element = node.querySelector('h2')
      if (h1Element) h1Element.classList.add('font1')
      if (h2Element) h2Element.classList.add('font2')

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        skipFonts: false,
        pixelRatio: 2,
        cacheBust: true,
      })

      // Cancel after 2 seconds
      setTimeout(() => {
        controller.abort()
      }, 2000)

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const endTime = Date.now()
          const processingTime = endTime - startTime

          expect(error.message).toBe('Operation aborted')
          // Should be cancelled within reasonable time (1.5-3 seconds)
          expect(processingTime).toBeGreaterThan(1800) // At least 1.8 seconds
          expect(processingTime).toBeLessThan(3000) // Less than 3 seconds

          // Clean up
          document.head.removeChild(style)
          done()
        })
    })

    xit('should cancel after 3 seconds delay with very complex content', (done: any) => {
      const controller = new AbortController()

      // Create a very complex node with many nested elements
      const node = document.createElement('div')
      let html =
        '<div style="width: 600px; height: 800px; padding: 40px; background: linear-gradient(45deg, #f0f0f0, #e0e0e0);">'

      // Add header section
      html += `
        <header style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="margin: 0; color: #333; font-size: 28px; text-align: center;">Complex Document</h1>
          <p style="margin: 10px 0 0 0; color: #666; text-align: center;">This document contains many complex elements</p>
        </header>
      `

      // Add multiple sections with complex styling
      for (let section = 0; section < 5; section++) {
        html += `
          <section style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Section ${
              section + 1
            }</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        `

        // Add multiple items in each section
        for (let item = 0; item < 8; item++) {
          html += `
            <div style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 15px;
              border-radius: 8px;
              color: white;
              position: relative;
              overflow: hidden;
            ">
              <h3 style="margin: 0 0 8px 0; font-size: 16px;">Item ${
                item + 1
              }</h3>
              <p style="margin: 0; font-size: 14px; line-height: 1.4;">
                This is item ${item + 1} in section ${
            section + 1
          }. It contains some text content.
              </p>
              <div style="
                position: absolute;
                top: 0;
                right: 0;
                width: 20px;
                height: 20px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
              "></div>
            </div>
          `
        }

        html += `
            </div>
          </section>
        `
      }

      // Add footer
      html += `
        <footer style="background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="margin: 0; color: #666;">Document footer with additional information</p>
        </footer>
      `

      html += '</div>'
      node.innerHTML = html

      const startTime = Date.now()

      const promise = toPng(node, {
        signal: controller.signal,
        pixelRatio: 2,
        cacheBust: true,
      })

      // Cancel after 3 seconds
      setTimeout(() => {
        controller.abort()
      }, 3000)

      promise
        .then(() => {
          done.fail('Promise should have been rejected')
        })
        .catch((error) => {
          const endTime = Date.now()
          const processingTime = endTime - startTime

          expect(error.message).toBe('Operation aborted')
          // Should be cancelled within reasonable time (2.5-4 seconds)
          expect(processingTime).toBeGreaterThan(2500) // At least 2.5 seconds
          expect(processingTime).toBeLessThan(4000) // Less than 4 seconds
          done()
        })
    })

    xit('should handle multiple operations with staggered cancellation', (done: any) => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      const controller3 = new AbortController()

      // Create a complex node
      const node = document.createElement('div')
      let html = '<div style="width: 400px; height: 400px; padding: 20px;">'
      for (let i = 0; i < 100; i++) {
        html += `<div style="margin: 2px; padding: 8px; border: 1px solid #ccc; background: #f9f9f9;">
          <span>Element ${i}</span>
        </div>`
      }
      html += '</div>'
      node.innerHTML = html

      const startTime = Date.now()
      const results: any[] = []

      // Start first operation
      toPng(node, { signal: controller1.signal, pixelRatio: 2 })
        .then(() => ({ status: 'success', operation: 1 }))
        .catch((error) => ({
          status: 'cancelled',
          operation: 1,
          error: error.message,
        }))

      // Start second operation after 500ms
      setTimeout(() => {
        toPng(node, { signal: controller2.signal, pixelRatio: 2 })
          .then(() => ({ status: 'success', operation: 2 }))
          .catch((error) => ({
            status: 'cancelled',
            operation: 2,
            error: error.message,
          }))
          .then((result) => results.push(result))
      }, 500)

      // Start third operation after 1000ms
      setTimeout(() => {
        toPng(node, { signal: controller3.signal, pixelRatio: 2 })
          .then(() => ({ status: 'success', operation: 3 }))
          .catch((error) => ({
            status: 'cancelled',
            operation: 3,
            error: error.message,
          }))
          .then((result) => results.push(result))
      }, 1000)

      // Cancel operations at different times
      setTimeout(() => controller1.abort(), 1500) // Cancel first after 1.5s
      setTimeout(() => controller2.abort(), 2500) // Cancel second after 2.5s
      setTimeout(() => controller3.abort(), 3500) // Cancel third after 3.5s

      // Wait for all operations to complete
      setTimeout(() => {
        const endTime = Date.now()
        const totalTime = endTime - startTime

        expect(results.length).toBe(2) // Second and third operations should complete
        expect(results[0].status).toBe('cancelled')
        expect(results[0].error).toBe('Operation aborted')
        expect(results[1].status).toBe('cancelled')
        expect(results[1].error).toBe('Operation aborted')

        // Total time should be reasonable
        expect(totalTime).toBeGreaterThan(3000) // At least 3 seconds
        expect(totalTime).toBeLessThan(5000) // Less than 5 seconds

        done()
      }, 4000)
    })
  })
})
