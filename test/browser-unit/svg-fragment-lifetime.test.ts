/// <reference lib="es2021.weakref" />
import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import { createRenderer } from '../../src'
const fixtureURL = '/test/browser/fixtures/svg-fragment-paint.mjs'
async function captureDocument() {
  const source = document.implementation.createHTMLDocument()
  source.body.style.cssText =
    'display:flex;margin:0;width:60px;height:20px;background:white'
  const href = new URL(
    '/test/browser/fixtures/svg-fragment-pattern.svg#inline',
    location.href,
  ).href
  source.body.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs><pattern id="fragment-paint" patternUnits="userSpaceOnUse" width="20" height="20"><rect width="20" height="20" fill="blue"/></pattern></defs></svg><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><use href="' +
    href +
    '" width="20" height="20"/></svg><div style="width:20px;height:20px;background:blue"></div><div style="width:20px;height:20px;background:yellow"></div>'
  const renderer = createRenderer({
    width: 60,
    height: 20,
    pixelRatio: 1,
    skipFonts: true,
  })
  try {
    return {
      reference: new WeakRef(source),
      capture: await renderer.capture(source.body),
      renderer,
    }
  } catch (error) {
    renderer.dispose()
    throw error
  }
}
test('a frozen SVG host-tree capture releases its source document before rendering', async () => {
  const fixture = await import(/* @vite-ignore */ fixtureURL),
    policy = await fixture.getSVGFragmentFixturePolicy()
  const frames = Array.from(document.querySelectorAll('iframe'))
  const { reference, capture, renderer } = await captureDocument()
  try {
    await commands.collectGarbage()
    await commands.collectGarbage()
    await commands.collectGarbage()
    expect(reference.deref() === undefined).toBe(true)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
    const image = await capture.toImageData(),
      offset = 4 * (10 * image.width + 10)
    expect(Array.from(image.data.slice(offset, offset + 4))).toEqual(
      policy.fragmentPage ? [0, 0, 255, 255] : [0, 128, 0, 255],
    )
  } finally {
    renderer.dispose()
  }
})
