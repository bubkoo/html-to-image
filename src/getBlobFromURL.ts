/* tslint:disable:max-line-length */

import { getDataURLContent } from './utils'
import { OptionsType } from './index'

// KNOWN ISSUE
// -----------
// Can not handle redirect-url, such as when access 'http://something.com/avatar.png'
// will redirect to 'http://something.com/65fc2ffcc8aea7ba65a1d1feda173540'

const TIMEOUT = 30000

export default function getBlobFromURL(
  url: string,
  options: OptionsType,
): Promise<string | null> {

  let corsUrl: string = url

  // decide cors everywhere proxy usage
  if (options.useCorsEverywhereProxy) {
    let proxyUrl = 'https://cors-anywhere.herokuapp.com'

    if (options.customCorsEverywhereProxyLink) {
      const isLastCharSlash = options.customCorsEverywhereProxyLink.substr(-1) === '/'
      proxyUrl = isLastCharSlash ? options.customCorsEverywhereProxyLink.substr(0, options.customCorsEverywhereProxyLink.length - 1) : options.customCorsEverywhereProxyLink
    }

    corsUrl = `${ proxyUrl }/${ url }`
  }

  // cache bypass so we dont have CORS issues with cached images
  // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
  if (options.cacheBust) {
    corsUrl += ((/\?/).test(corsUrl) ? '&' : '?') + (new Date()).getTime() // tslint:disable-line
  }

  const failed = (reason: any) => {
    let placeholder = ''
    if (options.imagePlaceholder) {
      const split = options.imagePlaceholder.split(/,/)
      if (split && split[1]) {
        placeholder = split[1]
      }
    }

    let msg = `Failed to fetch resource: ${ corsUrl }`

    if (reason) {
      msg = typeof reason === 'string' ? reason : reason.message
    }

    if (msg) {
      console.error(msg)
    }

    return placeholder
  }

  const deferred = window.fetch
    // fetch
    ? window.fetch(corsUrl)
      .then(response => response.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }))
      .then(getDataURLContent)
      .catch(() => new Promise((resolve, reject) => {
        reject()
      }))

    // xhr
    : new Promise<string | null>(((resolve, reject) => {
      const req = new XMLHttpRequest()

      const timeout = () => {
        reject(new Error(`Timeout of ${TIMEOUT}ms occured while fetching resource: ${ corsUrl }`))
      }

      const done = () => {
        if (req.readyState !== 4) {
          return
        }

        if (req.status !== 200) {
          reject(new Error(`Failed to fetch resource: ${ corsUrl }, status: ${req.status}`))
          return
        }

        const encoder = new FileReader()
        encoder.onloadend = () => {
          resolve(getDataURLContent(encoder.result as string))
        }
        encoder.readAsDataURL(req.response)
      }

      req.onreadystatechange = done
      req.ontimeout = timeout
      req.responseType = 'blob'
      req.timeout = TIMEOUT
      req.open('GET', corsUrl, true)
      req.send()
    }))

  return deferred.catch(failed)
}
