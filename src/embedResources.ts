import getBlobFromURL from './getBlobFromURL'
import { isDataUrl, toDataURL, getMimeType } from './utils'
import { OptionsType } from './index'

const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g

function resolveUrl(url: string, baseUrl: string | null): string {
  // url is absolute already
  if (url.match(/^[a-z]+:\/\//i)) {
    return url
  }

  // url is absolute already, without protocol
  if (url.match(/^\/\//)) {
    return window.location.protocol + url
  }

  // dataURI, mailto:, tel:, etc.
  if (url.match(/^[a-z]+:/i)) {
    return url
  }

  const doc = document.implementation.createHTMLDocument()
  const base = doc.createElement('base')
  const a = doc.createElement('a')

  doc.head!.appendChild(base)
  doc.body.appendChild(a)

  if (baseUrl) {
    base.href = baseUrl
  }

  a.href = url

  return a.href
}

function escape(url: string): string {
  return url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1')
}

function urlToRegex(url: string): RegExp {
  return new RegExp(`(url\\(['"]?)(${escape(url)})(['"]?\\))`, 'g')
}

function parseURLs(str: string): string[] {
  const result: string[] = []

  str.replace(URL_REGEX, (raw, quotation, url) => {
    result.push(url)
    return raw
  })

  return result.filter(url => !isDataUrl(url))
}

function embed(
  cssString: string,
  resourceURL: string,
  baseURL: string | null,
  options: OptionsType,
): Promise<string> {
  const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL

  return Promise.resolve(resolvedURL)
    .then(url => getBlobFromURL(url, options))
    .then(data => toDataURL(data!, getMimeType(resourceURL)))
    .then(dataURL => cssString.replace(urlToRegex(resourceURL), `$1${dataURL}$3`))
    .then(content => content, () => resolvedURL)
}

export function shouldEmbed(string: string): boolean {
  return string.search(URL_REGEX) !== -1
}

export default function embedResources(
  cssString: string,
  baseUrl: string | null,
  options: Object,
): Promise<string> {
  if (!shouldEmbed(cssString)) {
    return Promise.resolve(cssString)
  }

  return Promise.resolve(cssString)
    .then(parseURLs)
    .then(urls => urls.reduce(
      (done, url) => done.then(ret => embed(ret, url, baseUrl, options)),
      Promise.resolve(cssString),
    ))
}
