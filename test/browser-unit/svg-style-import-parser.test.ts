import { expect, test } from 'vitest'
import {
  prepareSVGFileStyle,
  rewriteSVGStyleURLs,
} from '../../src/svg-style-imports'

test.each(['ordered', 'urls', 'untyped'])(
  'SVG import preparation retains native HTML CSS semantics for %s',
  async (mode) => {
    const data = (text: string) => 'data:text/css,' + encodeURIComponent(text)
    const imported =
      mode === 'untyped'
        ? 'data:text/css;charset=windows-1252,.caf%E9{fill:green!important}'
        : data(
            mode === 'urls'
              ? '@supports (display:grid){.shape{fill:url("#owned-paint") green;stroke:url("https://example.invalid/paint.svg#owned") blue}}'
              : '.shape{fill:green!important}',
          )
    const css =
      mode === 'ordered'
        ? `@import url("${imported}") layer(imported);@layer later{.shape{fill:blue!important}}`
        : `@import url("${imported}");`
    const frame = document.createElement('iframe')
    const ready = new Promise<void>((resolve) => {
      frame.onload = () => resolve()
    })
    frame.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline' data:;img-src 'none'"><link rel="stylesheet" href="${data(css)}"><body><svg xmlns="http://www.w3.org/2000/svg"><rect class="shape café" width="20" height="20"/></svg></body>`
    document.body.append(frame)
    try {
      await ready
      frame.onload = null
      const doc = frame.contentDocument!
      const view = frame.contentWindow! as Window & typeof globalThis
      const native = view.getComputedStyle(doc.querySelector('rect')!)
      const expected = { fill: native.fill, stroke: native.stroke }
      if (mode === 'urls') expect(expected.fill).toContain('#owned-paint')
      else expect(expected.fill).toBe('rgb(0, 128, 0)')
      const prepared = await prepareSVGFileStyle(
        css,
        doc,
        { dataImports: true, fileLayers: 'ordered', importLayers: 'ordered' },
        async (url) => {
          const blob = await (await fetch(url)).blob()
          return mode === 'untyped' ? blob.slice(0, blob.size, '') : blob
        },
        async () => {},
        (_url, error) => {
          throw error
        },
      )
      const host = doc.createElement('div')
      const shadow = host.attachShadow({ mode: 'open' })
      const sheet = new view.CSSStyleSheet()
      sheet.replaceSync(prepared)
      shadow.adoptedStyleSheets = [sheet]
      shadow.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect class="shape café" width="20" height="20"/></svg>'
      doc.body.append(host)
      const actual = view.getComputedStyle(shadow.querySelector('rect')!)
      expect({ fill: actual.fill, stroke: actual.stroke }).toEqual(expected)
    } finally {
      frame.remove()
    }
  },
)

test.each([
  String.raw`/* url(ignored.svg) */.shape{fill:url("#paint") green;stroke:url("https://example.invalid/p.svg") blue;--text:"url(ignored.svg)";--other:myurl(ignored.svg)}`,
  String.raw`.shape{fill:url("\23 paint") green;stroke:url("https://example.invalid/a\)b.svg") blue}`,
  String.raw`.shape{fill:url("\0 paint") green;stroke:url("https://example.invalid/a\110000 b.svg") blue}`,
  `.shape{fill:url("\\d800 paint") green;stroke:url("https://example.invalid/a\\\nb.svg") blue}`,
  '.shape{fill:green;fill:url("broken.svg" invalid);stroke:blue}/* url(unfinished.svg)',
  '.shape{fill:green;fill:url(bad"quote.svg);stroke:blue}',
  '.shape{fill:green;fill:url("bad\nquote.svg");stroke:blue}',
  '.shape{fill:url("https://example.invalid/a\u0000b.svg") green;stroke:blue}',
  String.raw`.shape{fill:url(https://example.invalid/p.svg) green;stroke:url(https://example.invalid/a\28 b\29 .svg) blue}`,
])('URL rewriting preserves native CSS tokens: %s', async (css) => {
  const frame = document.createElement('iframe')
  const ready = new Promise<void>((resolve) => {
    frame.onload = () => resolve()
  })
  frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';img-src 'none'"><style>${css}</style><body><svg xmlns="http://www.w3.org/2000/svg"><rect class="shape"/></svg></body>`
  document.body.append(frame)
  try {
    await ready
    frame.onload = null
    const doc = frame.contentDocument!
    const view = frame.contentWindow! as Window & typeof globalThis
    const read = (node: Element) => {
      const style = view.getComputedStyle(node)
      return {
        fill: style.fill,
        stroke: style.stroke,
        text: style.getPropertyValue('--text'),
        other: style.getPropertyValue('--other'),
      }
    }
    const expected = read(doc.querySelector('rect')!)
    const host = doc.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const sheet = new view.CSSStyleSheet()
    sheet.replaceSync(
      rewriteSVGStyleURLs(css, (value) =>
        value.startsWith('#') ? undefined : new URL(value, doc.baseURI).href,
      ),
    )
    shadow.adoptedStyleSheets = [sheet]
    shadow.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect class="shape"/></svg>'
    doc.body.append(host)
    expect(read(shadow.querySelector('rect')!)).toEqual(expected)
  } finally {
    frame.remove()
  }
})
