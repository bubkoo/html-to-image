import { Options } from './types'

function getContentFromDataUrl(dataURL: string) {
  return dataURL.split(/,/)[1]
}

export function isDataUrl(url: string) {
  return url.search(/^(data:)/) !== -1
}

export function makeDataUrl(content: string, mimeType: string) {
  return `data:${mimeType};base64,${content}`
}

// A response that sends Content-Type more than once reaches fetch() with the values
// joined into one header, e.g. "image/png, image/png", and the response blob carries
// the same string (.NET MAUI's BlazorWebView on Android does this for every static
// file it serves). Keep the first media type.
function getFirstMediaType(contentType: string) {
  return contentType.split(',')[0].trim()
}

const BASE64_MARKER = ';base64,'

function withSingleMediaType(dataURL: string) {
  const markerIndex = dataURL.indexOf(BASE64_MARKER)
  if (markerIndex === -1) {
    return dataURL
  }

  const mediaType = dataURL.slice('data:'.length, markerIndex)
  if (!mediaType.includes(',')) {
    return dataURL
  }

  return makeDataUrl(
    dataURL.slice(markerIndex + BASE64_MARKER.length),
    getFirstMediaType(mediaType),
  )
}

export async function fetchAsDataURL<T>(
  url: string,
  init: RequestInit | undefined,
  process: (data: { result: string; res: Response }) => T,
): Promise<T> {
  const res = await fetch(url, init)
  if (res.status === 404) {
    throw new Error(`Resource "${res.url}" not found`)
  }
  const blob = await res.blob()
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onloadend = () => {
      try {
        resolve(
          process({
            res,
            result: withSingleMediaType(reader.result as string),
          }),
        )
      } catch (error) {
        reject(error)
      }
    }

    reader.readAsDataURL(blob)
  })
}

const cache: { [url: string]: string } = {}

function getCacheKey(
  url: string,
  contentType: string | undefined,
  includeQueryParams: boolean | undefined,
) {
  let key = url.replace(/\?.*/, '')

  if (includeQueryParams) {
    key = url
  }

  // font resource
  if (/ttf|otf|eot|woff2?/i.test(key)) {
    key = key.replace(/.*\//, '')
  }

  return contentType ? `[${contentType}]${key}` : key
}

export async function resourceToDataURL(
  resourceUrl: string,
  contentType: string | undefined,
  options: Options,
) {
  const cacheKey = getCacheKey(
    resourceUrl,
    contentType,
    options.includeQueryParams,
  )

  if (cache[cacheKey] != null) {
    return cache[cacheKey]
  }

  // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
  if (options.cacheBust) {
    // eslint-disable-next-line no-param-reassign
    resourceUrl += (/\?/.test(resourceUrl) ? '&' : '?') + new Date().getTime()
  }

  let dataURL: string
  try {
    const content = await fetchAsDataURL(
      resourceUrl,
      options.fetchRequestInit,
      ({ res, result }) => {
        if (!contentType) {
          // eslint-disable-next-line no-param-reassign
          contentType = getFirstMediaType(res.headers.get('Content-Type') || '')
        }
        return getContentFromDataUrl(result)
      },
    )
    dataURL = makeDataUrl(content, contentType!)
  } catch (error) {
    dataURL = options.imagePlaceholder || ''

    let msg = `Failed to fetch resource: ${resourceUrl}`
    if (error) {
      msg = typeof error === 'string' ? error : error.message
    }

    if (msg) {
      console.warn(msg)
    }
  }

  cache[cacheKey] = dataURL
  return dataURL
}
