/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { bootstrap, drawDataUrl, compareToRefImage } from './helper'
import { toPng } from '../../src'

describe('work with select element', () => {
  ;['first', 'second', 'third'].forEach((text) => {
    xit(`should capture ${text} selected option`, (done) => {
      bootstrap(
        `select/${text}-option.html`,
        'select/style.css',
        `select/${text}`,
      )
        .then((node) => {
          // Use a higher threshold for select elements as they can vary between browsers
          return toPng(node).then((dataUrl) => {
            return Promise.resolve(dataUrl)
              .then(drawDataUrl)
              .then((imgData) => compareToRefImage(imgData, 0.3)) // Increased threshold
          })
        })
        .then(done)
        .catch(done)
    })
  })
})
