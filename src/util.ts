const WOFF = 'application/font-woff'
const JPEG = 'image/jpeg'
const mimes: { [key: string]: string } = {
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
  const random = () =>
    `0000${((Math.random() * 36 ** 4) << 0).toString(36)}`.slice(-4)

  return () => {
    counter += 1
    return `u${random()}${counter}`
  }
})()

export function getExtension(url: string): string {
  const match = /\.([^./]*?)$/g.exec(url)
  return match ? match[1] : ''
}

export function getMimeType(url: string): string {
  const ext = getExtension(url).toLowerCase()
  return mimes[ext] || ''
}

export function delay(ms: number): (ret: any) => Promise<any> {
  return (args: any) =>
    new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve(args)
      }, ms)
    })
}

export function isDataUrl(url: string) {
  return url.search(/^(data:)/) !== -1
}

export function toDataURL(content: string, mimeType: string) {
  return `data:${mimeType};base64,${content}`
}

export function getDataURLContent(dataURL: string) {
  return dataURL.split(/,/)[1]
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    const binaryString = window.atob(canvas.toDataURL().split(',')[1])
    const len = binaryString.length
    const binaryArray = new Uint8Array(len)

    for (let i = 0; i < len; i += 1) {
      binaryArray[i] = binaryString.charCodeAt(i)
    }

    resolve(new Blob([binaryArray], { type: 'image/png' }))
  })
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  if (canvas.toBlob) {
    return new Promise((resolve) => canvas.toBlob(resolve))
  }

  return toBlob(canvas)
}

export function toArray<T>(arrayLike: any): T[] {
  const result: T[] = []

  for (let i = 0, l = arrayLike.length; i < l; i += 1) {
    result.push(arrayLike[i])
  }

  return result
}

function px(node: HTMLElement, styleProperty: string) {
  const val = window.getComputedStyle(node).getPropertyValue(styleProperty)
  return parseFloat(val.replace('px', ''))
}

export function getNodeWidth(node: HTMLElement) {
  const leftBorder = px(node, 'border-left-width')
  const rightBorder = px(node, 'border-right-width')
  return node.scrollWidth + leftBorder + rightBorder
}

export function getNodeHeight(node: HTMLElement) {
  const topBorder = px(node, 'border-top-width')
  const bottomBorder = px(node, 'border-bottom-width')
  return node.scrollHeight + topBorder + bottomBorder
}

export function getPixelRatio() {
  let ratio

  const val = process.env.devicePixelRatio
  if (val) {
    ratio = parseInt(val, 10)
    if (isNaN(ratio)) {
      ratio = 1
    }
  }
  return ratio || window.devicePixelRatio || 1
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.crossOrigin = 'anonymous'
    image.src = url
  })
}

export async function svgToDataURL(svg: SVGElement): Promise<string> {
  return Promise.resolve()
    .then(() => new XMLSerializer().serializeToString(svg))
    .then(encodeURIComponent)
    .then((html) => `data:image/svg+xml;charset=utf-8,${html}`)
}

export async function getBlobFromImageURL(url: string): Promise<string> {
  return createImage(url).then((image) => {
    const { width, height } = image

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const ratio = getPixelRatio()

    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}`
    canvas.style.height = `${height}`

    context!.scale(ratio, ratio)
    context!.drawImage(image, 0, 0)

    const dataURL = canvas.toDataURL(getMimeType(url))

    return getDataURLContent(dataURL)
  })
}
