/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'

describe('work with canvas element', () => {
  it('should render canvas element', (done) => {
    bootstrap('canvas/node.html', 'canvas/style.css', 'canvas/image')
      .then((node) => {
        const canvas = node.querySelector('#content') as HTMLCanvasElement
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000000'
        ctx.font = '40px serif'
        ctx.fillText('AB2哈', 40, 40)
        return node
      })
      // .then(logDataUrl)
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })
})
