export interface Options {
  /** Exclude matching elements and their descendants from the copy. */
  exclude?: readonly string[]
  /** Transform the detached copy before its resources are discovered. */
  onClone?: CloneTransform
  /** Resource configuration scoped to this capture. */
  resources?: ResourceOptions
  /** Extensions run in registration order. Duplicate names are rejected. */
  plugins?: readonly CapturePlugin[]
  /** Cancel capture creation and subsequent output operations. */
  signal?: AbortSignal
  /** Timeout per operation in milliseconds; 0 disables it. Default: 30000. */
  timeout?: number
  /** Rasterize the frozen SVG this many times and use the last result. Default: 1. */
  stabilizationAttempts?: number
  /** Observe capture stages and resource diagnostics. */
  onEvent?: (event: CaptureEvent) => void
  /**
   * Width in pixels to be applied to node before rendering.
   */
  width?: number
  /**
   * Height in pixels to be applied to node before rendering.
   */
  height?: number
  /**
   * A string value for the background color, any valid CSS color value.
   */
  backgroundColor?: string
  /**
   * Width in pixels to be applied to canvas on export.
   */
  canvasWidth?: number
  /**
   * Height in pixels to be applied to canvas on export.
   */
  canvasHeight?: number
  /**
   * An object whose properties to be copied to node's style before rendering.
   */
  style?: Partial<CSSStyleDeclaration>
  /**
   * An array of style properties to be copied to node's style before rendering.
   * For performance-critical scenarios, users may want to specify only the
   * required properties instead of all styles.
   */
  includeStyleProperties?: string[]
  /**
   * A function taking DOM node as argument. Should return `true` if passed
   * node should be included in the output. Excluding node means excluding
   * it's children as well.
   */
  filter?: (domNode: HTMLElement) => boolean
  /**
   * A number between `0` and `1` indicating image quality (e.g. 0.92 => 92%)
   * of the JPEG image.
   */
  quality?: number
  /**
   * Set to `true` to append the current time as a query string to URL
   * requests to enable cache busting.
   */
  cacheBust?: boolean
  /** Full URL is the resource identity by default. Set false for legacy query stripping. */
  includeQueryParams?: boolean
  /**
   * A data URL for a placeholder image that will be used when fetching
   * an image fails. Defaults to an empty string and will render empty
   * areas for failed images.
   */
  imagePlaceholder?: string
  /**
   * The pixel ratio of captured image. Defalut is the actual pixel ratio of
   * the device. Set 1 to use as initial-scale 1 for the image
   */
  pixelRatio?: number
  /**
   * Option to skip the fonts download and embed.
   */
  skipFonts?: boolean
  /**
   * The preferred font format. If specified all other font formats are ignored.
   */
  preferredFontFormat?:
    | 'woff'
    | 'woff2'
    | 'truetype'
    | 'opentype'
    | 'embedded-opentype'
    | 'svg'
    | string
  /**
   * A CSS string to specify for font embeds. If specified only this CSS will
   * be present in the resulting image. Use with `getFontEmbedCSS()` to
   * create embed CSS for use across multiple calls to library functions.
   */
  fontEmbedCSS?: string
  /**
   * A boolean to turn off auto scaling for truly massive images..
   */
  skipAutoScale?: boolean
  /**
   * A string indicating the image format. The default type is image/png; that type is also used if the given type isn't supported.
   */
  type?: string

  /**
   *
   *the second parameter of  window.fetch (Promise<Response> fetch(input[, init]))
   *
   */
  fetchRequestInit?: RequestInit
  /**
   * An event handler for the error event when any image in html has problem with loading.
   */
  onImageErrorHandler?: OnErrorEventHandler
}

export type CaptureNode = HTMLElement | SVGElement

export interface ExtensionContext {
  readonly signal: AbortSignal
}

export interface CloneContext extends ExtensionContext {
  readonly root: CaptureNode
}

export type CloneTransform = (context: CloneContext) => void | Promise<void>

export type ResourceKind = 'image' | 'font' | 'stylesheet'

export interface ResourceRequest {
  readonly url: string
  readonly kind: ResourceKind
  readonly contentType?: string
}

export type ResourceResolver = (
  request: ResourceRequest,
  context: ExtensionContext,
) => Blob | undefined | Promise<Blob | undefined>

export interface ResourceOptions {
  /** Return undefined to continue with plugins and then the default fetch. */
  resolve?: ResourceResolver
}

export interface CapturePlugin {
  readonly name: string
  readonly transformClone?: CloneTransform
  readonly resolveResource?: ResourceResolver
}

export interface CaptureDiagnostic {
  readonly code: 'resource-error'
  readonly message: string
  readonly resource: string
}

export type CaptureStage =
  | 'clone'
  | 'transform'
  | 'resources'
  | 'serialize'
  | 'render'

export type CaptureEvent =
  | { readonly type: 'stage'; readonly stage: CaptureStage }
  | { readonly type: 'warning'; readonly diagnostic: CaptureDiagnostic }

export interface EncodingOptions {
  type?: string
  quality?: number
}

export interface Capture {
  readonly width: number
  readonly height: number
  readonly diagnostics: readonly CaptureDiagnostic[]
  toSvg(): Promise<string>
  /** Returns an independently writable canvas. */
  toCanvas(): Promise<HTMLCanvasElement>
  toPng(): Promise<string>
  toJpeg(options?: Pick<EncodingOptions, 'quality'>): Promise<string>
  toBlob(options?: EncodingOptions): Promise<Blob | null>
  toImageData(): Promise<ImageData>
  toPixelData(): Promise<Uint8ClampedArray>
  dispose(): void
}

export interface Renderer {
  capture(node: CaptureNode, options?: Options): Promise<Capture>
  toSvg(node: CaptureNode, options?: Options): Promise<string>
  toCanvas(node: CaptureNode, options?: Options): Promise<HTMLCanvasElement>
  toPng(node: CaptureNode, options?: Options): Promise<string>
  toJpeg(node: CaptureNode, options?: Options): Promise<string>
  toBlob(node: CaptureNode, options?: Options): Promise<Blob | null>
  toPixelData(node: CaptureNode, options?: Options): Promise<Uint8ClampedArray>
  toImageData(node: CaptureNode, options?: Options): Promise<ImageData>
  getFontEmbedCSS(node: CaptureNode, options?: Options): Promise<string>
  /** Cancels outstanding work and disposes captures owned by this renderer. */
  dispose(): void
}
