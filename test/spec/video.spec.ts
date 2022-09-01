/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'

describe('work with video element', () => {
  it('should render video element', (done) => {
    bootstrap('video/node.html', 'video/style.css', 'video/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render video element with poster', (done) => {
    bootstrap('video/poster.html', 'video/style.css', 'video/image-poster')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })
})
