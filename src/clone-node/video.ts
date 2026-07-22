import type { Options } from '../types'
import { imageToDataUrl } from '../dataurl'
import { getMimeType } from '../mimes'
import { createImage, toArray } from '../util'

export async function cloneVideoElement(
  video: HTMLVideoElement,
  options: Options,
) {
  if (video.currentSrc) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    context?.drawImage(video, 0, 0, canvas.width, canvas.height)

    return createVideoImage(video, canvas.toDataURL())
  }

  const poster = video.poster
  const dataURL = await imageToDataUrl(poster, getMimeType(poster), options)
  return createVideoImage(video, dataURL)
}

async function createVideoImage(video: HTMLVideoElement, dataURL: string) {
  const style = window.getComputedStyle(video)
  const cssText =
    style.cssText ||
    toArray<string>(style)
      .map((name) => {
        const priority = style.getPropertyPriority(name)
        return `${name}: ${style.getPropertyValue(name)}${
          priority ? ` !${priority}` : ''
        };`
      })
      .join(' ')
  const image = await createImage(dataURL)

  image.style.cssText = cssText
  return image
}
