import pixelmatch from 'pixelmatch'
import { toPng, toSvg } from '../../src'
import { Options } from '../../src/types'
import { getPixelRatio } from '../../src/util'

export function getCaptureNode() {
  return document.getElementById('dom-node') as HTMLDivElement
}

export function getReferenceImage() {
  return document.getElementById('ref-image') as HTMLImageElement
}

export function getCanvasNode() {
  return document.getElementById('canvas') as HTMLCanvasElement
}

export function getStyleNode() {
  return document.getElementById('style') as HTMLStyleElement
}

const BASE_URL = '/base/test/resources/'
const ROOT_ID = 'test-root'

export function clean() {
  const root = document.getElementById(ROOT_ID)
  if (root && root.parentNode) {
    root.parentNode.removeChild(root)
  }
}

async function setup() {
  const html = await fetchFile('page.html')
  clean()
  const root = document.createElement('div') as HTMLDivElement
  root.id = ROOT_ID
  root.innerHTML = html
  document.body.appendChild(root)
}

export async function bootstrap(
  htmlUrl: string,
  cssUrl?: string,
  refImageUrl?: string,
) {
  await setup()

  const html = await fetchFile(htmlUrl)
  const captureNode = getCaptureNode()
  captureNode.innerHTML = html

  if (cssUrl) {
    const css = await fetchFile(cssUrl)
    getStyleNode().appendChild(document.createTextNode(css))
  }

  if (refImageUrl) {
    const url = await fetchFile(refImageUrl)
    getReferenceImage().setAttribute('src', url)
  }

  return captureNode
}

async function fetchFile(fileName: string) {
  const url = BASE_URL + fileName
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Test fixture request failed (${res.status}): ${url}`)
  }
  return res.text()
}

function makeImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Test image failed to load'))
    image.src = src
  })
}

function makeCanvas(
  img: HTMLImageElement,
  size?: {
    width?: number
    height?: number
  },
) {
  const canvas = getCanvasNode()
  const context = canvas.getContext('2d')!

  const width = (size && size.width) || img.width
  const height = (size && size.height) || img.height
  const ratio = getPixelRatio()
  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}`
  canvas.style.height = `${height}`

  context.imageSmoothingEnabled = false
  context.drawImage(img, 0, 0)
  return { canvas, context, width, height }
}

function drawImg(
  img: HTMLImageElement,
  size?: {
    width?: number
    height?: number
  },
) {
  const { context, width, height } = makeCanvas(img, size)
  return context.getImageData(0, 0, width, height)
}

export async function drawDataUrl(
  dataUrl: string,
  size?: {
    width?: number
    height?: number
  },
) {
  return Promise.resolve(dataUrl)
    .then(makeImage)
    .then((image) => drawImg(image, size))
}

export async function check(dataUrl: string) {
  return Promise.resolve(dataUrl)
    .then(drawDataUrl)
    .then((imgData) => compareToRefImage(imgData))
}

export async function logDataUrl(node: HTMLDivElement = getCaptureNode()) {
  return toPng(node)
    .then(makeImage)
    .then(makeCanvas)
    .then(({ canvas }) => {
      // eslint-disable-next-line
      console.log(canvas.toDataURL())
      return node
    })
}

export async function renderAndCheck(
  node: HTMLDivElement = getCaptureNode(),
  options: Options = {},
) {
  return toPng(node, options).then(check)
}

export function compareToRefImage(sourceData: ImageData, threshold = 0.1) {
  const ref = getReferenceImage()
  const refData = drawImg(ref)
  assertVisualMatch(sourceData, refData, threshold)
}

export function assertVisualMatch(
  sourceData: ImageData,
  refData: ImageData,
  threshold = 0.1,
) {
  if (sourceData.width !== refData.width || sourceData.height !== refData.height) {
    throw new Error(
      `Capture size ${sourceData.width}x${sourceData.height} differs from reference ${refData.width}x${refData.height}`,
    )
  }
  const opaquePixels = (data: ImageData) => {
    let count = 0
    for (let i = 3; i < data.data.length; i += 4) {
      if (data.data[i] > 0) count += 1
    }
    return count
  }
  if (opaquePixels(refData) > 0) {
    if (opaquePixels(sourceData) === 0) {
      throw new Error('Capture is blank but reference is visible')
    }
  }
  const difference = pixelmatch(
    sourceData.data,
    refData.data,
    null,
    refData.width,
    refData.height,
    { threshold },
  )
  const pixels = refData.width * refData.height
  const allowed = Math.min(100, pixels * 0.01)
  if (difference >= allowed) {
    throw new Error(
      `Capture differs at ${difference}/${pixels} pixels; allowed fewer than ${allowed}`,
    )
  }
}

export async function getSvgDocument(dataUrl: string): Promise<XMLDocument> {
  return window
    .fetch(dataUrl)
    .then((res) => res.text())
    .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
}

export function assertTextRendered(lines: string[], options?: Options) {
  return async (node: HTMLDivElement = getCaptureNode()) => {
    const svg = await getSvgDocument(await toSvg(node, options))
    const serialized = new XMLSerializer().serializeToString(svg)
    const images = node.querySelectorAll('img')
    if (images.length) {
      const embedded = svg.querySelectorAll('img[src^="data:"]')
      expect(embedded.length).toBe(images.length)
    } else if (node.querySelector('.with-background')) {
      expect(serialized).toContain('data:image/jpeg')
    } else if (node.querySelector('i.fa-apper')) {
      expect(serialized).toContain('data:font')
    } else {
      lines.forEach((line) => expect(serialized).toContain(line))
    }
    const bitmap = await drawDataUrl(await toPng(node, options))
    let visible = 0
    for (let i = 3; i < bitmap.data.length; i += 4) {
      if (bitmap.data[i] > 0) visible += 1
    }
    expect(visible).toBeGreaterThan(0)
  }
}
