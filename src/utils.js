/* eslint-disable no-bitwise */

const WOFF = 'application/font-woff'
const JPEG = 'image/jpeg'
const mimes = {
  woff: WOFF,
  woff2: WOFF,
  ttf: 'application/font-truetype',
  eot: 'application/vnd.ms-fontobject',
  png: 'image/png',
  jpg: JPEG,
  jpeg: JPEG,
  gif: 'image/gif',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
}


export const uuid = (function uuid() {
  // generate uuid for className of pseudo elements.
  // We should not use GUIDs, otherwise pseudo elements sometimes cannot be captured.
  let counter = 0

  // ref: http://stackoverflow.com/a/6248722/2519373
  const randomFourChars = () =>
    (`0000${(Math.random() * (36 ** 4) << 0).toString(36)}`).slice(-4)

  return () => {
    counter += 1
    return `u${randomFourChars()}${counter}`
  }
}())

export function parseExtension(url: String): String {
  const match = /\.([^./]*?)$/g.exec(url)
  if (match) return match[1]
  return ''
}

export function getMimeType(url: String): String {
  const ext = parseExtension(url).toLowerCase()
  return mimes[ext] || ''
}

export function delay(ms: Number): Promise {
  return arg => new Promise(((resolve) => {
    setTimeout(() => {
      resolve(arg)
    }, ms)
  }))
}

export function createImage(url: String): Promise<Image> {
  return new Promise(((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = reject
    image.crossOrigin = 'anonymous'
    image.src = url
  }))
}

export function isDataUrl(url: String): Boolean {
  return url.search(/^(data:)/) !== -1
}

export function toDataURL(content: String, mimeType: String): String {
  return `data:${mimeType};base64,${content}`
}

export function getDataURLContent(dataURL: String): String {
  return dataURL.split(/,/)[1]
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise(((resolve) => {
    const binaryString = window.atob(canvas.toDataURL().split(',')[1])
    const len = binaryString.length
    const binaryArray = new Uint8Array(len)

    for (let i = 0; i < len; i += 1) {
      binaryArray[i] = binaryString.charCodeAt(i)
    }

    resolve(new Blob([binaryArray], {
      type: 'image/png',
    }))
  }))
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  if (canvas.toBlob) {
    return new Promise(((resolve) => {
      canvas.toBlob(resolve)
    }))
  }

  return toBlob(canvas)
}

export function toArray(arrayLike: Object): Array<*> {
  const arr = []

  for (let i = 0, l = arrayLike.length; i < l; i += 1) {
    arr.push(arrayLike[i])
  }

  return arr
}

function px(node: HTMLElement, styleProperty: String): Number {
  const value = window.getComputedStyle(node).getPropertyValue(styleProperty)
  return parseFloat(value.replace('px', ''))
}

export function getNodeWidth(node: HTMLElement): Number {
  const leftBorder = px(node, 'border-left-width')
  const rightBorder = px(node, 'border-right-width')
  return node.scrollWidth + leftBorder + rightBorder
}

export function getNodeHeight(node: HTMLElement): Number {
  const topBorder = px(node, 'border-top-width')
  const bottomBorder = px(node, 'border-bottom-width')
  return node.scrollHeight + topBorder + bottomBorder
}

export function getPixelRatio(context: Object): Number {
  const backingStore = context.backingStorePixelRatio ||
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1

  return (window.devicePixelRatio || 1) / backingStore
}

export function svgToDataURL(svg: SVGElement): Promise<String> {
  return Promise.resolve()
    .then(() => new XMLSerializer().serializeToString(svg))
    .then(encodeURIComponent)
    .then(html => `data:image/svg+xml;charset=utf-8,${html}`)
}

export function getBlobFromImageURL(url: String): Promise<String> {
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
