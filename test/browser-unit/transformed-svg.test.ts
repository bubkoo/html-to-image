import { expect, test } from 'vitest'
import * as api from '../../src'
import { cloneNode } from '../../src/clone-node.js'
import { nodeToDataURL } from '../../src/util.js'

const moduleURL = '/test/browser/fixtures/transformed-svg.mjs'

test.each([
  'onClone',
  'plugin',
  'async',
  'retarget',
  'local',
  'filtered',
  'resolver-error',
  'remove',
  'remove-plugin',
  'iframe-remove',
  'local-callback-error',
])('SVG references from %s are discovered after transforms', async (mode) => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  expect(await fixture.checkTransformedSVG(api, mode)).toBe(true)
})

test('standalone cloning keeps its existing SVG reference resolution', async () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px;background:white'
  root.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><use href="/test/browser/fixtures/transform-symbol.svg#green" width="20" height="20"/></svg>'
  document.body.append(root)
  const source = root.outerHTML
  try {
    const copy = await cloneNode(root, { skipFonts: true }, true)
    if (!copy) throw new Error('Standalone clone was missing')
    const image = new Image()
    image.src = await nodeToDataURL(copy, 20, 20)
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 20
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    expect(Array.from(context.getImageData(10, 10, 1, 1).data)).toEqual([
      0, 128, 0, 255,
    ])
    expect(root.outerHTML).toBe(source)
  } finally {
    root.remove()
  }
})
