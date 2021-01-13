/* tslint:disable:max-line-length */

import { Options } from './index'
import { getDataURLContent } from './util'

// KNOWN ISSUE
// -----------
// Can not handle redirect-url, such as when access 'http://something.com/avatar.png'
// will redirect to 'http://something.com/65fc2ffcc8aea7ba65a1d1feda173540'

export type BlobWithType = { data: string; contentType?: string }

const TIMEOUT = 30000
const cache: {
  [url: string]: Promise<BlobWithType>
} = {}

function isFont(filename: string) {
  return /ttf|otf|eot|woff2?/i.test(filename)
}

export function getBlobFromURL(
  url: string,
  options: Options,
): Promise<BlobWithType> {
  let href = url.replace(/\?.*/, '')

  if (isFont(href)) {
    href = href.replace(/.*\//, '')
  }

  if (cache[href]) {
    return cache[href]
  }

  // cache bypass so we dont have CORS issues with cached images
  // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
  if (options.cacheBust) {
    // tslint:disable-next-line
    url += (/\?/.test(url) ? '&' : '?') + new Date().getTime()
  }

  const failed = (reason: any) => {
    let placeholder = ''
    if (options.imagePlaceholder) {
      const parts = options.imagePlaceholder.split(/,/)
      if (parts && parts[1]) {
        placeholder = parts[1]
      }
    }

    let msg = `Failed to fetch resource: ${url}`
    if (reason) {
      msg = typeof reason === 'string' ? reason : reason.message
    }

    if (msg) {
      console.error(msg)
    }

    return { data: placeholder }
  }

  const deferred: Promise<BlobWithType> = window.fetch
    ? window
        .fetch(url)
        .then((response) => response.blob())
        .then(
          (blob) =>
            new Promise<BlobWithType>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () =>
                resolve({
                  data: reader.result as string,
                  contentType: blob.type,
                })
              reader.onerror = reject
              reader.readAsDataURL(blob)
            }),
        )
        .then(({ data, contentType }) => ({
          contentType,
          data: getDataURLContent(data),
        }))
        .catch(() => new Promise((resolve, reject) => reject()))
    : new Promise<BlobWithType>((resolve, reject) => {
        const req = new XMLHttpRequest()

        const timeout = () => {
          reject(
            new Error(
              `Timeout of ${TIMEOUT}ms occured while fetching resource: ${url}`,
            ),
          )
        }

        const done = () => {
          if (req.readyState !== 4) {
            return
          }

          if (req.status !== 200) {
            reject(
              new Error(
                `Failed to fetch resource: ${url}, status: ${req.status}`,
              ),
            )
            return
          }

          const encoder = new FileReader()
          encoder.onloadend = () => {
            const contentType = req.getResponseHeader('content-type')
            resolve({
              ...{ data: getDataURLContent(encoder.result as string) },
              ...(contentType != null && { contentType }),
            })
          }
          encoder.readAsDataURL(req.response)
        }

        req.onreadystatechange = done
        req.ontimeout = timeout
        req.responseType = 'blob'
        req.timeout = TIMEOUT
        req.open('GET', url, true)
        req.send()
      })

  const promise = deferred.catch(failed)
  cache[href] = promise

  return promise
}
