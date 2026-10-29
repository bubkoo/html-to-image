import type { Capture, CaptureNode, EncodingOptions, Options } from './types.js'
import { cloneNode } from './clone-node.js'
import { applyStyle } from './apply-style.js'
import { embedWebFonts } from './embed-webfonts.js'
import { embedImages } from './embed-images.js'
import { CaptureTask } from './task.js'
import {
  canvasToBlob,
  checkCanvasDimensions,
  createImage,
  getImageSize,
  getPixelRatio,
  nodeToDataURL,
} from './util.js'

function getContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A 2D canvas context is not available')
  return context
}

export async function createCapture(
  node: CaptureNode,
  options: Options,
  task: CaptureTask,
  release: () => void = () => {},
): Promise<Capture> {
  try {
    return await task.run(async () => {
      const ownerDocument = node.ownerDocument
      const { width, height } = getImageSize(node as HTMLElement, options)
      const pixelRatio = options.pixelRatio ?? getPixelRatio()
      const canvasWidth = options.canvasWidth ?? width
      const canvasHeight = options.canvasHeight ?? height
      if (
        [width, height, canvasWidth, canvasHeight].some(
          (value) => !Number.isFinite(value) || value < 0,
        ) ||
        !Number.isFinite(pixelRatio) ||
        pixelRatio <= 0
      ) {
        throw new Error(
          'Capture dimensions must be finite and non-negative; pixelRatio must be positive',
        )
      }

      task.stage('clone')
      const root = (await cloneNode(node as HTMLElement, options, true))!
      applyStyle(root, options)
      task.stage('transform')
      const context = Object.freeze({ root, signal: task.context.signal })
      if (options.onClone) await options.onClone(context)
      const plugins = options.plugins || []
      for (let i = 0; i < plugins.length; i += 1) {
        task.check()
        // eslint-disable-next-line no-await-in-loop
        await plugins[i].transformClone?.(context)
      }
      task.stage('resources')
      await embedWebFonts(root, options, node)
      task.check()
      await embedImages(root, options)
      task.stage('serialize')
      return fromSnapshot(
        {
          svg: await nodeToDataURL(root, width, height),
          width,
          height,
          canvasWidth,
          canvasHeight,
          pixelRatio,
        },
        ownerDocument,
        options,
        task,
        release,
      )
    })
  } catch (error) {
    task.dispose()
    release()
    throw error
  }
}

interface Snapshot {
  readonly svg: string
  readonly width: number
  readonly height: number
  readonly canvasWidth: number
  readonly canvasHeight: number
  readonly pixelRatio: number
}

function fromSnapshot(
  snapshot: Snapshot,
  ownerDocument: Document,
  options: Options,
  task: CaptureTask,
  release: () => void,
): Capture {
  const { width, height, canvasWidth, canvasHeight, pixelRatio } = snapshot
  let svg: string | null = snapshot.svg
  // The snapshot retains serialized content, never the live source tree.
  let raster: Promise<HTMLCanvasElement> | undefined
  let disposed = false

  const render = () => {
    task.check()
    if (!raster) {
      const source = svg!
      raster = (async () => {
        task.stage('render')
        if (!width || !height || !canvasWidth || !canvasHeight) {
          throw new Error('Cannot rasterize a zero-sized capture')
        }
        let canvas: HTMLCanvasElement | undefined
        const attempts = options.stabilizationAttempts ?? 1
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          // Re-rasterize the same serialized SVG. Re-cloning would capture a
          // different DOM state and defeat snapshot semantics.
          // eslint-disable-next-line no-await-in-loop
          const image = await createImage(source, options)
          task.check()
          canvas = ownerDocument.createElement('canvas')
          canvas.width = canvasWidth * pixelRatio
          canvas.height = canvasHeight * pixelRatio
          if (!options.skipAutoScale) checkCanvasDimensions(canvas)
          canvas.style.width = `${canvasWidth}px`
          canvas.style.height = `${canvasHeight}px`
          const ctx = getContext(canvas)
          if (options.backgroundColor) {
            ctx.fillStyle = options.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        }
        return canvas!
      })()
    }
    return raster
  }

  const capture: Capture = {
    width,
    height,
    get diagnostics() {
      return Object.freeze([...task.diagnostics])
    },
    toSvg: () => task.run(async () => svg!),
    toCanvas: () =>
      task.run(async () => {
        const source = await render()
        task.check()
        const canvas = source.ownerDocument.createElement('canvas')
        canvas.width = source.width
        canvas.height = source.height
        canvas.style.cssText = source.style.cssText
        getContext(canvas).drawImage(source, 0, 0)
        return canvas
      }),
    toPng: () => task.run(async () => (await render()).toDataURL('image/png')),
    toJpeg: (encoding = {}) =>
      task.run(async () =>
        (await render()).toDataURL(
          'image/jpeg',
          encoding.quality ?? options.quality ?? 1,
        ),
      ),
    toBlob: (encoding: EncodingOptions = {}) =>
      task.run(async () =>
        canvasToBlob(await render(), {
          type: encoding.type ?? options.type,
          quality: encoding.quality ?? options.quality,
        }),
      ),
    toImageData: () =>
      task.run(async () => {
        const canvas = await render()
        task.check()
        return getContext(canvas).getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        )
      }),
    toPixelData: async () => (await capture.toImageData()).data,
    dispose: () => {
      if (disposed) return
      disposed = true
      svg = null
      raster = undefined
      task.dispose()
      release()
    },
  }
  return Object.freeze(capture)
}
