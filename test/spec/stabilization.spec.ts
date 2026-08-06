/* eslint-disable promise/no-callback-in-promise */

import * as htmlToImage from '../../src'
import { bootstrap, renderAndCheck } from './helper'
import './setup'

describe('stabilizationAttempts option', () => {
  it('should render correctly with stabilization enabled', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) => renderAndCheck(node, { stabilizationAttempts: 3 }))
      .then(done)
      .catch(done.fail)
  })

  it('should produce the same pixels as a single capture for stable content', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) =>
        htmlToImage.toPixelData(node).then((singlePixels) =>
          htmlToImage
            .toPixelData(node, { stabilizationAttempts: 3 })
            .then((stabilizedPixels) => {
              expect(stabilizedPixels.length).toBe(singlePixels.length)
              let differingBytes = 0
              for (let i = 0; i < singlePixels.length; i += 1) {
                if (singlePixels[i] !== stabilizedPixels[i]) {
                  differingBytes += 1
                }
              }
              expect(differingBytes).toBe(0)
            }),
        ),
      )
      .then(done)
      .catch(done.fail)
  })

  it('should not loop unboundedly for a non-finite attempts value', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) =>
        htmlToImage.toPng(node, { stabilizationAttempts: Infinity }),
      )
      .then((dataUrl) => {
        expect(dataUrl.length).toBeGreaterThan(0)
        done()
      })
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
