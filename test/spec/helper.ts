import { toPng } from '../../src'
import { getPixelRatio } from '../../src/util'
import './global.d.ts'

export function renderToPng(node: HTMLDivElement) {
  return toPng(node)
}

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

const BASE_URL = '/base/test/spec/resources/'
const ROOT_ID = 'test-root'

export function clean() {
  const root = document.getElementById(ROOT_ID)
  if (root && root.parentNode) {
    root.parentNode.removeChild(root)
  }
}

async function setup() {
  return fetch('page.html').then((html) => {
    clean()
    const root = document.createElement('div') as HTMLDivElement
    root.id = ROOT_ID
    root.innerHTML = html
    document.body.appendChild(root)
  })
}

export async function bootstrap(
  htmlUrl: string,
  cssUrl?: string,
  refImageUrl?: string,
) {
  return setup()
    .then(() => {
      const deferred: Promise<void>[] = []

      deferred.push(
        fetch(htmlUrl).then((html) => {
          getCaptureNode().innerHTML = html
        }),
      )

      if (cssUrl) {
        deferred.push(
          fetch(cssUrl).then((css) => {
            getStyleNode().appendChild(document.createTextNode(css))
          }),
        )
      }

      if (refImageUrl) {
        deferred.push(
          fetch(refImageUrl).then((url) => {
            getReferenceImage().setAttribute('src', url)
          }),
        )
      }

      return Promise.all(deferred)
    })
    .then(() => getCaptureNode())
}

function fetch(fileName: string) {
  const url = BASE_URL + fileName
  const request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.responseType = 'text'

  return new Promise<string>((resolve, reject) => {
    request.onload = () => {
      if (request.status === 200) {
        resolve(request.response.toString().trim())
      } else {
        reject(new Error(`cannot load "${url}"`))
      }
    }
    request.send()
  })
}

interface Dimensions {
  width?: number
  height?: number
}

function createImg(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.src = src
  })
}

function drawImg(
  img: HTMLImageElement,
  node = getCaptureNode(),
  dimensions: { width?: number; height?: number } = {},
) {
  const canvas = getCanvasNode()
  const context = canvas.getContext('2d')!

  const width = dimensions.width || node.offsetWidth
  const height = dimensions.height || node.offsetHeight
  const ratio = getPixelRatio()
  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}`
  canvas.style.height = `${height}`

  context.imageSmoothingEnabled = false
  context.drawImage(img, 0, 0)
  // console.log(canvas.toDataURL())
  return img
}

export async function drawDataUrl(dataUrl: string, dimensions?: Dimensions) {
  return Promise.resolve(dataUrl)
    .then(createImg)
    .then((image) => drawImg(image, undefined, dimensions))
}

export async function check(dataUrl: string) {
  // console.log(dataUrl)
  return Promise.resolve(dataUrl)
    .then(drawDataUrl)
    .then((img) => compareToRefImage(img))
}

export async function renderAndCheck(node: HTMLDivElement = getCaptureNode()) {
  return renderToPng(node).then(check)
}

export function compareToRefImage(image: HTMLImageElement, tolerance?: number) {
  expect(
    window.imagediff.equal(image, getReferenceImage(), tolerance || 10),
  ).toBe(true)
}

export async function getSvgDocument(dataUrl: string): Promise<XMLDocument> {
  return window
    .fetch(dataUrl)
    .then((res) => res.text())
    .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
}

export function assertTextRendered(lines: string[]) {
  return (node: HTMLDivElement = getCaptureNode()) =>
    renderToPng(node)
      .then(drawDataUrl)
      .then(() =>
        // eslint-disable-next-line promise/no-nesting
        recognize(getCanvasNode().toDataURL()).then((text: string) => {
          // console.log(text)
          expect(lines.every((line) => text.includes(line))).toBe(true)
        }),
      )
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
