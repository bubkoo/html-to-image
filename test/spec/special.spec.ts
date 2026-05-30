/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { toPng } from '../../src'
import { cloneNode } from '../../src/clone-node'
import { delay } from '../../src/util'
import { assertTextRendered, bootstrap, renderAndCheck } from '../spec/helper'

describe('special cases', () => {
  xit('should not crash when loading external stylesheet causes error', (done) => {
    bootstrap('ext-css/node.html', 'ext-css/style.css')
      .then(delay(1000))
      .then((node) => {
        toPng(node)
      })
      .then(done)
      .catch(done)
  })

  xit('should render content from shadow node of custom element', (done) => {
    const link = document.createElement('link')
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/mathlive/dist/mathlive.min.js'
    link.rel = 'stylesheet'
    link.crossOrigin = 'anonymous'
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

    Promise.all(tasks).then(() =>
      // eslint-disable-next-line promise/no-nesting
      bootstrap(
        'custom-element/node.html',
        'custom-element/style.css',
        'custom-element/image',
      )
        .then(delay(1000))
        .then(renderAndCheck)
        .then(() => {
          link.remove()
          script.remove()
          done()
        })
        .catch(done),
    )
  })

  it('should caputre lazy loading images', (done) => {
    bootstrap('images/loading.html', 'images/style.css')
      .then(assertTextRendered(['PNG', 'JPG']))
      .then(done)
      .catch(done)
  })

  it('should not duplicate iframe content when cloning', (done) => {
    // Regression test for: cloneChildren() re-appended iframe body childNodes
    // after cloneSingleNode() → cloneIFrameElement() had already recursively
    // cloned the full iframe body, causing every child to appear twice.
    bootstrap('iframe-content/node.html')
      .then((node) => {
        const iframe = node.querySelector('iframe') as HTMLIFrameElement
        // Poll until srcdoc iframe body is accessible (async load)
        return new Promise<HTMLDivElement>((resolve, reject) => {
          let attempts = 0
          const poll = () => {
            attempts++
            const ready =
              iframe.contentDocument?.body?.querySelector('.iframe-para')
            if (ready) {
              resolve(node)
            } else if (attempts > 30) {
              reject(new Error('iframe did not load in time'))
            } else {
              setTimeout(poll, 100)
            }
          }
          poll()
        })
      })
      .then((node) => cloneNode(node, {}, true))
      .then((clonedNode) => {
        expect(clonedNode).not.toBeNull()
        // With the bug: two .iframe-para elements appear (duplicate children).
        // With the fix: exactly one .iframe-para appears.
        const paras = clonedNode!.querySelectorAll('.iframe-para')
        expect(paras.length).toBe(1)
      })
      .then(done)
      .catch(done)
  })
})
