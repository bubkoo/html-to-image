import { readDOMMethod, readDOMProperty, writeDOMProperty } from './dom.js'
import { readDocumentMethod, readDocumentProperty } from './document.js'
import type { Options } from './types.js'
import { getTask } from './task.js'

export function resolveUrl(url: string, baseUrl: string | null): string {
  try {
    return new URL(url, baseUrl || readDocumentProperty(document, 'baseURI'))
      .href
  } catch {
    // Leave malformed references for the resource loader's recovery policy.
    return url
  }
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

  // CSS declarations and DOM collections reach this boundary through `any`.
  for (let i = 0, l = readDOMProperty(arrayLike, 'length'); i < l; i++) {
    arr.push(readDOMProperty(arrayLike, i))
  }

  return arr
}

export function getStyleProperties(
  style?: CSSStyleDeclaration,
  selected?: readonly string[],
): readonly string[] {
  return selected != null
    ? selected
    : toArray(
        style ||
          readDOMMethod(
            window,
            'getComputedStyle',
          )(readDocumentProperty(document, 'documentElement')),
      )
}

function px(node: HTMLElement, styleProperty: string) {
  const win =
    readDocumentProperty(
      readDOMProperty(node, 'ownerDocument'),
      'defaultView',
    ) || window
  const val = readDOMMethod(
    readDOMMethod(win, 'getComputedStyle')(node),
    'getPropertyValue',
  )(styleProperty)
  return val ? parseFloat(val.replace('px', '')) : 0
}

function getNodeWidth(node: HTMLElement) {
  const leftBorder = px(node, 'border-left-width')
  const rightBorder = px(node, 'border-right-width')
  return readDOMProperty(node, 'clientWidth') + leftBorder + rightBorder
}

function getNodeHeight(node: HTMLElement) {
  const topBorder = px(node, 'border-top-width')
  const bottomBorder = px(node, 'border-bottom-width')
  return readDOMProperty(node, 'clientHeight') + topBorder + bottomBorder
}

export function getImageSize(targetNode: HTMLElement, options: Options = {}) {
  const width = options.width ?? getNodeWidth(targetNode)
  const height = options.height ?? getNodeHeight(targetNode)

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
  return ratio || readDOMProperty(window, 'devicePixelRatio') || 1
}

// @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
const canvasDimensionLimit = 16384

