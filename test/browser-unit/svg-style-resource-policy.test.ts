import { test, expect } from 'vitest'
import { commands, server } from 'vitest/browser'
import { createRenderer } from '../../src'

declare module 'vitest/browser' {
  interface BrowserCommands {
    startSVGStyleResourceTrace(
      marker: string,
      blobURLs?: string[],
    ): Promise<void>
    endSVGStyleResourceTrace(marker: string): Promise<string[]>
  }
}

test('external SVG style evaluation neither preloads resources nor executes content', async () => {
  const marker = 'svg-style-safety-' + crypto.randomUUID()
  const imageURL = new URL(
    '/test/browser/fixtures/svg-styles/plain.svg?scope=' + marker,
    location.href,
  ).href
  const frameURL = new URL(
    '/test/browser/umd.html?scope=' + marker,
    location.href,
  ).href
  const sourceURL = new URL(
    '/test/browser/fixtures/svg-styles/class.svg',
    location.href,
  ).href
  const green =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>'
  const blobURL = URL.createObjectURL(
    new Blob([green], { type: 'image/svg+xml' }),
  )
  const script =
    'window.__htiSVGStyleScript=1;window.parent.__htiSVGStyleScript=1'
  const xml =
    '<svg xmlns="http://www.w3.org/2000/svg" id="icon" width="20" height="20"><script>' +
    script +
    '</script><rect width="20" height="20" fill="green"/><image href="' +
    imageURL +
    '" width="20" height="20"/><foreignObject width="5" height="5"><div xmlns="http://www.w3.org/1999/xhtml"><img src="' +
    imageURL +
    '" onload="' +
    script +
    '"/><img src="' +
    blobURL +
    '"/><iframe src="' +
    frameURL +
    '"/></div></foreignObject></svg>'
  const state = window as typeof window & { __htiSVGStyleScript?: number }
  state.__htiSVGStyleScript = 0
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px'
  root.innerHTML =
    '<svg width="20" height="20"><use href="' +
    sourceURL +
    '#icon" width="20" height="20" fill="green"/></svg>'
  document.body.append(root)
  const requests: string[] = []
  const renderer = createRenderer({
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }) => {
        requests.push(url)
        if (url === sourceURL) return new Blob([xml], { type: 'image/svg+xml' })
        if (url === imageURL || url === blobURL)
          return new Blob([green], { type: 'image/svg+xml' })
      },
    },
  })
  await commands.startSVGStyleResourceTrace(marker, [blobURL])
  let stopped = false
  try {
    const image = await renderer.toSvg(root)
    const control = new URL(imageURL)
    control.searchParams.set('control', '1')
    await fetch(control, { cache: 'no-store' })
    const network = await commands.endSVGStyleResourceTrace(marker)
    stopped = true
    const result = {
      browser: server.browser,
      network,
      scriptRan: state.__htiSVGStyleScript,
      requests,
    }
    await commands.recordScrollbarBoxEvidence(
      JSON.stringify({
        ...result,
        engine: server.browser,
        kind: 'svg-style-resource-policy',
      }),
    )
    expect(decodeURIComponent(image)).toContain('<svg')
    expect(requests).toContain(imageURL)
    expect(requests).toContain(blobURL)
    expect(network).toEqual([control.pathname + control.search])
    expect(state.__htiSVGStyleScript).toBe(0)
  } finally {
    if (!stopped) await commands.endSVGStyleResourceTrace(marker)
    renderer.dispose()
    root.remove()
    delete state.__htiSVGStyleScript
    URL.revokeObjectURL(blobURL)
  }
})

test('aborting external SVG style evaluation releases its isolated document', async () => {
  const root = document.createElement('div')
  root.innerHTML =
    '<svg width="20" height="20"><use href="/test/browser/fixtures/svg-styles/class.svg#icon" width="20" height="20"/></svg>'
  document.body.append(root)
  const controller = new AbortController()
  const reason = new DOMException('cancel private SVG style work', 'AbortError')
  const frames = Array.from(document.querySelectorAll('iframe'))
  let found = false
  const observer = new MutationObserver((records) => {
    records.forEach((record) =>
      Array.from(record.addedNodes).forEach((node) => {
        if (
          node instanceof HTMLIFrameElement &&
          node.srcdoc.includes('data-svg-style-policy')
        ) {
          found = true
          controller.abort(reason)
        }
      }),
    )
  })
  observer.observe(document.documentElement, { childList: true })
  const renderer = createRenderer({
    skipFonts: true,
    signal: controller.signal,
  })
  try {
    await expect(renderer.toSvg(root)).rejects.toBe(reason)
    expect(found).toBe(true)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
  } finally {
    observer.disconnect()
    renderer.dispose()
    root.remove()
  }
})
