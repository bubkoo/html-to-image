/* eslint-disable promise/no-callback-in-promise */

import * as htmlToImage from '../../src'
import { bootstrap } from './helper'
import './setup'

describe('toBlob', () => {
  it('should produce a png blob by default', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) => htmlToImage.toBlob(node))
      .then((blob) => {
        expect(blob).not.toBeNull()
        expect(blob!.type).toBe('image/png')
        done()
      })
      .catch(done.fail)
  })

  it('should honor the type option', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) => htmlToImage.toBlob(node, { type: 'image/jpeg' }))
      .then((blob) => {
        expect(blob).not.toBeNull()
        expect(blob!.type).toBe('image/jpeg')
        done()
      })
      .catch(done.fail)
  })

  it('should honor the quality option', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) =>
        Promise.all([
          htmlToImage.toBlob(node, { type: 'image/jpeg', quality: 0.01 }),
          htmlToImage.toBlob(node, { type: 'image/jpeg', quality: 1 }),
        ]),
      )
      .then(([lowQualityBlob, highQualityBlob]) => {
        expect(lowQualityBlob!.size).toBeLessThan(highQualityBlob!.size)
        done()
      })
      .catch(done.fail)
  })

  it('should treat quality 0 as a valid value, not as unset', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then((node) =>
        Promise.all([
          htmlToImage.toBlob(node, { type: 'image/jpeg', quality: 0 }),
          htmlToImage.toBlob(node, { type: 'image/jpeg', quality: 1 }),
        ]),
      )
      .then(([zeroQualityBlob, fullQualityBlob]) => {
        expect(zeroQualityBlob!.size).toBeLessThan(fullQualityBlob!.size)
        done()
      })
      .catch(done.fail)
  })
})
