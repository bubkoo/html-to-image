import { Options } from './types'
import { cloneNode } from './clone-node'
import { embedImages } from './embed-images'
import { applyStyle, inlineCSSStyle } from './style'
import { embedWebFonts, getWebFontCSS } from './embed-webfonts'
import {
  getImageSize,
  getPixelRatio,
  createImage,
  canvasToBlob,
  nodeToDataURL,
  checkCanvasDimensions,
  waitForNextFrame,
  addHiddenDomElement,
  isIOS,
} from './util'

async function renderSvg<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<{
  svg: string
  width: number
  height: number
}> {
  const clonedNode = (await cloneNode(node, options)) as HTMLElement
  applyStyle(clonedNode, options)

  const removeElement = addHiddenDomElement(clonedNode)
  try {
    await waitForNextFrame()
    inlineCSSStyle(clonedNode, options)
    const { width, height } = getImageSize(clonedNode, options)

    removeElement()
    await embedImages(clonedNode, options)
    await embedWebFonts(clonedNode, options)

    const svg = await nodeToDataURL(clonedNode, width, height)
    return { svg, width, height }
  } catch (error) {
    removeElement()
    throw error
  }
}

export async function toSvg<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  const { svg } = await renderSvg(node, options)
  return svg
}

export async function toCanvas<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<HTMLCanvasElement> {
  const { svg, width, height } = await renderSvg(node, options)
  const img = await createImage(svg)
  await waitForNextFrame()

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

  const scaleX = canvasWidth ? canvas.width / canvasWidth : 1
  const scaleY = canvasHeight ? canvas.height / canvasHeight : 1
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0)

  canvas.style.width = `${canvasWidth}px`
  canvas.style.height = `${canvasHeight}px`
  canvas.style.minWidth = `${canvasWidth}px`
  canvas.style.maxWidth = `${canvasWidth}px`

  if (options.style?.backgroundColor) {
    context.fillStyle = options.style.backgroundColor
    context.fillRect(0, 0, canvasWidth, canvasHeight)
  }

  context.drawImage(img, 0, 0, canvasWidth, canvasHeight)

  if (isIOS()) {
    await waitForNextFrame()
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.drawImage(img, 0, 0, canvasWidth, canvasHeight)
  }

  return canvas
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

export async function getFontEmbedCSS<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  return getWebFontCSS(node, options)
}

export { Cache } from './cache'
