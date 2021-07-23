import { Options } from './options'
import { cloneNode } from './cloneNode'
import { embedImages } from './embedImages'
import { embedWebFonts, getWebFontCss } from './embedWebFonts'
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

  return cloneNode(domNode, options, true)
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

      const canvasWidth = options.canvasWidth || width
      const canvasHeight = options.canvasHeight || height

      canvas.width = canvasWidth * ratio
      canvas.height = canvasHeight * ratio
      canvas.style.width = `${canvasWidth}`
      canvas.style.height = `${canvasHeight}`

      if (options.backgroundColor) {
        context.fillStyle = options.backgroundColor
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

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

export async function getWebFontEmbedCss(
  domNode: HTMLElement,
  options: Options = {},
): Promise<string> {
  return getWebFontCss(domNode, options)
}
