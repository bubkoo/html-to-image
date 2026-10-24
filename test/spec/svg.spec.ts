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

  it('should resolve CSS custom properties (var()) in SVG descendants', (done) => {
    // Regression test for: SVG deep-clone skips cloneCSSStyle for descendants,
    // leaving CSS var() unresolved in exported image.
    // Fix in clone-node.ts: walk native/cloned descendant pairs, call cloneCSSStyle.
    // The CSS defines: :root { --rect-fill: rgb(0, 128, 0); } and .var-rect { fill: var(--rect-fill); }
    // Without the fix: the cloned rect has no inline style (deep-clone skips descendants).
    // With the fix: the cloned rect has fill: rgb(0, 128, 0) as an inline style.
    bootstrap('svg-css-var/node.html', 'svg-css-var/style.css')
      .then(toSvg)
      .then(getSvgDocument)
      .then((doc) => {
        const rect = doc.querySelector('.var-rect') as SVGRectElement | null
        expect(rect).not.toBeNull()
        // After the fix, cloneCSSStyle copies computed styles onto the cloned rect.
        // The inline style must contain a resolved fill color (not a var() reference).
        const inlineStyle = rect?.getAttribute('style') ?? ''
        expect(inlineStyle).not.toContain('var(')
        // Positive assertion: the fill property must be present and resolved to rgb(0, 128, 0).
        // This fails without the fix (style would be empty since descendants are skipped).
        expect(inlineStyle).toMatch(/fill\s*:\s*rgb\(\s*0\s*,\s*128\s*,\s*0\s*\)/)
      })
      .then(done)
      .catch(done)
  })
})
