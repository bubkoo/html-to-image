import { Options } from './options'
import { getBlobFromURL } from './getBlobFromURL'
import { getMimeType, isDataUrl, makeDataUrl, resolveUrl } from './util'

const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g
const URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g

export function toRegex(url: string): RegExp {
  // eslint-disable-next-line no-useless-escape
  const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1')
  return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, 'g')
}

export function parseURLs(cssText: string): string[] {
  const result: string[] = []

  cssText.replace(URL_REGEX, (raw, quotation, url) => {
    result.push(url)
    return raw
  })

  return result.filter((url) => !isDataUrl(url))
}

export function embed(
  cssText: string,
  resourceURL: string,
  baseURL: string | null,
  options: Options,
  get?: (url: string) => Promise<string>,
): Promise<string> {
  const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL

  return Promise.resolve(resolvedURL)
    .then<string | { blob: string; contentType: string }>((url) =>
      get ? get(url) : getBlobFromURL(url, options),
    )
    .then((data) => {
      if (typeof data === 'string') {
        return makeDataUrl(data, getMimeType(resourceURL))
      }

      return makeDataUrl(
        data.blob,
        getMimeType(resourceURL) || data.contentType,
      )
    })
    .then((dataURL) => cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`))
    .then(
      (content) => content,
      () => resolvedURL,
    )
}

function filterPreferredFontFormat(
  str: string,
  { preferredFontFormat }: Options,
): string {
  return !preferredFontFormat
    ? str
    : str.replace(FONT_SRC_REGEX, (match: string) => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || []

          if (!format) {
            return ''
          }

          if (format === preferredFontFormat) {
            return `src: ${src};`
          }
        }
      })
}

export function shouldEmbed(url: string): boolean {
  return url.search(URL_REGEX) !== -1
}

export async function embedResources(
  cssText: string,
  baseUrl: string | null,
  options: Options,
): Promise<string> {
  if (!shouldEmbed(cssText)) {
    return Promise.resolve(cssText)
  }

  const filteredCSSText = filterPreferredFontFormat(cssText, options)
  return Promise.resolve(filteredCSSText)
    .then(parseURLs)
    .then((urls) =>
      urls.reduce(
        (deferred, url) =>
          // eslint-disable-next-line promise/no-nesting
          deferred.then((css) => embed(css, url, baseUrl, options)),
        Promise.resolve(filteredCSSText),
      ),
    )
}
