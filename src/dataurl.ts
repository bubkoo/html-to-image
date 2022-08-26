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

export async function fetchAsDataURL<T>(
  url: string,
  init: RequestInit | undefined,
  process: (data: { result: string; res: Response }) => T,
): Promise<T> {
  const res = await fetch(url, init)
  const blob = await res.blob()
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onloadend = () =>
      resolve(process({ res, result: reader.result as string }))
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

  let content: string
  try {
    content = await fetchAsDataURL(
      resourceUrl,
      options.fetchRequestInit,
      ({ res, result }) => {
        if (!contentType) {
          // eslint-disable-next-line no-param-reassign
          contentType = res.headers.get('Content-Type') || ''
        }
        return getContentFromDataUrl(result)
      },
    )
  } catch (error) {
    let placeholder = ''
    if (options.imagePlaceholder) {
      const parts = options.imagePlaceholder.split(/,/)
      if (parts && parts[1]) {
        placeholder = parts[1]
      }
    }

    let msg = `Failed to fetch resource: ${resourceUrl}`
    if (error) {
      msg = typeof error === 'string' ? error : error.message
    }

    if (msg) {
      console.error(msg)
    }

    content = placeholder
  }

  const dataurl = makeDataUrl(content, contentType || '')
  cache[cacheKey] = dataurl
  return dataurl
}
