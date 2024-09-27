import pixelmatch from 'pixelmatch'
import { toPng } from '../../src'
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
  return res.text()
}

function makeImage(src: string) {
  // console.log(src)
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
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
  expect(
    pixelmatch(sourceData.data, refData.data, null, ref.width, ref.height, {
      threshold,
    }),
  ).toBeLessThan(100)
}

export async function getSvgDocument(dataUrl: string): Promise<XMLDocument> {
  return window
    .fetch(dataUrl)
    .then((res) => res.text())
    .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
}

const PASS_TEXT_MATCH = false

export function assertTextRendered(lines: string[], options?: Options) {
  return (node: HTMLDivElement = getCaptureNode()) =>
    PASS_TEXT_MATCH
      ? expect(true).toBe(true)
      : recognizeImage(node, options).then((text) => {
          expect(lines.every((line) => text.includes(line))).toBe(true)
        })
}

export async function recognizeImage(node: HTMLDivElement, options?: Options) {
  return toPng(node, options)
    .then(drawDataUrl)
    .then(() => recognize(getCanvasNode().toDataURL()))
}

// see: https://ocr.space/OCRAPI
async function recognize(dataUrl: string) {
  const data = new FormData()
  data.append('base64Image', dataUrl)

  // You may only perform this action upto maximum 180 number of times within
  // 3600 seconds.
  // data.append('apikey', 'aa8c3d7de088957')
  data.append('apikey', 'K89675126388957')

  return window
    .fetch('https://api.ocr.space/parse/image', {
      method: 'post',
      body: data,
    })
    .then((res) => res.json())
    .then((data) => {
      const result: string[] = []
      if (!data.IsErroredOnProcessing) {
        // console.log(JSON.stringify(data.ParsedResults))
        data.ParsedResults.forEach(({ ParsedText }: any) => {
          if (ParsedText) {
            result.push(ParsedText)
          }
        })
      }
      const text = result.join('\n').trim().replace('\r\n', '\n')
      // console.log(`recognized text: ${text}`)
      return text
    })
    .catch(() => {
      // console.log(`text recognize error: ${err}`)
      return ''
    })
}
