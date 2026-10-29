import type { Capture, CaptureNode, Options, Renderer } from './types.js'
import { createCapture } from './capture.js'
import { getWebFontCSS } from './embed-webfonts.js'
import { CaptureTask, copyOptions } from './task.js'

export function createRenderer(defaults: Options = {}): Renderer {
  const configuration = copyOptions(defaults)
  const tasks = new Set<CaptureTask>()
  const captures = new Map<CaptureTask, Capture>()
  let disposed = false

  const start = (options: Options) => {
    if (disposed) throw new Error('Renderer has been disposed')
    const task = new CaptureTask(copyOptions(configuration, options))
    tasks.add(task)
    return task
  }

  const capture = async (node: CaptureNode, options: Options = {}) => {
    const task = start(options)
    const result = await createCapture(node, task.options, task, () => {
      tasks.delete(task)
      captures.delete(task)
    })
    // Disposal can race with the final microtask of capture creation.
    if (disposed || task.context.signal.aborted) {
      result.dispose()
      throw (
        task.context.signal.reason || new Error('Renderer has been disposed')
      )
    }
    captures.set(task, result)
    return result
  }

  const output = async <T>(
    node: CaptureNode,
    options: Options,
    encode: (snapshot: Capture) => Promise<T>,
  ) => {
    const snapshot = await capture(node, options)
    try {
      return await encode(snapshot)
    } finally {
      snapshot.dispose()
    }
  }

  return Object.freeze({
    capture,
    toSvg: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toSvg()),
    toCanvas: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toCanvas()),
    toPng: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toPng()),
    toJpeg: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toJpeg()),
    toBlob: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toBlob()),
    toPixelData: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toPixelData()),
    toImageData: (node: CaptureNode, options: Options = {}) =>
      output(node, options, (snapshot) => snapshot.toImageData()),
    getFontEmbedCSS: async (node: CaptureNode, options: Options = {}) => {
      const task = start(options)
      try {
        return await task.run(() =>
          getWebFontCSS(node as HTMLElement, task.options),
        )
      } finally {
        task.dispose()
        tasks.delete(task)
      }
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      captures.forEach((snapshot) => snapshot.dispose())
      tasks.forEach((task) => task.dispose())
      captures.clear()
      tasks.clear()
    },
  })
}
