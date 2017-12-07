import {
  createImage,
  getPixelRatio,
  getMimeType,
  getDataURLContent,
} from './utils'


export default function getBlobFromImageURL(url) {
  return createImage(url).then((image) => {
    const { width, height } = image

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const ratio = getPixelRatio(context)

    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = width
    canvas.style.height = height

    context.scale(ratio, ratio)
    context.drawImage(image, 0, 0)

    const dataURL = canvas.toDataURL(getMimeType(url))

    return getDataURLContent(dataURL)
  })
}
