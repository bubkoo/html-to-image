/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { toPng } from '../../src'
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
})
