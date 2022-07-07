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
} from './util'

function getImageSize(
  node: HTMLElement,
  options: Options = {},
  window: Window,
) {
  const width = options.width || getNodeWidth(node, window)
  const height = options.height || getNodeHeight(node, window)

  return { width, height }
}

export async function toSvg<T extends HTMLElement>(
  node: T,
  document: Document,
  nodeWindow: Window,
  options: Options = {},
): Promise<string> {
  const { width, height } = getImageSize(node, options, nodeWindow)

  return Promise.resolve(node)
    .then((nativeNode) =>
      cloneNode(nativeNode, options, document, nodeWindow, true),
    )
    .then((clonedNode) =>
      embedWebFonts(clonedNode!, options, document, nodeWindow),
    )
    .then((clonedNode) =>
      embedImages(clonedNode, options, document, nodeWindow),
    )
    .then((clonedNode) => applyStyleWithOptions(clonedNode, options))
    .then((clonedNode) => nodeToDataURL(clonedNode, width, height, document))
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
  let doc: Document
  let nodeToDraw: HTMLElement
  let nodeWindow: Window
  if (node instanceof HTMLIFrameElement) {
    const iframe = node
    doc = iframe.contentDocument ?? document
    nodeToDraw = doc.body as HTMLElement
    nodeWindow = iframe.contentWindow ?? window
  } else {
    doc = document
    nodeToDraw = node
    nodeWindow = window
  }

  return toSvg(nodeToDraw, doc, nodeWindow, options)
    .then(createImage)
    .then((img) => {
      const canvas = doc.createElement('canvas')
      const context = canvas.getContext('2d')!
      const ratio = options.pixelRatio || getPixelRatio(nodeWindow)
      const { width, height } = getImageSize(nodeToDraw, options, nodeWindow)

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

      if (options.section) {
        const {
          x,
          y,
          width: sectionWidth,
          height: sectionHeight,
        } = options.section

        canvas.width = sectionWidth
        canvas.height = sectionHeight
        canvas.style.width = `${sectionWidth}px`
        canvas.style.height = `${sectionHeight}px`

        context.drawImage(
          /* image */ img,
          /* sx */ x,
          /* sy */ y,
          /* sWidth */ sectionWidth,
          /* sHeight */ sectionHeight,
          /* dx */ 0,
          /* dy */ 0,
          /* dWidth */ sectionWidth,
          /* dHeight */ sectionHeight,
        )
      } else {
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
      }

      return canvas
    })
}

export async function toPixelData<T extends HTMLElement>(
  node: T,
  window: Window,
  options: Options = {},
): Promise<Uint8ClampedArray> {
  const { width, height } = getImageSize(node, options, window)
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
  return toCanvas(node, options).then((canvas) => canvasToBlob(canvas, window))
}

export async function getFontEmbedCSS<T extends HTMLElement>(
  node: T,
  options: Options = {},
): Promise<string> {
  return getWebFontCSS(node, options, document, window)
}