export function checkCanvasDimensions(canvas: HTMLCanvasElement) {
  if (
    readDOMProperty(canvas, 'width') > canvasDimensionLimit ||
    readDOMProperty(canvas, 'height') > canvasDimensionLimit
  ) {
    if (
      readDOMProperty(canvas, 'width') > canvasDimensionLimit &&
      readDOMProperty(canvas, 'height') > canvasDimensionLimit
    ) {
      if (
        readDOMProperty(canvas, 'width') > readDOMProperty(canvas, 'height')
      ) {
        writeDOMProperty(
          canvas,
          'height',
          readDOMProperty(canvas, 'height') *
            (canvasDimensionLimit / readDOMProperty(canvas, 'width')),
        )
        writeDOMProperty(canvas, 'width', canvasDimensionLimit)
      } else {
        writeDOMProperty(
          canvas,
          'width',
          readDOMProperty(canvas, 'width') *
            (canvasDimensionLimit / readDOMProperty(canvas, 'height')),
        )
        writeDOMProperty(canvas, 'height', canvasDimensionLimit)
      }
    } else if (readDOMProperty(canvas, 'width') > canvasDimensionLimit) {
      writeDOMProperty(
        canvas,
        'height',
        readDOMProperty(canvas, 'height') *
          (canvasDimensionLimit / readDOMProperty(canvas, 'width')),
      )
      writeDOMProperty(canvas, 'width', canvasDimensionLimit)
    } else {
      writeDOMProperty(
        canvas,
        'width',
        readDOMProperty(canvas, 'width') *
          (canvasDimensionLimit / readDOMProperty(canvas, 'height')),
      )
      writeDOMProperty(canvas, 'height', canvasDimensionLimit)
    }
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  options: Options = {},
): Promise<Blob | null> {
  if (readDOMProperty(canvas, 'toBlob')) {
    return new Promise((resolve) => {
      readDOMMethod(canvas, 'toBlob')(
        resolve,
        options.type ? options.type : 'image/png',
        options.quality ?? 1,
      )
    })
  }

  return new Promise((resolve) => {
    const binaryString = readDOMMethod(
      window,
      'atob',
    )(
      readDOMMethod(canvas, 'toDataURL')(
        options.type ? options.type : undefined,
        options.quality ?? undefined,
      ).split(',')[1],
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

export function createImage(
  url: string,
  options: Options,
  image?: HTMLImageElement,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = image || new Image()
    const signal = getTask(options)?.context.signal || options.signal
    let timer: ReturnType<typeof setTimeout> | undefined
    const clean = () => {
      if (timer != null) clearTimeout(timer)
      writeDOMProperty(img, 'onload', null)
      writeDOMProperty(img, 'onerror', null)
      signal?.removeEventListener('abort', abort)
    }
    const fail = (error: unknown) => {
      clean()
      writeDOMProperty(img, 'src', '')
      reject(error)
    }
    const abort = () =>
      fail(
        signal?.aborted
          ? signal.reason
          : new DOMException('Image load aborted', 'AbortError'),
      )
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    const timeout = options.timeout ?? 30000
    if (timeout > 0)
      timer = setTimeout(
        () => fail(new DOMException('Image load timed out', 'TimeoutError')),
        timeout,
      )
    writeDOMProperty(img, 'onload', () => {
      Promise.resolve()
        .then(() =>
          typeof readDOMProperty(img, 'decode') === 'function'
            ? readDOMMethod(img, 'decode')()
            : undefined,
        )
        .catch(() => {
          if (!readDOMProperty(img, 'naturalWidth'))
            throw new Error('Image could not be decoded')
        })
        .then(() => {
          clean()
          resolve(img)
        }, fail)
    })
    writeDOMProperty(img, 'onerror', () =>
      fail(new Error('Image could not be loaded')),
    )
    writeDOMProperty(img, 'crossOrigin', 'anonymous')
    // WebKit can paint a nested image inside the exported SVG before an
    // async-decoded data URL is ready, leaving canvas and video pixels blank.
    writeDOMProperty(img, 'decoding', 'sync')
    writeDOMProperty(img, 'src', url)
  })
}

export async function svgToDataURL(svg: SVGElement): Promise<string> {
  return Promise.resolve()
    .then(() => new XMLSerializer().serializeToString(svg))
    .then((xml) =>
      // eslint-disable-next-line no-control-regex
      xml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''),
    )
    .then(encodeURIComponent)
    .then((html) => `data:image/svg+xml;charset=utf-8,${html}`)
}

export async function nodeToDataURL(
  node: HTMLElement,
  width: number,
  height: number,
  ownerDocument: Document = readDOMProperty(node, 'ownerDocument'),
  clonedStyles = '',
): Promise<string> {
  const xmlns = 'http://www.w3.org/2000/svg'
  const svg = readDocumentMethod(ownerDocument, 'createElementNS')(xmlns, 'svg')
  const foreignObject = readDocumentMethod(ownerDocument, 'createElementNS')(
    xmlns,
    'foreignObject',
  )

  readDOMMethod(svg, 'setAttribute')('width', `${width}`)
  readDOMMethod(svg, 'setAttribute')('height', `${height}`)
  readDOMMethod(svg, 'setAttribute')('viewBox', `0 0 ${width} ${height}`)

  readDOMMethod(foreignObject, 'setAttribute')('width', '100%')
  readDOMMethod(foreignObject, 'setAttribute')('height', '100%')
  readDOMMethod(foreignObject, 'setAttribute')('x', '0')
  readDOMMethod(foreignObject, 'setAttribute')('y', '0')
  readDOMMethod(foreignObject, 'setAttribute')(
    'externalResourcesRequired',
    'true',
  )

  if (clonedStyles) {
    const style = readDocumentMethod(ownerDocument, 'createElementNS')(
      xmlns,
      'style',
    )
    // First-layer important declarations protect private layout state from
    // author pseudo rules, without inserting children into the captured tree.
    writeDOMProperty(
      style,
      'textContent',
      `@layer ${uuid()} { ${clonedStyles} }`,
    )
    readDOMMethod(svg, 'append')(style)
  }
  readDOMMethod(svg, 'appendChild')(foreignObject)
  readDOMMethod(foreignObject, 'appendChild')(node)
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
    readDOMProperty(readDOMProperty(nodePrototype, 'constructor'), 'name') ===
      instance.name || isInstanceOfElement(nodePrototype, instance)
  )
}
