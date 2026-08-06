import { Options } from './types'
import { cloneNode } from './clone-node'
import { embedImages } from './embed-images'
import { applyStyle } from './apply-style'
import { embedWebFonts, getWebFontCSS } from './embed-webfonts'
import {
  getImageSize,
  getPixelRatio,
  createImage,
  canvasToBlob,
  nodeToDataURL,
  checkCanvasDimensions,
} from './util'

export async function toSvg<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  const { width, height } = getImageSize(node, options)
  const clonedNode = (await cloneNode(node, options, true)) as HTMLElement
  await embedWebFonts(clonedNode, options)
  await embedImages(clonedNode, options)
  applyStyle(clonedNode, options)
  const datauri = await nodeToDataURL(clonedNode, width, height)
  return datauri
}

async function captureCanvas<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<HTMLCanvasElement> {
  const { width, height } = getImageSize(node, options)
  const svg = await toSvg(node, options)
  const img = await createImage(svg)

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

export async function toCanvas<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<HTMLCanvasElement> {
  const attempts = Math.max(1, options.stabilizationAttempts || 1)
  let canvas = await captureCanvas(node, options)
  if (attempts === 1) {
    return canvas
  }

  // WebKit can rasterize the intermediate SVG before its large embedded images
  // have decoded, leaving them blank - and a re-capture can come back blank
  // again, so captures repeat until two consecutive results agree.
  let previous = canvas.toDataURL()
  for (let attempt = 1; attempt < attempts; attempt += 1) {
    // sequential on purpose - every capture is compared against the previous one
    // eslint-disable-next-line no-await-in-loop
    canvas = await captureCanvas(node, options)
    const current = canvas.toDataURL()
    if (current === previous) {
      break
    }
    previous = current
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
