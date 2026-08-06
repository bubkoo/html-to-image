import { createImage } from '../../src/util'
import './setup'

describe('createImage', () => {
  function makePngDataUrl(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL()
  }

  it('should resolve with the loaded image when decode() rejects', (done) => {
    // Safari rejects HTMLImageElement.decode() under memory pressure even for
    // successfully loaded images; without a rejection path the returned promise
    // never settles and every capture waiting on it hangs forever.
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = () =>
      Promise.reject(new Error('decoding failed'))

    createImage(makePngDataUrl())
      .then((image) => {
        expect(image.complete).toBe(true)
        done()
      })
      .catch(done.fail)
      .finally(() => {
        HTMLImageElement.prototype.decode = originalDecode
      })
  })

  it('should still resolve with the image when decode() succeeds', (done) => {
    createImage(makePngDataUrl())
      .then((image) => {
        expect(image.complete).toBe(true)
        done()
      })
      .catch(done.fail)
  })
})
