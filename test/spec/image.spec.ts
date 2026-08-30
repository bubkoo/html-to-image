import '../spec/setup'
import { embedImages } from '../../src/embed-images'
import { createImage, delay } from '../../src/util'

const SIZE = 8

// A fresh data url every time, so that no test can be served from a decoded
// image the browser already has around.
function createDataUrl() {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')!
  const channel = () => Math.floor(Math.random() * 256)
  context.fillStyle = `rgb(${channel()}, ${channel()}, ${channel()})`
  context.fillRect(0, 0, SIZE, SIZE)
  return canvas.toDataURL()
}

async function withDecode(stub: () => Promise<void>, fn: () => Promise<void>) {
  const { decode } = HTMLImageElement.prototype
  HTMLImageElement.prototype.decode = stub
  try {
    await fn()
  } finally {
    HTMLImageElement.prototype.decode = decode
  }
}

function withFailingDecode(fn: () => Promise<void>) {
  return withDecode(() => Promise.reject(new Error('decode failed')), fn)
}

describe('images', () => {
  it('should not resolve until an image with a data url is decoded', async () => {
    let decoded: () => void
    const decoding = new Promise<void>((resolve) => {
      decoded = resolve
    })

    await withDecode(
      () => decoding,
      async () => {
        const node = document.createElement('img')
        node.src = createDataUrl()

        let embedded = false
        const embedding = embedImages(node, {}).then(() => {
          embedded = true
        })

        await delay(50)(null)
        expect(embedded).toBeFalse()

        decoded()
        await embedding
        expect(embedded).toBeTrue()
        expect(node.naturalWidth).toBe(SIZE)
      },
    )
  })

  it('should leave decode() intact on an inlined image', async () => {
    const node = document.createElement('img')
    node.src = '/base/test/resources/images/image.png'

    await embedImages(node, {})

    expect(node.src.startsWith('data:')).toBeTrue()
    await expectAsync(node.decode()).toBeResolved()
  })

  it('should embed images when decode() rejects', async () => {
    await withFailingDecode(async () => {
      const node = document.createElement('img')
      node.src = createDataUrl()

      await embedImages(node, {})

      expect(node.complete).toBeTrue()
    })
  })

  it('should create an image when decode() rejects', async () => {
    await withFailingDecode(async () => {
      const image = await createImage(createDataUrl())

      expect(image.naturalWidth).toBe(SIZE)
    })
  })
})
