import { Options } from './types'
import { cloneNode } from './clone-node'
// import { embedImages } from './embed-images'
import { applyStyle } from './apply-style'
// import { embedWebFonts, getWebFontCSS } from './embed-webfonts'
import {
  getImageSize,
  getPixelRatio,
  canvasToBlob,
  nodeToDataURL,
  checkCanvasDimensions,
  getDimensionLimit,
  svgUrlToImg,
} from './util'

export async function toSvg<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  const { width, height } = getImageSize(node, options)
  const clonedNode = (await cloneNode(node, options, true)) as HTMLElement
  // await embedWebFonts(clonedNode, options)
  // await embedImages(clonedNode, options)
  applyStyle(clonedNode, options)
  const datauri = await nodeToDataURL(
    clonedNode,
    width,
    height,
    options,
  )
  return datauri
}

export async function toImage<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<HTMLImageElement> {
  const svg = await toSvg(node, options)
  return svgUrlToImg(svg, options)
}

export async function toCanvas<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<HTMLCanvasElement> {
  const img = await toImage(node, options)
  const { width, height } = getImageSize(node, options, img)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  const ratio = options.pixelRatio || getPixelRatio()
  const canvasWidth = options.canvasWidth || width
  const canvasHeight = options.canvasHeight || height

  canvas.width = canvasWidth * ratio
  canvas.height = canvasHeight * ratio

  if (!options.skipAutoScale) {
    checkCanvasDimensions(canvas)
  }
  canvas.style.width = `${canvasWidth}`
  canvas.style.height = `${canvasHeight}`

  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  context.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas
}

export async function toCanvasList<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<Array<HTMLCanvasElement>> {
  const img = await toImage(node, options)
  const { width, height } = getImageSize(node, options, img)
  const ratio = options.pixelRatio || getPixelRatio()
  let canvasWidth = (options.canvasWidth || width) * ratio
  let canvasHeight = (options.canvasHeight || height) * ratio
  const dimensionLimit = getDimensionLimit()
  if (canvasWidth > dimensionLimit) {
    canvasHeight *= dimensionLimit / canvasWidth
    canvasWidth = dimensionLimit
  }

  const result: Array<HTMLCanvasElement> = []
  const scale = canvasWidth / img.width
  for (let curY = 0; curY < canvasHeight; curY += dimensionLimit) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const height1 = Math.min(canvasHeight - curY, dimensionLimit)
    canvas.width = canvasWidth
    canvas.height = height1
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(
      img,
      0,
      curY / scale,
      canvasWidth / scale,
      height1 / scale,
      0,
      0,
      canvasWidth,
      height1,
    )
    result.push(canvas)
  }
  return result
}

export async function toPixelData<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<Uint8ClampedArray> {
  const { width, height } = getImageSize(node, options)
  const canvas = await toCanvas(node, options)
  const ctx = canvas.getContext('2d')!
  return ctx.getImageData(0, 0, width, height).data
}

export async function toPng<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  const canvas = await toCanvas(node, options)
  return canvas.toDataURL()
}

export async function toJpeg<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  const canvas = await toCanvas(node, options)
  return canvas.toDataURL('image/jpeg', options.quality || 1)
}

export async function toBlob<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<Blob | null> {
  const canvas = await toCanvas(node, options)
  const blob = await canvasToBlob(canvas)
  return blob
}

// export async function getFontEmbedCSS<T extends HTMLElement>(
//   node: T,
//   options: Options = {},
// ): Promise<string> {
//   return getWebFontCSS(node, options)
// }
