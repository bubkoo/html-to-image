import type { Options } from './types'

export async function fetchResource(
  url: string,
  forcedContentType: string | undefined,
  options: Options,
) {
  let requestUrl = url
  if (options.cacheBust) {
    requestUrl += `${/\?/.test(requestUrl) ? '&' : '?'}${Date.now()}`
  }
  const cacheUrl =
    options.includeQueryParams === false
      ? requestUrl.replace(/\?.*/, '')
      : requestUrl
  const cacheKey = cacheUrl + forcedContentType

  if (!options.cacheBust && options.cache?.has(cacheKey)) {
    return options.cache.get(cacheKey)!
  }

  const res = await fetch(requestUrl, options.fetchRequestInit)

  if (!res.ok) {
    throw new Error(
      `cannot fetch(${res.status} ${res.statusText}): "${res.url}"`,
    )
  }

  const response = await res.arrayBuffer()
  const contentType = forcedContentType || res.headers.get('Content-Type') || ''

  return {
    contentType,
    asString: (encoding = 'utf-8') => {
      const result = new TextDecoder(encoding).decode(response)
      if (!options.cacheBust) {
        options.cache?.add(cacheKey, {
          asDataUrl() {
            throw new Error(
              'first hit read as string, cannot read as dataUrl now',
            )
          },
          asString() {
            return result
          },
          contentType,
        })
      }
      return result
    },
    asDataUrl: () => {
      const blob = new Blob([response], { type: contentType })

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onerror = () => reject(reader.error)
        reader.onloadend = () => {
          if (!options.cacheBust) {
            options.cache?.add(cacheKey, {
              asDataUrl() {
                return reader.result as string
              },
              asString() {
                throw new Error(
                  'first hit read as dataurl, cannot read as string now',
                )
              },
              contentType,
            })
          }
          resolve(reader.result as string)
        }

        reader.readAsDataURL(blob)
      })
    },
  }
}
