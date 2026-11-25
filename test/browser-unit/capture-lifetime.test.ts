/// <reference lib="es2021.weakref" />

import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import { createRenderer } from '../../src'
import { recordGCFailure } from './gc-failure'

declare module 'vitest/browser' {
  interface BrowserCommands {
    collectGarbage: () => Promise<void>
  }
}

async function captureFrame() {
  const frame = document.createElement('iframe')
  frame.srcdoc =
    '<body style="margin:0;width:20px;height:20px;background:green"></body>'
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve()
  })
  document.body.append(frame)
  const renderer = createRenderer({ pixelRatio: 1, skipFonts: true })
  try {
    await loaded
    const reference = new WeakRef(frame.contentDocument!)
    const capture = await renderer.capture(frame.contentDocument!.body)
    return { reference, capture, renderer }
  } catch (error) {
    renderer.dispose()
    throw error
  } finally {
    frame.remove()
  }
}

async function captureDetachedDocument() {
  const source = document.implementation.createHTMLDocument()
  source.body.style.cssText = 'margin:0;width:20px;height:20px;background:green'
  const renderer = createRenderer({
    width: 20,
    height: 20,
    pixelRatio: 1,
    skipFonts: true,
  })
  try {
    const reference = new WeakRef(source)
    const capture = await renderer.capture(source.body)
    return { reference, capture, renderer }
  } catch (error) {
    renderer.dispose()
    throw error
  }
}

async function collectGarbage() {
  // Separate browser commands also end the job that created each WeakRef.
  await commands.collectGarbage()
  await commands.collectGarbage()
  await commands.collectGarbage()
}

async function removedFrameControl() {
  const frame = document.createElement('iframe')
  frame.srcdoc =
    '<body style="margin:0;width:20px;height:20px;background:green"></body>'
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve()
  })
  document.body.append(frame)
  try {
    await loaded
    return new WeakRef(frame.contentDocument!)
  } finally {
    frame.remove()
  }
}

test('a frozen snapshot releases its source document before lazy rendering', async () => {
  const { reference, capture, renderer } = await captureDetachedDocument()
  try {
    await collectGarbage()
    const collected = reference.deref() === undefined
    if (!collected)
      await recordGCFailure(reference, collected, 'capture/frozen-detached')
    expect(collected).toBe(true)
    const image = await capture.toImageData()
    expect([image.width, image.height]).toEqual([20, 20])
    expect(Array.from(image.data.slice(0, 4))).toEqual([0, 128, 0, 255])
  } finally {
    renderer.dispose()
  }
})

test('holding a disposed capture does not retain its source document', async () => {
  const { reference, capture, renderer } = await captureDetachedDocument()
  try {
    await capture.toImageData()
    capture.dispose()
    renderer.dispose()
    await collectGarbage()
    const collected = reference.deref() === undefined
    if (!collected)
      await recordGCFailure(reference, collected, 'capture/disposed-detached')
    expect(collected).toBe(true)
    await expect(capture.toSvg()).rejects.toThrow(/disposed/)
  } finally {
    renderer.dispose()
  }
})

test('a removed iframe capture returns independent canvases in the library document', async () => {
  const { capture, renderer } = await captureFrame()
  try {
    const first = await capture.toCanvas()
    expect(first.ownerDocument).toBe(document)
    expect([first.width, first.height]).toEqual([20, 20])
    first.getContext('2d')!.clearRect(0, 0, 20, 20)
    const second = await capture.toCanvas()
    expect(second.ownerDocument).toBe(document)
    expect(
      Array.from(second.getContext('2d')!.getImageData(0, 0, 1, 1).data),
    ).toEqual([0, 128, 0, 255])
  } finally {
    renderer.dispose()
  }
})

// WebKit retains even an iframe with no capture in the native removal control.
// Its detached-document GC and removed-iframe output checks still run above.
test.runIf(server.browser !== 'webkit')(
  'a removed iframe document is collectible while its snapshot remains usable',
  async () => {
    const native = await removedFrameControl()
    const { reference, capture, renderer } = await captureFrame()
    try {
      await collectGarbage()
      const diagnosis = {
        nativeCollected: native.deref() === undefined,
        capturedCollected: reference.deref() === undefined,
      }
      if (!diagnosis.capturedCollected)
        await recordGCFailure(
          reference,
          diagnosis.capturedCollected,
          'capture/removed-frame',
          diagnosis,
        )
      else if (!diagnosis.nativeCollected)
        await recordGCFailure(
          native,
          diagnosis.nativeCollected,
          'capture/native-frame',
          diagnosis,
        )
      expect(diagnosis.capturedCollected, JSON.stringify(diagnosis)).toBe(true)
      expect(diagnosis.nativeCollected).toBe(true)
      const image = await capture.toImageData()
      expect(Array.from(image.data.slice(0, 4))).toEqual([0, 128, 0, 255])
    } finally {
      renderer.dispose()
    }
  },
)
