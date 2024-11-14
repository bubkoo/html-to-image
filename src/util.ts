import type { Options } from './types'

export function resolveUrl(url: string, baseUrl: string | null): string {
  // url is absolute already
  if (url.match(/^[a-z]+:\/\//i)) {
    return url
  }

  // url is absolute already, without protocol
  if (url.match(/^\/\//)) {
    return window.location.protocol + url
  }

  // dataURI, mailto:, tel:, etc.
  if (url.match(/^[a-z]+:/i)) {
    return url
  }

  const doc = document.implementation.createHTMLDocument()
  const base = doc.createElement('base')
  const a = doc.createElement('a')

  doc.head.appendChild(base)
  doc.body.appendChild(a)

  if (baseUrl) {
    base.href = baseUrl
  }

  a.href = url

  return a.href
}

export const uuid = (() => {
  // generate uuid for className of pseudo elements.
  // We should not use GUIDs, otherwise pseudo elements sometimes cannot be captured.
  let counter = 0

  // ref: http://stackoverflow.com/a/6248722/2519373
  const random = () =>
    // eslint-disable-next-line no-bitwise
    `0000${((Math.random() * 36 ** 4) << 0).toString(36)}`.slice(-4)

  return () => {
    counter += 1
    return `u${random()}${counter}`
  }
})()

export function delay<T>(ms: number) {
  return (args: T) =>
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(args), ms)
    })
}

export function toArray<T>(arrayLike: any): T[] {
  const arr: T[] = []

  for (let i = 0, l = arrayLike.length; i < l; i++) {
    arr.push(arrayLike[i])
  }

  return arr
}

function px(node: HTMLElement, styleProperty: string) {
  const win = node.ownerDocument.defaultView || window
  const val = win.getComputedStyle(node).getPropertyValue(styleProperty)
  return val ? parseFloat(val.replace('px', '')) : 0
}

function getNodeWidth(node: HTMLElement) {
  const leftBorder = px(node, 'border-left-width')
  const rightBorder = px(node, 'border-right-width')
  return node.clientWidth + leftBorder + rightBorder
}

function getNodeHeight(node: HTMLElement) {
  const topBorder = px(node, 'border-top-width')
  const bottomBorder = px(node, 'border-bottom-width')
  return node.clientHeight + topBorder + bottomBorder
}

export function getImageSize(targetNode: HTMLElement, options: Options = {}) {
  const width = options.width || getNodeWidth(targetNode)
  const height = options.height || getNodeHeight(targetNode)

  return { width, height }
}

export function getPixelRatio() {
  let ratio

  let FINAL_PROCESS
  try {
    FINAL_PROCESS = process
  } catch (e) {
    // pass
  }

  const val =
    FINAL_PROCESS && FINAL_PROCESS.env
      ? FINAL_PROCESS.env.devicePixelRatio
      : null
  if (val) {
    ratio = parseInt(val, 10)
    if (Number.isNaN(ratio)) {
      ratio = 1
    }
  }
  return ratio || window.devicePixelRatio || 1
}

// @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
const canvasDimensionLimit = 16384

export function checkCanvasDimensions(canvas: HTMLCanvasElement) {
  if (
    canvas.width > canvasDimensionLimit ||
    canvas.height > canvasDimensionLimit
  ) {
    if (
      canvas.width > canvasDimensionLimit &&
      canvas.height > canvasDimensionLimit
    ) {
      if (canvas.width > canvas.height) {
        canvas.height *= canvasDimensionLimit / canvas.width
        canvas.width = canvasDimensionLimit
      } else {
        const height1 = getMaxCanvasHeight(canvas.width)
        canvas.width *= height1 / canvas.height
        canvas.height = height1
      }
    } else if (canvas.width > canvasDimensionLimit) {
      canvas.height *= canvasDimensionLimit / canvas.width
      canvas.width = canvasDimensionLimit
    } else {
      const height = getMaxCanvasHeight(canvas.width)
      canvas.width *= height / canvas.height
      canvas.height = height
    }
  }
}

export function getDimensionLimit(): number {
  return canvasDimensionLimit
}

const dimenstionLimitCache: { [width: number]: number } = {}

export function getMaxCanvasHeight(width: number): number {
  let val = dimenstionLimitCache[width]
  if (val) return val
  val = test()
  dimenstionLimitCache[width] = val
  return val

  function test(): number {
    const heights = [
      // Chrome 83 (Mac, Win)
      65535,
      // Chrome 70 (Mac, Win)
      // Chrome 68 (Android 4.4-9)
      // Firefox 63 (Mac, Win)
      32767,
      // Edge 17 (Win)
      // IE11 (Win)
      // 16384,
    ]
    for (let i = 0; i < heights.length; i++) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = heights[i]
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(new Image(), 0, 0) // check
        return heights[i]
      } catch (e) {
        // ignore
      }
    }
    return canvasDimensionLimit
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  options: Options = {},
): Promise<Blob | null> {
  if (canvas.toBlob) {
    return new Promise((resolve) => {
      canvas.toBlob(
        resolve,
        options.type ? options.type : 'image/png',
        options.quality ? options.quality : 1,
      )
    })
  }

  return new Promise((resolve) => {
    const binaryString = window.atob(
      canvas
        .toDataURL(
          options.type ? options.type : undefined,
          options.quality ? options.quality : undefined,
        )
        .split(',')[1],
    )
    const len = binaryString.length
    const binaryArray = new Uint8Array(len)

    for (let i = 0; i < len; i += 1) {
      binaryArray[i] = binaryString.charCodeAt(i)
    }

    resolve(
      new Blob([binaryArray], {
        type: options.type ? options.type : 'image/png',
      }),
    )
  })
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decode = () => resolve(img) as any
    img.onload = () => resolve(img)
    img.onerror = reject
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.src = url
  })
}

