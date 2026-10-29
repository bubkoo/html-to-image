import type { CaptureNode, Options } from './types.js'
import { createRenderer } from './renderer.js'

export { createRenderer } from './renderer.js'
export type {
  Capture,
  CaptureNode,
  CapturePlugin,
  CaptureDiagnostic,
  CaptureEvent,
  CaptureStage,
  CloneContext,
  CloneTransform,
  EncodingOptions,
  ExtensionContext,
  Options,
  Renderer,
  ResourceKind,
  ResourceOptions,
  ResourceRequest,
  ResourceResolver,
} from './types.js'

// This facade owns no configuration, source nodes, or resource cache.
const renderer = createRenderer()

export function toSvg<T extends CaptureNode>(node: T, options: Options = {}) {
  return renderer.toSvg(node, options)
}

export function toCanvas<T extends CaptureNode>(
  node: T,
  options: Options = {},
) {
  return renderer.toCanvas(node, options)
}

export function toPng<T extends CaptureNode>(node: T, options: Options = {}) {
  return renderer.toPng(node, options)
}

export function toJpeg<T extends CaptureNode>(node: T, options: Options = {}) {
  return renderer.toJpeg(node, options)
}

export function toBlob<T extends CaptureNode>(node: T, options: Options = {}) {
  return renderer.toBlob(node, options)
}

export function toPixelData<T extends CaptureNode>(
  node: T,
  options: Options = {},
) {
  return renderer.toPixelData(node, options)
}

export function toImageData<T extends CaptureNode>(
  node: T,
  options: Options = {},
) {
  return renderer.toImageData(node, options)
}

export function getFontEmbedCSS<T extends CaptureNode>(
  node: T,
  options: Options = {},
) {
  return renderer.getFontEmbedCSS(node, options)
}
