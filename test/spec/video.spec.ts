/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'
import { delay } from '../../src/util'
import { cloneNode } from '../../src/clone-node'

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

  it('should copy computed video styles to the replacement image', async () => {
    const root = await bootstrap('video/poster.html', 'video/style.css')
    const video = root.querySelector('video')!
    video.style.objectFit = 'cover'
    video.style.objectPosition = '25% 75%'
    const computedStyle = window.getComputedStyle(video)

    const clone = await cloneNode(video, {})
    const image = clone as unknown as HTMLImageElement

    expect(image).toEqual(jasmine.any(HTMLImageElement))
    expect(image.style.width).toBe(computedStyle.width)
    expect(image.style.height).toBe(computedStyle.height)
    expect(image.style.objectFit).toBe(computedStyle.objectFit)
    expect(image.style.objectPosition).toBe(computedStyle.objectPosition)
  })
})
