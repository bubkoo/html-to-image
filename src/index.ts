import { cloneNode } from './cloneNode'
import { embedImages } from './embedImages'
import { embedWebFonts } from './embedWebFonts'
import { createSvgDataURL } from './createSvgDataURL'
import { applyStyleWithOptions } from './applyStyleWithOptions'
import {
  delay,
  createImage,
  canvasToBlob,
  getNodeWidth,
  getNodeHeight,
  getPixelRatio,
} from './util'

export type Options = {
  /**
   * Width in pixels to be applied to node before rendering.
   */
  width?: number
  /**
   * Height in pixels to be applied to node before rendering.
   */
  height?: number
  /**
   * A string value for the background color, any valid CSS color value.
   */
  backgroundColor?: string
  /**
   * An object whose properties to be copied to node's style before rendering.
   */
  style?: Partial<CSSStyleDeclaration>
  /**
   * A function taking DOM node as argument. Should return `true` if passed
   * node should be included in the output. Excluding node means excluding
   * it's children as well.
   */
  filter?: (domNode: HTMLElement) => boolean
  /**
   * A number between `0` and `1` indicating image quality (e.g. 0.92 => 92%)
   * of the JPEG image.
   */
  quality?: number
  /**
   * Set to `true` to append the current time as a query string to URL
   * requests to enable cache busting.
   */
  cacheBust?: boolean
  /**
   * A data URL for a placeholder image that will be used when fetching
   * an image fails. Defaults to an empty string and will render empty
   * areas for failed images.
   */
  imagePlaceholder?: string
  /**
   * The pixel ratio of captured image. Defalut is the actual pixel ratio of
   * the device. Set 1 to use as initial-scale 1 for the image
   */
  pixelRatio?: number
  /**
   * Option to skip the fonts download and embed.
   */
  skipFonts?: boolean
}

function getImageSize(domNode: HTMLElement, options: Options = {}) {
  const width = options.width || getNodeWidth(domNode)
  const height = options.height || getNodeHeight(domNode)
  return { width, height }
}

export async function toSvg(
  domNode: HTMLElement,
  options: Options = {},
): Promise<string> {
  const { width, height } = getImageSize(domNode, options)

  return cloneNode(domNode, options.filter, true)
    .then((clonedNode) => embedWebFonts(clonedNode!, options))
    .then((clonedNode) => embedImages(clonedNode, options))
    .then((clonedNode) => applyStyleWithOptions(clonedNode, options))
    .then((clonedNode) => createSvgDataURL(clonedNode, width, height))
}

export const toSvgDataURL = toSvg

export async function toCanvas(
  domNode: HTMLElement,
  options: Options = {},
): Promise<HTMLCanvasElement> {
  return toSvg(domNode, options)
    .then(createImage)
    .then(delay(100))
    .then((image) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      const ratio = options.pixelRatio || getPixelRatio()
      const { width, height } = getImageSize(domNode, options)

      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}`
      canvas.style.height = `${height}`

      if (options.backgroundColor) {
        context.fillStyle = options.backgroundColor
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.drawImage(image, 0, 0)

      return canvas
    })
}

export async function toPixelData(
  domNode: HTMLElement,
  options: Options = {},
): Promise<Uint8ClampedArray> {
  const { width, height } = getImageSize(domNode, options)
  return toCanvas(domNode, options).then((canvas) => {
    const ctx = canvas.getContext('2d')!
    return ctx.getImageData(0, 0, width, height).data
  })
}

export async function toPng(
  domNode: HTMLElement,
  options: Options = {},
): Promise<string> {
  return toCanvas(domNode, options).then((canvas) => canvas.toDataURL())
}

export async function toJpeg(
  domNode: HTMLElement,
  options: Options = {},
): Promise<string> {
  return toCanvas(domNode, options).then((canvas) =>
    canvas.toDataURL('image/jpeg', options.quality || 1),
  )
}

export async function toBlob(
  domNode: HTMLElement,
  options: Options = {},
): Promise<Blob | null> {
  return toCanvas(domNode, options).then(canvasToBlob)
}
