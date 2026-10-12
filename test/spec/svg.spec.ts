/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { toPng, toSvg } from '../../src'
import { svgToDataURL } from '../../src/util'
import { bootstrap, renderAndCheck, getSvgDocument } from '../spec/helper'

describe('work with svg element', () => {
  it('should omit XML-invalid control characters from text and attributes', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const controls = String.fromCharCode(
      ...Array.from({ length: 32 }, (_, i) => i).filter(
        (i) => i !== 9 && i !== 10 && i !== 13,
      ),
    )
    svg.textContent = `before${controls}after`
    svg.setAttribute('data-value', `before${controls}after`)

    const dataURL = await svgToDataURL(svg)
    const doc = await getSvgDocument(dataURL)

    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.documentElement.textContent).toBe('beforeafter')
    expect(doc.documentElement.getAttribute('data-value')).toBe('beforeafter')
    expect(svg.textContent).toBe(`before${controls}after`)
    expect(svg.getAttribute('data-value')).toBe(`before${controls}after`)
  })

  it('should preserve XML-valid whitespace and Unicode characters', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const text = 'tab\tnewline\n&<>中文😀\u007f\u0085'
    svg.textContent = text
    svg.setAttribute('data-value', 'a\rb')

    const dataURL = await svgToDataURL(svg)
    const doc = await getSvgDocument(dataURL)

    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.documentElement.textContent).toBe(text)
    expect(doc.documentElement.getAttribute('data-value')).toBe('a\rb')
  })

  it('should render text containing an XML-invalid control character', async () => {
    const node = document.createElement('div')
    node.textContent = 'before\u0001after'

    const dataURL = await toPng(node, { width: 100, height: 20 })

    expect(dataURL).toMatch(/^data:image\/png;base64,/)
    expect(node.textContent).toBe('before\u0001after')
  })

  it('should render nested svg with broken namespace', (done) => {
    bootstrap('svg-ns/node.html', 'svg-ns/style.css', 'svg-ns/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render svg `<rect>` with width and heigth', (done) => {
    bootstrap('svg-rect/node.html', 'svg-rect/style.css', 'svg-rect/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render svg `<rect>` with applied css styles', (done) => {
    bootstrap('svg-color/node.html', 'svg-color/style.css', 'svg-color/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should include a viewBox attribute', (done) => {
    bootstrap('small/node.html', 'small/style.css', 'small/image')
      .then(toSvg)
      .then(getSvgDocument)
      .then((doc) => {
        const width = doc.documentElement.getAttribute('width')
        const height = doc.documentElement.getAttribute('height')
        const viewBox = doc.documentElement.getAttribute('viewBox')
        expect(viewBox).toEqual(`0 0 ${width} ${height}`)
      })
      .then(done)
      .catch(done)
  })

  it('should render svg `<image>` with href', (done) => {
    bootstrap('svg-image/node.html', 'svg-image/style.css', 'svg-image/image')
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })

  it('should render SVG use tags', function (done) {
    bootstrap(
      'svg-use-tag/node.html',
      'svg-use-tag/style.css',
      'svg-use-tag/image',
    )
      .then(renderAndCheck)
      .then(done)
      .catch(done)
  })
})
