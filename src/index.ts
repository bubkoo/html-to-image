import cloneNode from './cloneNode'
import embedWebFonts from './embedWebFonts'
import embedImages from './embedImages'
import createSvgDataURL from './createSvgDataURL'
import applyStyleWithOptions from './applyStyleWithOptions'
import {
  createImage,
  delay,
  canvasToBlob,
  getNodeWidth,
  getNodeHeight,
  getPixelRatio,
} from './utils'

export type OptionsType = {
  /**
   * A function taking DOM node as argument. Should return `true`
   * if passed node should be included in the output. Excluding
   * node means excluding it's children as well.
  */
  filter?: (domNode: HTMLElement) => boolean,
  width?: number,
  height?: number,
  style?: Object,
  /**
   * A number between `0` and `1` indicating image quality (e.g. 0.92 => 92%)
   * of the JPEG image.
  */
  quality?: number,
  /**
   * A string value for the background color, any valid CSS color value.
  */
  backgroundColor?: string,
  /**
   * Set to `true` to append the current time as a query string to URL
   * requests to enable cache busting.
  */
  cacheBust?: boolean,
  /**
   * A data URL for a placeholder image that will be used when fetching
   * an image fails. Defaults to an empty string and will render empty
   * areas for failed images.
  */
  imagePlaceholder?: string,
}

function getImageSize(domNode: HTMLElement, options: OptionsType = {}) {
  const width = options.width || getNodeWidth(domNode)
  const height = options.height || getNodeHeight(domNode)
  return { width, height }
}

export function toSvgDataURL(
  domNode: HTMLElement,
  options: OptionsType = {},
): Promise<string> {
  const { width, height } = getImageSize(domNode, options)

  return cloneNode(domNode, options.filter, true)
    .then(clonedNode => embedWebFonts(clonedNode!, options))
    .then(clonedNode => embedImages(clonedNode, options))
    .then(clonedNode => applyStyleWithOptions(clonedNode, options))
    .then(clonedNode => createSvgDataURL(clonedNode, width, height))
}

export function toCanvas(
  domNode: HTMLElement,
  options: OptionsType = {},
): Promise<HTMLCanvasElement> {
  return toSvgDataURL(domNode, options)
    .then(createImage)
    .then(delay(100))
    .then((image) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      const ratio = getPixelRatio()
      const { width, height } = getImageSize(domNode, options)

      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}`
      canvas.style.height = `${height}`
      context.scale(ratio, ratio)

      if (options.backgroundColor) {
        context.fillStyle = options.backgroundColor
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.drawImage(image, 0, 0)

      return canvas
    })
}

export function toPixelData(
  domNode: HTMLElement,
  options: OptionsType = {},
): Promise<Uint8ClampedArray> {
  const { width, height } = getImageSize(domNode, options)
  return toCanvas(domNode, options)
    .then(canvas => (
      canvas.getContext('2d')!.getImageData(0, 0, width, height).data
    ))
}

export function toPng(
  domNode: HTMLElement,
  options: OptionsType = {},
): Promise<string> {
  return toCanvas(domNode, options).then(canvas => (
    canvas.toDataURL()
  ))
}

export function toJpeg(
  domNode: HTMLElement,
  options: OptionsType = {},
): Promise<string> {
  return toCanvas(domNode, options).then(canvas => (
    canvas.toDataURL('image/jpeg', options.quality || 1)
  ))
}

export function toBlob(
  domNode: HTMLElement,
  options: OptionsType = {},
): Promise<Blob | null> {
  return toCanvas(domNode, options).then(canvasToBlob)
}

export default {
  toSvgDataURL,
  toCanvas,
  toPixelData,
  toPng,
  toJpeg,
  toBlob,
}
