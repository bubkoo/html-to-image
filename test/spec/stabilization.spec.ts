/* eslint-disable promise/no-callback-in-promise */

import * as htmlToImage from '../../src'
import { clean, bootstrap, renderAndCheck } from './helper'
import './setup'

describe('stabilizationAttempts option', () => {
  afterAll(clean)

  it('should render correctly with stabilization enabled', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) => renderAndCheck(node, { stabilizationAttempts: 3 }))
      .then(done)
      .catch(done.fail)
  })

  it('should return the same image as a single capture for stable content', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) =>
        htmlToImage.toPng(node).then((singleCapture) =>
          htmlToImage
            .toPng(node, { stabilizationAttempts: 3 })
            .then((stabilizedCapture) => {
              expect(stabilizedCapture).toBe(singleCapture)
            }),
        ),
      )
      .then(done)
      .catch(done.fail)
  })

  it('should apply stabilization to blob captures too', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) => htmlToImage.toBlob(node, { stabilizationAttempts: 2 }))
      .then((blob) => {
        expect(blob).not.toBeNull()
        expect(blob!.size).toBeGreaterThan(0)
        done()
      })
      .catch(done.fail)
  })
})
