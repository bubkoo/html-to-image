let sequence = 0

export async function createEmptyVideoFixture(mode) {
  if (!['empty', 'selected', 'play-pause'].includes(mode))
    throw new Error('Unknown empty video fixture mode')
  const video = document.createElement('video')
  video.id = `empty-video-${++sequence}`
  video.style.cssText =
    'display:block;box-sizing:content-box;width:60px;height:40px;border:2px solid yellow;background:blue'
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  document.body.append(video)
  const dispose = () => {
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
  }
  try {
    if (mode !== 'empty') {
      const selected = new Promise((resolve) => {
        video.addEventListener('loadstart', resolve, { once: true })
      })
      video.src = `/test/browser/fixtures/video-pending.mp4?case=${sequence}`
      video.load()
      await selected
      if (!video.currentSrc)
        throw new Error('Pending video did not select its HTTP source')
    }
    if (mode === 'play-pause') {
      void video.play().catch(() => {})
      video.pause()
    }
    if (
      video.readyState !== video.HAVE_NOTHING ||
      video.videoWidth ||
      video.videoHeight ||
      video.poster ||
      video.error
    )
      throw new Error('Empty video native setup control failed')
    return {
      video,
      dispose,
      async run(toImageData) {
        const markup = video.outerHTML
        const box = video.getBoundingClientRect()
        const image = await toImageData(video, {
          pixelRatio: 1,
          skipFonts: true,
        })
        if (image.width !== box.width || image.height !== box.height)
          throw new Error('Empty video lost its native border box')
        const points = [
          [0, 0, [255, 255, 0, 255]],
          [1, 20, [255, 255, 0, 255]],
          [30, 20, [0, 0, 255, 255]],
          [63, 20, [255, 255, 0, 255]],
          [30, 43, [255, 255, 0, 255]],
        ]
        points.forEach(([x, y, expected]) => {
          const offset = 4 * (y * image.width + x)
          const actual = Array.from(image.data.slice(offset, offset + 4))
          if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error(`Empty video ${mode} pixel at ${x},${y}: ${actual}`)
        })
        if (
          markup !== video.outerHTML ||
          video.readyState !== video.HAVE_NOTHING
        )
          throw new Error('Empty video capture changed its source')
        return {
          mode,
          width: image.width,
          height: image.height,
          sourceUnchanged: true,
          readyState: video.readyState,
          selectedSource: Boolean(video.currentSrc),
        }
      },
    }
  } catch (error) {
    dispose()
    throw error
  }
}
