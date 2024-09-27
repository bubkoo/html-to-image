/* eslint-disable promise/no-callback-in-promise */

import '../spec/setup'
import { toSvg } from '../../src'
import { bootstrap, renderAndCheck, getSvgDocument } from '../spec/helper'

describe('work with svg element', () => {
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

  it('should not fail on empty href in svg `<image>`', (done) => {
    bootstrap(
      'svg-image/node-empty.html',
      'svg-image/style.css',
      'svg-image/image',
    )
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
