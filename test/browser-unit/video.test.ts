import { expect, test } from 'vitest'
import { toImageData } from '../../src'

test.each(['empty', 'selected', 'play-pause'])(
  'a video without a frame or poster preserves its visible background: %s',
  async (mode) => {
    const url = '/test/browser/fixtures/empty-video.mjs'
    const { createEmptyVideoFixture } = await import(/* @vite-ignore */ url)
    const fixture = await createEmptyVideoFixture(mode)
    try {
      const result = await fixture.run(toImageData)
      expect([result.width, result.height]).toEqual([64, 44])
      expect(result.sourceUnchanged).toBe(true)
      expect(result.readyState).toBe(0)
      expect(result.selectedSource).toBe(mode !== 'empty')
    } finally {
      fixture.dispose()
    }
  },
)

test('a video frame keeps its intrinsic aspect ratio inside object-fit: contain', async () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:240px;height:160px'
  const video = document.createElement('video')
  video.style.cssText =
    'display:block;width:240px;height:160px;object-fit:contain;background:rgb(255,0,255)'
  video.preload = 'auto'
  video.muted = true
  video.innerHTML =
    '<source src="/base/test/resources/video/flower.webm" type="video/webm">' +
    '<source src="/base/test/resources/video/flower.mp4" type="video/mp4">'
  root.append(video)
  document.body.append(root)

  try {
    const loaded = new Promise<void>((resolve, reject) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true })
      video.addEventListener(
        'error',
        () => reject(new Error('Video fixture failed to load')),
        { once: true },
      )
    })
    video.load()
    await loaded
    expect([video.videoWidth, video.videoHeight]).toEqual([960, 540])

    const image = await toImageData(root, { pixelRatio: 1, skipFonts: true })
    const top = Array.from(
      image.data.slice(
        (2 * image.width + 120) * 4,
        (2 * image.width + 121) * 4,
      ),
    )
    const center = Array.from(
      image.data.slice(
        (80 * image.width + 120) * 4,
        (80 * image.width + 121) * 4,
      ),
    )
    expect(top).toEqual([255, 0, 255, 255])
    expect(center).not.toEqual(top)
  } finally {
    video.pause()
    root.remove()
  }
})
