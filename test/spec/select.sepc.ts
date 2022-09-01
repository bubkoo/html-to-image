/* eslint-disable promise/no-callback-in-promise */

import './setup'
import { bootstrap, renderAndCheck } from './helper'

describe('work with select element', () => {
  ;['first', 'second', 'third'].forEach((text) => {
    it(`should capture ${text} selected option`, (done) => {
      bootstrap(
        `select/${text}-option.html`,
        'select/style.css',
        `select/${text}`,
      )
        .then(renderAndCheck)
        .then(done)
        .catch(done)
    })
  })
})
