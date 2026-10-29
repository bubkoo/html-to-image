import {
  bootstrap,
  clean,
  assertVisualMatch,
  compareToRefImage,
  drawDataUrl,
  getReferenceImage,
} from './helper'

describe('legacy test fixture failures', () => {
  afterEach(clean)

  it('rejects a missing fixture instead of treating its 404 body as HTML', async () => {
    await expectAsync(bootstrap('missing-fixture-for-test.html')).toBeRejectedWithError(
      /Test fixture request failed \(404\)/,
    )
  })

  it('rejects an invalid image instead of waiting for onload forever', async () => {
    await expectAsync(drawDataUrl('data:image/png;base64,invalid')).toBeRejectedWithError(
      /Test image failed to load/,
    )
  })

  it('rejects a reference comparison with mismatched output dimensions', async () => {
    await bootstrap('small/node.html', 'small/style.css', 'small/image')
    const ref = getReferenceImage()
    await ref.decode()
    const wrongSize = new ImageData(ref.naturalWidth + 1, ref.naturalHeight)
    expect(() => compareToRefImage(wrongSize)).toThrowError(/Capture size/)
  })

  it('rejects a small image with a material local error', () => {
    const reference = new ImageData(100, 10)
    const actual = new ImageData(100, 10)
    for (let i = 0; i < reference.data.length; i += 4) {
      reference.data[i + 3] = 255
      actual.data[i + 3] = 255
    }
    for (let i = 0; i < 20; i += 1) {
      actual.data[4 * i] = 255
    }
    expect(() => assertVisualMatch(actual, reference)).toThrowError(
      /Capture differs at 20\/1000 pixels/,
    )
  })

  it('tolerates a small antialiasing difference', () => {
    const reference = new ImageData(100, 10)
    const actual = new ImageData(100, 10)
    for (let i = 0; i < reference.data.length; i += 4) {
      reference.data[i + 3] = 255
      actual.data[i + 3] = 255
    }
    actual.data[0] = 255
    expect(() => assertVisualMatch(actual, reference)).not.toThrow()
  })
})
