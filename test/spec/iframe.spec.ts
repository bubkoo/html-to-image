/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'
import { delay } from '../../src/util'

describe('work with iframe element', () => {
  it('should render iframe element', (done) => {
    bootstrap('iframe/node.html', undefined, 'iframe/image')
      .then(delay(100))
      .then((node) => {
        const iframe = node.querySelector('#iframe') as HTMLIFrameElement
        return renderAndCheck(node, {
          width: parseInt(iframe.width, 10),
          height: parseInt(iframe.height, 10),
        })
      })
      .then(done)
      .catch(done)
  })
})
