/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'
import { delay } from '../../src/util'

describe('work with video element', () => {
  it('should render video element', (done) => {
    bootstrap('video/node.html', 'video/style.css', 'video/image')
      .then(delay(1000))
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render video element with poster', (done) => {
    bootstrap('video/poster.html', 'video/style.css', 'video/image-poster')
      .then(delay(1000))
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })
})
