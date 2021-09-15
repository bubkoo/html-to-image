/* eslint-disable */

import { toPng } from '../../src'
import { getPixelRatio } from '../../src/util'

export namespace Helper {
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

  export function renderToPng(node: HTMLDivElement) {
    return toPng(node)
  }
}

export namespace Helper {
  const BASE_URL = '/base/test/spec/resources/'
  const ROOT_ID = 'test-root'

  export function clean() {
    const root = document.getElementById(ROOT_ID)
    if (root && root.parentNode) {
      root.parentNode.removeChild(root)
    }
  }

  export async function bootstrap(
    htmlUrl: string,
    cssUrl?: string,
    refImageUrl?: string,
  ) {
    return setup()
      .then(() => {
        const deferred: Promise<any>[] = []

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

  function setup() {
    return fetch('page.html').then((html) => {
      clean()
      const root = document.createElement('div') as HTMLDivElement
      root.id = ROOT_ID
      root.innerHTML = html
      document.body.appendChild(root)
    })
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
}

export namespace Helper {
  interface Dimensions {
    width?: number
    height?: number
  }

  export async function check(dataUrl: string) {
    // console.log(dataUrl)
    return Promise.resolve(dataUrl).then(drawDataUrl).then(compareToRefImage)
  }

  export async function renderAndCheck(
    node: HTMLDivElement = getCaptureNode(),
  ) {
    return renderToPng(node).then(check)
  }

  export async function drawDataUrl(dataUrl: string, dimensions?: Dimensions) {
    return Promise.resolve(dataUrl)
      .then(createImg)
      .then((image) => drawImg(image, undefined, dimensions))
  }

  export function compareToRefImage(
    image: HTMLImageElement,
    tolerance?: number,
  ) {
    expect(
      window.imagediff.equal(image, Helper.getReferenceImage(), tolerance || 5),
    ).toBe(true)
  }

  function createImg(src: string) {
    return new Promise<HTMLImageElement>((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.src = src
    })
  }

  export function getSvgDocument(dataUrl: string): Promise<XMLDocument> {
    return fetch(dataUrl)
      .then((response) => response.text())
      .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
  }

  function drawImg(
    image: CanvasImageSource,
    node = Helper.getCaptureNode(),
    dimensions: { width?: number; height?: number } = {},
  ) {
    const canvas = Helper.getCanvasNode()
    const context = canvas.getContext('2d')!

    const width = dimensions.width || node.offsetWidth
    const height = dimensions.height || node.offsetHeight
    const ratio = getPixelRatio()
    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}`
    canvas.style.height = `${height}`

    context.imageSmoothingEnabled = false
    context.drawImage(image, 0, 0)
    // console.log(canvas.toDataURL())
    return image
  }
}

export namespace Helper {
  export function assertTextRendered(lines: string[]) {
    return (node: HTMLDivElement = getCaptureNode()) =>
      renderToPng(node)
        .then(drawDataUrl)
        .then(() =>
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
    data.append('apikey', 'aa8c3d7de088957')

    return fetch('https://api.ocr.space/parse/image', {
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
        return result.join('\n')
      })
      .catch((err) => {
        console.log(err)
        return ''
      })
  }
}
