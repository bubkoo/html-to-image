/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'
import { delay } from '../../src/util'

describe('work with video element', () => {
  it('should render video element', async () => {
    await bootstrap('video/node.html', 'video/style.css', 'video/image')
      .then(delay(1000))
      .then(renderAndCheck)
  })

  it('should render video element with poster', async () => {
    await bootstrap(
      'video/poster.html',
      'video/style.css',
      'video/image-poster',
    )
      .then(delay(1000))
      .then(renderAndCheck)
  })
})
