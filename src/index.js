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

export type Options = {
  filter: ?Function,
  width: ?Number,
  height: ?Number,
  style: ?Object,
  backgroundColor: ?String,
  cacheBust: ?Boolean,
  imagePlaceholder: ?String, // DataURL
}

export function toSvgDataURL(domNode: HTMLElement, options: Options = {}): Promise<*> {
  const width = options.width || getNodeWidth(domNode)
  const height = options.height || getNodeHeight(domNode)

  return cloneNode(domNode, options.filter, true)
    .then(clonedNode => embedWebFonts(clonedNode, options))
    .then(clonedNode => embedImages(clonedNode, options))
    .then(clonedNode => applyStyleWithOptions(clonedNode, options))
    .then((clonedNode) => { document.body.appendChild(clonedNode); return clonedNode })
    .then(clonedNode => createSvgDataURL(clonedNode, width, height))
}

export function toCanvas(domNode: HTMLElement, options: Options = {}): Promise<*> {
  return toSvgDataURL(domNode, options)
    .then(createImage)
    .then(delay(100))
    .then((image) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      const width = options.width || getNodeWidth(domNode)
      const height = options.height || getNodeHeight(domNode)
      const ratio = getPixelRatio(context)

      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = width
      canvas.style.height = height
      context.scale(ratio, ratio)

      if (options.backgroundColor) {
        context.fillStyle = options.backgroundColor
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.drawImage(image, 0, 0)

      return canvas
    })
}

export function toPixelData(domNode: HTMLElement, options: Options = {}): Promise<*> {
  const width = options.width || getNodeWidth(domNode)
  const height = options.height || getNodeHeight(domNode)

  return toCanvas(domNode, options)
    .then(canvas => (
      canvas.getContext('2d').getImageData(0, 0, width, height).data
    ))
}

export function toPng(domNode: HTMLElement, options: Options = {}): Promise<*> {
  return toCanvas(domNode, options).then(canvas => (
    canvas.toDataURL()
  ))
}

export function toJpeg(domNode: HTMLElement, options: Options = {}): Promise<*> {
  return toCanvas(domNode, options).then(canvas => (
    canvas.toDataURL('image/jpeg', options.quality || 1)
  ))
}

export function toBlob(domNode: HTMLElement, options: Options = {}): Promise<*> {
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
