import { expect, test } from 'vitest'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/resource-policy.mjs'

test('HTTP resources deduplicate without clone preloads and expire with captures', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  expect(await fixture.checkResourceCache(api)).toEqual({
    fetches: 3,
    nativeDuplicates: 0,
    disposed: true,
    rendererDisposed: true,
    sourceUnchanged: true,
  })
})

test('fetchRequestInit no-cache revalidates the real HTTP cache', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  expect(await fixture.checkNativeCachePolicy(api)).toEqual({
    revalidated: 'blue',
    requestRevalidated: true,
  })
})

test('relative styles, clone transforms and iframe resources keep source URL context and errors', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  expect(await fixture.checkRelativeCloneAssets(api)).toEqual({
    relativeBackground: true,
    insertedImage: true,
    iframeImage: true,
    originalError: true,
    sourceUnchanged: true,
  })
})

test('a malformed SVG image URL still reaches clone-only image recovery', async () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px;background:green'
  root.innerHTML =
    '<svg width="20" height="20"><image href="http://[" width="20" height="20"/></svg>'
  document.body.append(root)
  const source = root.querySelector('image')!
  let handled: SVGImageElement | undefined
  try {
    const image = await api.toImageData(root, {
      skipFonts: true,
      pixelRatio: 1,
      onImageErrorHandler: function () {
        handled = this as unknown as SVGImageElement
        handled.remove()
      },
    })
    expect(
      Array.from(
        image.data.slice(
          4 * (10 * image.width + 10),
          4 * (10 * image.width + 10) + 4,
        ),
      ),
    ).toEqual([0, 128, 0, 255])
    expect(handled).toBeDefined()
    expect(handled).not.toBe(source)
    expect(root.querySelector('image')).toBe(source)
    expect(source.getAttribute('href')).toBe('http://[')
  } finally {
    root.remove()
  }
})
