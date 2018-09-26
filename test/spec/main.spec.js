import { expect } from 'chai'
import imagediff from 'imagediff'
import {
  toPng,
  toJpeg,
  toBlob,
  toCanvas,
  toSvgDataURL,
} from '../../lib/index'


const BASE_URL = '/base/test/spec/resources/'

const getElementById = id => document.getElementById(id)
const getStyleNode = () => getElementById('style')
const getCaptureNode = () => getElementById('capture-node')
const getCanvasNode = () => getElementById('canvas')
const getImageNode = () => getElementById('compare-image')


function cleanPage() {
  const root = document.getElementById('test-root')
  if (root) {
    root.parentNode.removeChild(root)
  }
}

function getResource(fileName) {
  return fetch(BASE_URL + fileName)
    .then(response => response.text())
    .then(content => content.trim())
}

function loadPage() {
  return getResource('index.html')
    .then((html) => {
      const root = document.createElement('div')
      root.id = 'test-root'
      root.innerHTML = html
      document.body.appendChild(root)
    })
}

function fillPage(htmlPath, cssPath, controlImage) {
  return loadPage()
    .then(() => getResource(htmlPath).then((html) => {
      getCaptureNode().innerHTML = html
    }))
    .then(() => (
      cssPath
        ? getResource(cssPath).then((css) => {
          getStyleNode().appendChild(document.createTextNode(css))
        })
        : null
    ))
    .then(() => (
      controlImage
        ? getResource(controlImage).then((image) => {
          getImageNode().setAttribute('src', image)
        })
        : null
    ))
}

function createImage(src) {
  return new Promise(((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.src = src
  }))
}

function drawImage(image, node, dimensions = {}) {
  const elem = node || getCaptureNode()
  const canvas = getCanvasNode()
  const context = canvas.getContext('2d')

  canvas.height = dimensions.height || elem.offsetHeight
  canvas.width = dimensions.width || elem.offsetWidth
  context.imageSmoothingEnabled = false
  context.drawImage(image, 0, 0)

  return image
}

function drawDataURL(dataURL, dimensions) {
  return Promise.resolve(dataURL)
    .then(createImage)
    .then(image => drawImage(image, null, dimensions))
}

function compareToControlImage(image, tolerance) {
  return expect(imagediff.equal(image, getImageNode(), tolerance)).to.be.true
}

function compare(dataURL) {
  return Promise.resolve(dataURL)
    .then(drawDataURL)
    .then(compareToControlImage)
    .then(() => null)
}

function renderAndCompare() {
  return Promise.resolve(getCaptureNode())
    .then(toPng)
    .then(compare)
}


describe('html-to-image', () => {
  afterEach(cleanPage)

  it('should render to png', (done) => {
    fillPage('small/capture.html', 'small/style.css', 'small/image-png')
      .then(() => toPng(getCaptureNode()))
      .then(compare)
      .then(done)
      .catch(done)
  })

  it('should render to jpeg', (done) => {
    fillPage('small/capture.html', 'small/style.css', 'small/image-jpeg')
      .then(() => toJpeg(getCaptureNode()))
      .then(compare)
      .then(done)
      .catch(done)
  })

  it('should use quality parameter when rendering to jpeg', (done) => {
    fillPage('small/capture.html', 'small/style.css', 'small/image-jpeg-low')
      .then(() => toJpeg(getCaptureNode(), { quality: 0.5 }))
      .then(compare)
      .then(done)
      .catch(done)
  })

  it('should render to svg', (done) => {
    fillPage('small/capture.html', 'small/style.css', 'small/image-svg')
      .then(() => toSvgDataURL(getCaptureNode()))
      .then(compare)
      .then(done)
      .catch(done)
  })

  it('should render to blob', (done) => {
    fillPage('small/capture.html', 'small/style.css', 'small/image-png')
      .then(() => toBlob(getCaptureNode()))
      .then(blob => global.URL.createObjectURL(blob))
      .then(compare)
      .then(done)
      .catch(done)
  })

  it('should render to canvas', (done) => {
    fillPage('small/capture.html', 'small/style.css', 'small/image-png')
      .then(() => toCanvas(getCaptureNode()))
      .then(canvas => canvas.toDataURL('image/png'))
      .then(compare)
      .then(done)
      .catch(done)
  })

  it('should handle border', (done) => {
    fillPage('border/capture.html', 'border/style.css', 'border/image-png')
      .then(renderAndCompare)
      .then(done)
      .catch(done)
  })

  it('should render bigger node', (done) => {
    fillPage('bigger/capture.html', 'bigger/style.css', 'bigger/image-png')
      .then(() => {
        const parent = getElementById('capture-node')
        const child = parent.querySelector('.dom-child-node')
        for (let i = 0; i < 10; i += 1) {
          parent.appendChild(child.cloneNode())
        }
      })
      .then(renderAndCompare)
      .then(done)
      .catch(done)
  })
})
