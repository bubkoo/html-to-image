/// <reference lib="es2021.weakref" />

import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import { createSVGStyleEnvironment } from '../../src/svg-style-scope'

function fontState(doc: Document) {
  const state: string[] = []
  doc.fonts.forEach((font) => state.push(font.family + ':' + font.status))
  return state
}

async function sourceFrame(font: boolean, opened: boolean, keepOwner: boolean) {
  const frame = document.createElement('iframe')
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve()
  })
  const family = 'Source Lifetime ' + crypto.randomUUID()
  frame.srcdoc =
    '<!doctype html><style>' +
    (font
      ? `@font-face{font-family:"${family}";src:url("/test/browser/fixtures/font-metrics.ttf")}`
      : '') +
    '</style><body>Owned source font lifetime</body>'
  document.body.append(frame)
  let environment: ReturnType<typeof createSVGStyleEnvironment> | undefined
  try {
    await loaded
    frame.onload = null
    const doc = frame.contentDocument!
    if (font) {
      const faces = await doc.fonts.load(`20px "${family}"`, 'A')
      if (faces.length !== 1 || faces[0].status !== 'loaded')
        throw new Error('Source font positive control did not load')
      await doc.fonts.ready
    }
    const markup = doc.documentElement.outerHTML
    const fonts = fontState(doc)
    if (keepOwner) {
      environment = createSVGStyleEnvironment(doc)
      if (opened) await environment.getDocument()
      environment.dispose()
    }
    return {
      environment,
      reference: new WeakRef(doc),
      sourceUnchanged: markup === doc.documentElement.outerHTML,
      beforeFonts: fonts,
      afterFonts: fontState(doc),
    }
  } finally {
    environment?.dispose()
    frame.remove()
  }
}

test.each([
  { font: false, opened: false },
  { font: true, opened: false },
  { font: false, opened: true },
  { font: true, opened: true },
])(
  'disposed SVG owner releases source with font=$font and opened=$opened',
  async ({ font, opened }) => {
    const frames = Array.from(document.querySelectorAll('iframe'))
    const native = await sourceFrame(font, opened, false)
    const held = await sourceFrame(font, opened, true)
    expect(native.sourceUnchanged).toBe(true)
    expect(held.sourceUnchanged).toBe(true)
    expect(native.afterFonts).toEqual(native.beforeFonts)
    expect(held.afterFonts).toEqual(held.beforeFonts)
    expect(held.beforeFonts).toHaveLength(font ? 1 : 0)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
    // WebKit also retains the paired native removed-frame control; keep its
    // DOM, source/font preservation and terminal-state assertions below.
    if (server.browser !== 'webkit') {
      await commands.collectGarbage()
      await commands.collectGarbage()
      await commands.collectGarbage()
      // Keep failed assertions from storing the document itself in the test
      // report and retaining it through subsequent collection controls.
      expect(native.reference.deref() === undefined).toBe(true)
      expect(held.reference.deref() === undefined).toBe(true)
    }
    await expect(held.environment!.getDocument()).rejects.toThrow(/disposed/)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
  },
)
