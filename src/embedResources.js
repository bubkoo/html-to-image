import getBlobFromURL from './getBlobFromURL'
import {
  isDataUrl,
  toDataURL,
  getMimeType,
} from './utils'


const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g

function resolveUrl(url: String, baseUrl: String): String {
  if (url.match(/^[a-z]+:\/\//i)) { // url is absolute already
    return url
  } else if (url.match(/^\/\//)) {
    return window.location.protocol + url // url is absolute already, without protocol
  } else if (url.match(/^[a-z]+:/i)) { // dataURI, mailto:, tel:, etc.
    return url
  }

  const doc = document.implementation.createHTMLDocument()
  const base = doc.createElement('base')
  const a = doc.createElement('a')

  doc.head.appendChild(base)
  doc.body.appendChild(a)

  base.href = baseUrl
  a.href = url

  return a.href
}

function escape(url: String): String {
  return url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1') // eslint-disable-line
}

function urlToRegex(url: String): RegExp {
  return new RegExp(`(url\\(['"]?)(${escape(url)})(['"]?\\))`, 'g')
}

function parseURLs(str: String): Array<String> {
  const result = []

  str.replace(URL_REGEX, (raw, quotation, url) => {
    result.push(url)
    return raw
  })

  return result.filter(url => !isDataUrl(url))
}

function embed(
  cssString: String,
  resourceURL: String,
  baseURL: String,
  options: Object,
): Promise<String> {
  const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL

  return Promise.resolve(resolvedURL)
    .then(url => getBlobFromURL(url, options))
    .then(data => toDataURL(data, getMimeType(resourceURL)))
    .then(dataURL => cssString.replace(urlToRegex(resourceURL), `$1${dataURL}$3`))
    .then(content => content, () => resolvedURL)
}

export function shouldEmbed(string: String): Boolean {
  return string.search(URL_REGEX) !== -1
}

export default function embedResources(
  cssString: String,
  baseUrl: String,
  options: Object,
): Promise<String> {
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
