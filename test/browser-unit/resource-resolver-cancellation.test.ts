/// <reference lib="es2021.weakref" />

import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import { createRenderer } from '../../src'
import {
  createSVGStyleEnvironment,
  detectSVGStylePolicy,
} from '../../src/svg-style-scope'

declare module 'vitest/browser' {
  interface BrowserCommands {
    gcObserverDiagnosticsEnabled(): Promise<boolean>
    recordGCObserverEvidence(record: string): Promise<void>
  }
}

async function nativeFrame(fonts: FontFace[], probed = false) {
  const frame = document.createElement('iframe')
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve()
  })
  frame.srcdoc = '<body></body>'
  document.body.append(frame)
  try {
    await loaded
    frame.onload = null
    const doc = frame.contentDocument!
    const errors: string[] = []
    fonts.forEach((font) => {
      try {
        ;(doc.fonts as FontFaceSet & { add(font: FontFace): void }).add(font)
      } catch (error) {
        errors.push((error as Error).name)
      }
    })
    if (probed) await detectSVGStylePolicy(doc, () => {})
    return { reference: new WeakRef(doc), errors }
  } finally {
    frame.remove()
  }
}

async function nativeRetention() {
  const fonts: FontFace[] = []
  document.fonts.forEach((font) => fonts.push(font))
  const plain = await nativeFrame([])
  const shared = await nativeFrame(fonts)
  const nativeProbe = await nativeFrame(fonts, true)
  const probe = await measuredFrame()
  await commands.collectGarbage()
  await commands.collectGarbage()
  await commands.collectGarbage()
  return {
    plain: !!plain.reference.deref(),
    sharedFonts: !!shared.reference.deref(),
    nativeProbe: !!nativeProbe.reference.deref(),
    measuredProbe: !!probe.deref(),
    sharingErrors: shared.errors,
  }
}

function retainedTree(reference: WeakRef<Document>) {
  const doc = reference.deref()
  return doc
    ? {
        elements: Array.from(
          doc.querySelectorAll('*'),
          (node) => node.localName,
        ),
        shadows: Array.from(doc.querySelectorAll('div'), (node) =>
          node.shadowRoot?.innerHTML.slice(0, 300),
        ),
      }
    : undefined
}

async function measuredFrame() {
  const environment = createSVGStyleEnvironment(document)
  try {
    await environment.measurePolicy(() => {})
    return new WeakRef(await environment.getDocument())
  } finally {
    environment.dispose()
  }
}

async function disposedEnvironment(probed: boolean) {
  const environment = createSVGStyleEnvironment(document)
  try {
    if (probed) await environment.measurePolicy(() => {})
    return {
      environment,
      reference: new WeakRef(await environment.getDocument()),
    }
  } finally {
    environment.dispose()
  }
}

async function observerDiagnostics(
  kind: string,
  probed: boolean,
  reference: WeakRef<Document>,
  primary: { ownerCollected: boolean; [key: string]: unknown },
) {
  if (
    primary.ownerCollected &&
    !(await commands.gcObserverDiagnosticsEnabled())
  )
    return
  const url = '/test/browser/fixtures/gc-observer-controls.mjs'
  const fixture = await import(/* @vite-ignore */ url)
  const observers = await fixture.sampleEnvironmentObservers(
    createSVGStyleEnvironment,
    detectSVGStylePolicy,
    probed,
    () => commands.collectGarbage(),
    reference,
  )
  await commands.recordGCObserverEvidence(
    JSON.stringify({ engine: server.browser, kind, primary, observers }),
  )
}

test.each([false, true])(
  'a disposed SVG environment releases its document with probed=%s',
  async (probed) => {
    const frames = Array.from(document.querySelectorAll('iframe'))
    const fonts: FontFace[] = []
    document.fonts.forEach((font) => fonts.push(font))
    const native = await nativeFrame(fonts, probed)
    const { environment, reference } = await disposedEnvironment(probed)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
    if (server.browser !== 'webkit') {
      await commands.collectGarbage()
      await commands.collectGarbage()
      await commands.collectGarbage()
      const diagnosis = {
        nativeCollected: native.reference.deref() === undefined,
        ownerCollected: reference.deref() === undefined,
      }
      await observerDiagnostics(
        'environment-' + probed,
        probed,
        reference,
        diagnosis,
      )
      expect(diagnosis.ownerCollected, JSON.stringify(diagnosis)).toBe(true)
      expect(diagnosis.nativeCollected).toBe(true)
    }
    await expect(environment.getDocument()).rejects.toThrow(/disposed/)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
  },
)

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
      const collected = reference!.deref() === undefined
      const tree = collected ? undefined : retainedTree(reference!)
      const diagnosis = collected
        ? undefined
        : { native: await nativeRetention(), tree }
      await observerDiagnostics('pending-font', true, reference!, {
        ownerCollected: collected,
        nativeDiagnosticCollections: diagnosis ? 3 : 0,
        diagnosis,
      })
      // Report primitive observations rather than rooting the failed document
      // in the test reporter and contaminating later collection controls.
      expect(collected, JSON.stringify(diagnosis)).toBe(true)
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
