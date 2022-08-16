/* eslint-disable promise/no-callback-in-promise */

import * as util from '../../src/util'
import { clean, bootstrap, renderToPng } from './helper'

describe('html-to-image', () => {
  beforeAll(() => {
    process.env.devicePixelRatio = '1'
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
  })

  afterAll(() => {
    delete process.env.devicePixelRatio
    clean()
  })

  describe('special cases', () => {
    it('should not crash when loading external stylesheet causes error', (done) => {
      bootstrap('ext-css/node.html', 'ext-css/style.css')
        .then(util.delay(1000))
        .then((node) => {
          renderToPng(node)
        })
        .then(done)
        .catch(done)
    })
  })
})
