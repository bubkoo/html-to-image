/// <reference lib="es2021.weakref" />

import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import { createRenderer } from '../../src'

test('cancellation releases private SVG work while a custom font resolver remains pending', async () => {
  const sheet = document.createElement('style')
  sheet.textContent =
    '@font-face{font-family:"Pending SVG Font";src:url("/test/browser/fixtures/font-metrics.ttf")}'
  document.head.append(sheet)
  await document.fonts.load('20px "Pending SVG Font"', 'A')
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px;font-family:"Pending SVG Font"'
  root.innerHTML =
    '<svg width="20" height="20"><use href="/test/browser/fixtures/svg-styles/class.svg#icon" width="20" height="20" fill="green"/></svg>'
  document.body.append(root)
  const source = root.outerHTML
  const frames = Array.from(document.querySelectorAll('iframe'))
  let reference: WeakRef<Document> | undefined
  const observer = new MutationObserver((records) => {
    records.forEach((record) =>
      Array.from(record.addedNodes).forEach((node) => {
        if (
          node instanceof HTMLIFrameElement &&
          node.srcdoc.includes('data-svg-style-policy')
        )
          node.addEventListener(
            'load',
            () => {
              if (node.contentDocument)
                reference = new WeakRef(node.contentDocument)
            },
            { once: true },
          )
      }),
    )
  })
  observer.observe(document.documentElement, { childList: true })
  const controller = new AbortController()
  const reason = new DOMException(
    'cancel stalled source-font resolver',
    'AbortError',
  )
  let release!: (blob: Blob) => void
  let entered!: () => void
  const waiting = new Promise<void>((resolve) => {
    entered = resolve
  })
  const renderer = createRenderer({
    signal: controller.signal,
    resources: {
      resolve: ({ kind }) => {
        if (kind !== 'font') return undefined
        entered()
        return new Promise<Blob>((resolve) => {
          release = resolve
        })
      },
    },
  })
  const operation = renderer.capture(root)
  try {
    expect(
      await Promise.race([
        waiting.then(() => true),
        operation.then(() => false),
      ]),
    ).toBe(true)
    expect(document.querySelectorAll('iframe').length).toBe(frames.length + 1)
    expect(reference).toBeDefined()
    observer.disconnect()
    controller.abort(reason)
    await expect(operation).rejects.toBe(reason)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
    expect(root.outerHTML).toBe(source)
    // WebKit retains even a removed iframe in the existing native GC control.
    // Both remaining engines must collect ours before the foreign promise settles.
    if (server.browser !== 'webkit') {
      await commands.collectGarbage()
      await commands.collectGarbage()
      await commands.collectGarbage()
      expect(reference!.deref()).toBeUndefined()
    }
  } finally {
    observer.disconnect()
    release?.(new Blob([], { type: 'font/ttf' }))
    await operation.catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 0))
    renderer.dispose()
    root.remove()
    sheet.remove()
  }
})
