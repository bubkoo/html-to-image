import * as htmlToImage from '../../src'
import { clean, bootstrap } from './helper'
import './setup'

describe('toBlob', () => {
  afterAll(clean)

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
})
