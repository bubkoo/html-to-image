import { afterEach, expect, test } from 'vitest'
import { createRenderer } from '../../src'

const nodes: HTMLElement[] = []

function scene() {
  const node = document.createElement('div')
  node.style.cssText = 'width:20px;height:20px'
  node.innerHTML =
    '<img src="data:image/png;base64,broken" width="20" height="20">'
  document.body.append(node)
  nodes.push(node)
  return node
}

afterEach(() => nodes.splice(0).forEach((node) => node.remove()))

test('waits for asynchronous image recovery before freezing the snapshot', async () => {
  const node = scene()
  const source = node.querySelector('img')!
  const renderer = createRenderer({ skipFonts: true, pixelRatio: 1 })
  let entered!: () => void
  let release!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const recovery = new Promise<void>((resolve) => {
    release = resolve
  })
  let calledOnClone = false
  const pending = renderer.capture(node, {
    onImageErrorHandler: async function () {
      calledOnClone =
        (this as unknown) !== source &&
        (this as unknown as HTMLImageElement).tagName === 'IMG'
      entered()
      await recovery
      const replacement = document.createElement('div')
      replacement.style.cssText = 'width:20px;height:20px;background:green'
      ;(this as unknown as HTMLImageElement).replaceWith(replacement)
    },
  })
  try {
    await started
    expect(calledOnClone).toBe(true)
    const state = await Promise.race([
      pending.then(() => 'finished'),
      new Promise((resolve) => {
        setTimeout(() => resolve('waiting'), 50)
      }),
    ])
    expect(state).toBe('waiting')
    release()
    const capture = await pending
    const image = await capture.toImageData()
    const offset = 4 * (10 * image.width + 10)
    expect(Array.from(image.data.slice(offset, offset + 4))).toEqual([
      0, 128, 0, 255,
    ])
    expect(node.querySelector('img')).toBe(source)
    expect(source.getAttribute('src')).toBe('data:image/png;base64,broken')
  } finally {
    release()
    await pending.catch(() => {})
    renderer.dispose()
  }
})

test.each(['synchronous', 'asynchronous'])(
  'propagates %s image error handler failures',
  async (mode) => {
    const renderer = createRenderer({ skipFonts: true })
    const failure = new Error('recovery failed')
    // Observe the rejection independently so the old implementation fails its
    // assertion without introducing an unrelated unhandled rejection.
    const rejected = Promise.reject(failure)
    rejected.catch(() => {})
    try {
      await expect(
        renderer.capture(scene(), {
          onImageErrorHandler: () => {
            if (mode === 'synchronous') throw failure
            return rejected
          },
        }),
      ).rejects.toBe(failure)
    } finally {
      renderer.dispose()
    }
  },
)
