export interface Options {
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
  /**
   * Set false to use all URL as cache key.
   * Default: false | undefined - which strips away the query parameters
   */
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
  /*
   * Use a <style> in svg to import all styles of current html page, and do not add computed styles to every node any more.
   * This will make the svg content very small, to resolve problems when html has large amount of sub nodes.
   * */
  usePageCss?: boolean,
  /*
   * Check whether the svg tail is integrated.
   * This will fix some problems that the last page of exported pdf is truncated.
   * */
  checkTail?: boolean
}
