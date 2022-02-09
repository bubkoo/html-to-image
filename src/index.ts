import { Options } from './options'
import { cloneNode } from './cloneNode'
import { embedImages } from './embedImages'
import { applyStyleWithOptions } from './applyStyleWithOptions'
import { embedWebFonts, getWebFontCSS } from './embedWebFonts'
import {
  getNodeWidth,
  getNodeHeight,
  getPixelRatio,
  createImage,
  canvasToBlob,
  nodeToDataURL,
  SVG_PREFIX,
} from './util'

function getImageSize(node: HTMLElement, options: Options = {}) {
  const width = options.width || getNodeWidth(node)
  const height = options.height || getNodeHeight(node)

  return { width, height }
}

/**
 * The CSS of the cloned node may be changed by users,
 * So the width and height need to be resolved from dataUrl
 * @param dataUrl SVG dataUrl
 * @param options configuration
 * @returns width and height
 */
function getImageSizeFromSVGDataUrl(dataUrl: string, options: Options) {
  const decodeUrl = decodeURIComponent(dataUrl)
  const div = document.createElement('div')
  div.innerHTML = decodeUrl.substring(SVG_PREFIX.length)
  const svgElement = div.firstChild as SVGElement
  return {
    width:
      options.width || parseFloat(svgElement?.getAttribute('width') || '0'),
    height:
      options.height || parseFloat(svgElement?.getAttribute('height') || '0'),
  }
}

function getClonedNodeImageSize(node: HTMLElement, options: Options = {}) {
  // Cloned Node need be inserted to DOM Tree so that calculate the clientHeight
  const container = document.createElement('div')
  container.setAttribute(
    'style',
    'position: absolute; top: 0; left: 0; z-index:-1000; opacity: 0;',
  )
  document.body.append(container)
  container.append(node)
  const { width, height } = getImageSize(node, options)
  container.remove()
  return { width, height }
}

export async function toSvg<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  return Promise.resolve(node)
    .then((nativeNode) => cloneNode(nativeNode, options, true))
    .then((clonedNode) => embedWebFonts(clonedNode!, options))
    .then((clonedNode) => embedImages(clonedNode, options))
    .then((clonedNode) => applyStyleWithOptions(clonedNode, options))
    .then((clonedNode) => {
      // clonedNode maybe changed by uer, insert to dom and calculate width and height
      const { width, height } = getClonedNodeImageSize(clonedNode, options)
      return nodeToDataURL(clonedNode, width, height)
    })
}

const dimensionCanvasLimit = 16384 // as per https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size

function checkCanvasDimensions(canvas: HTMLCanvasElement) {
  if (
    canvas.width > dimensionCanvasLimit ||
    canvas.height > dimensionCanvasLimit
  ) {
    if (
      canvas.width > dimensionCanvasLimit &&
      canvas.height > dimensionCanvasLimit
    ) {
      if (canvas.width > canvas.height) {
        canvas.height *= dimensionCanvasLimit / canvas.width
        canvas.width = dimensionCanvasLimit
      } else {
        canvas.width *= dimensionCanvasLimit / canvas.height
        canvas.height = dimensionCanvasLimit
      }
    } else if (canvas.width > dimensionCanvasLimit) {
      canvas.height *= dimensionCanvasLimit / canvas.width
      canvas.width = dimensionCanvasLimit
    } else {
      canvas.width *= dimensionCanvasLimit / canvas.height
      canvas.height = dimensionCanvasLimit
    }
  }
}
export async function toCanvas<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<HTMLCanvasElement> {
  return toSvg(node, options)
    .then(createImage)
    .then((img) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      const ratio = options.pixelRatio || getPixelRatio()
      const { width, height } = getImageSizeFromSVGDataUrl(img.src, options)

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
    })
}

export async function toPixelData<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<Uint8ClampedArray> {
  const { width, height } = getImageSize(node, options)
  return toCanvas(node, options).then((canvas) => {
    const ctx = canvas.getContext('2d')!
    return ctx.getImageData(0, 0, width, height).data
  })
}

export async function toPng<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  return toCanvas(node, options).then((canvas) => canvas.toDataURL())
}

export async function toJpeg<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  return toCanvas(node, options).then((canvas) =>
    canvas.toDataURL('image/jpeg', options.quality || 1),
  )
}

export async function toBlob<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<Blob | null> {
  return toCanvas(node, options).then(canvasToBlob)
}

export async function getFontEmbedCSS<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  return getWebFontCSS(node, options)
}
