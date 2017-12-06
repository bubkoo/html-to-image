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

export function uuid() {
  // ref: https://stackoverflow.com/a/2117523
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8) // eslint-disable-line
    return v.toString(16)
  })
}

export function parseExtension(url) {
  const match = /\.([^\.\/]*?)$/g.exec(url) // eslint-disable-line
  if (match) return match[1]
  return ''
}

export function getMimeType(url) {
  const ext = parseExtension(url).toLowerCase()
  return mimes[ext] || ''
}

export function delay(ms) {
  return arg => new Promise(((resolve) => {
    setTimeout(() => {
      resolve(arg)
    }, ms)
  }))
}

export function createImage(url) {
  return new Promise(((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  }))
}

export function isDataUrl(url) {
  return url.indexOf(/^(data:)/) !== -1
}

export function toDataURL(content, mimeType) {
  return `data:${mimeType};base64,${content}`
}

function toBlob(canvas) {
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

export function canvasToBlob(canvas) {
  if (canvas.toBlob) {
    return new Promise(((resolve) => {
      canvas.toBlob(resolve)
    }))
  }

  return toBlob(canvas)
}

export function toArray(arrayLike) {
  const arr = []

  for (let i = 0, l = arrayLike.length; i < l; i += 1) {
    arr.push(arrayLike[i])
  }

  return arr
}

function px(node, styleProperty) {
  const value = window.getComputedStyle(node).getPropertyValue(styleProperty)
  return parseFloat(value.replace('px', ''))
}

export function getNodeWidth(node) {
  const leftBorder = px(node, 'border-left-width')
  const rightBorder = px(node, 'border-right-width')
  return node.scrollWidth + leftBorder + rightBorder
}

export function getNodeHeight(node) {
  const topBorder = px(node, 'border-top-width')
  const bottomBorder = px(node, 'border-bottom-width')
  return node.scrollHeight + topBorder + bottomBorder
}