export async function svgToDataURL(svg: SVGElement): Promise<string> {
  return Promise.resolve()
    .then(async function () {
      // svg中的图片地址无法离线下载，需要先转成dataUrl
      const imgs = svg.querySelectorAll('img')
      return Promise.all(
        [].slice.call(imgs, 0).map((img: HTMLImageElement) => {
          return urlToDataUrl(img.src).then((dataUrl) => (img.src = dataUrl))
        }),
      ).then(() => {
        const xml = new XMLSerializer().serializeToString(svg)
        // open('about:blank').document.write('<plaintext>' + xml); //for debug
        return xml
      })
    })
    .then(encodeURIComponent)
    .then((html) => `data:image/svg+xml;charset=utf-8,${html}`)
}

export async function nodeToDataURL(
  node: HTMLElement,
  width: number,
  height: number,
  usePageCss?: boolean,
): Promise<string> {
  const xmlns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(xmlns, 'svg')
  const foreignObject = document.createElementNS(xmlns, 'foreignObject')

  // fix: if ratio=2 and style.border='1px', in html it is actually rendered to 1px, but in <img src="svg" alt="i"> it is rendered to 2px. Then height is different and the bottom 1px is lost, 10 nodes will lost 10px.
  const ratio = getPixelRatio()
  svg.setAttribute('width', `${width / ratio}`)
  svg.setAttribute('height', `${height / ratio}`)
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

  foreignObject.setAttribute('width', '100%')
  foreignObject.setAttribute('height', '100%')
  foreignObject.setAttribute('x', '0')
  foreignObject.setAttribute('y', '0')
  foreignObject.setAttribute('externalResourcesRequired', 'true')

  svg.appendChild(foreignObject)
  foreignObject.appendChild(node)
  if (usePageCss) {
    const style = document.createElementNS(xmlns, 'style')
    style.innerHTML = await getStyles()
    svg.insertBefore(style, foreignObject)
  }

  return svgToDataURL(svg)
}

export const isInstanceOfElement = <
  T extends typeof Element | typeof HTMLElement | typeof SVGImageElement,
>(
  node: Element | HTMLElement | SVGImageElement,
  instance: T,
): node is T['prototype'] => {
  if (node instanceof instance) return true

  const nodePrototype = Object.getPrototypeOf(node)

  if (nodePrototype === null) return false

  return (
    nodePrototype.constructor.name === instance.name ||
    isInstanceOfElement(nodePrototype, instance)
  )
}

export function getStyles() {
  const styles = document.querySelectorAll('style,link[rel="stylesheet"]')
  const promises: Array<Promise<string>> = []
  toArray(styles).forEach((el) => {
    const e = el as Element
    if (e.tagName === 'LINK') {
      const href = e.getAttribute('href')
      if (href)
        promises.push(
          fetch(href)
            .then((r) => r.text())
            .then((tx) => transRelPath(href, tx))
            .catch(() => ''),
        )
    } else {
      promises.push(
        Promise.resolve(transRelPath(window.location.href, e.innerHTML)),
      )
    }
  })
  return Promise.all(promises).then((arr) => {
    return arr.join('\n\n')
  })
}

function transRelPath(cssPath: string, cssText: string): Promise<string> {
  const quotReg = /^\s*(['"])(.+?)\1/
  const map: { [url: string]: string } = {}
  // css中的图片路径是相对于css文件的，要改为相对于当前html文件
  let css = cssText.replace(/url\(\s*(.+?)\s*\)/gi, (m, path0) => {
    if (path0.substring(0, 5) === 'data:') return m
    const path = path0.replace(quotReg, '$2')
    const sUrl = toRelative(cssPath, path)
    const ret = `url(${sUrl})`
    map[sUrl] = ret
    return ret
  })
  // css中的图片在svg中访问失败，需要转换为dataUrl
  const promises = Object.keys(map).map((url) => {
    return urlToDataUrl(url).then((dataUrl) => {
      let p: number
      while ((p = css.indexOf(map[url])) > -1) {
        css = `${css.substring(0, p)}url(${dataUrl})${css.substring(
          p + map[url].length,
        )}`
      }
    })
  })
  return Promise.all(promises).then(() => css)
}

function toRelative(compareTo: string, path: string): string {
  if (path[0] === '/' || path.match(/^data:|:\/\//i)) return path
  const compareTo0 = compareTo.split('#')[0]
  const pos = compareTo0.lastIndexOf('/')
  if (pos > -1) {
    const dir = compareTo0.substring(0, pos)
    const arr = `${dir}/${path}`.split('/').filter((i) => i !== '.')
    for (let i = arr.length - 1; i > 0; i--) {
      if (arr[i] === '..' && arr[i - 1] !== '..') {
        arr.splice(i - 1, 2)
        i -= 1
      }
    }
    return arr.join('/')
  }
  return path
}

function urlToDataUrl(url: string): Promise<string> {
  return fetch(url)
    .then((response) => response.blob()) // 将响应转换为Blob
    .then(
      (blob) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(`${reader.result}`)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob) // 转换Blob为DataURL
        }),
    )
}
