import resourceToBlob from './resourceToBlob'
import {
  isDataUrl,
  toDataURL,
  getMimeType,
} from './utils'


const URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g

function resolveUrl(url, baseUrl) {
  const doc = document.implementation.createHTMLDocument()
  const base = doc.createElement('base')
  const a = doc.createElement('a')

  doc.head.appendChild(base)
  doc.body.appendChild(a)
  base.href = baseUrl
  a.href = url

  return a.href
}

function escape(url) {
  return url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1') // eslint-disable-line
}

function urlToRegex(url) {
  return new RegExp(`(url\\(['"]?)(${escape(url)})(['"]?\\))`, 'g') // TODO
}

function parseURLs(str) {
  const result = []

  str.replace(URL_REGEX, (raw, url) => {
    result.push(url)
    return raw
  })

  return result.filter(url => !isDataUrl(url))
}

function embed(cssString, resourceUrl, baseUrl, options) {
  return Promise.resolve(resourceUrl)
    .then(url => (baseUrl ? resolveUrl(url, baseUrl) : url))
    .then(url => resourceToBlob(url, options))
    .then(data => toDataURL(data, getMimeType(resourceUrl)))
    .then(dataURL => cssString.replace(urlToRegex(resourceUrl), `$1${dataURL}$3`))
}

export function shouldEmbed(string) {
  return string.search(URL_REGEX) !== -1
}

export default function embedResources(cssString, baseUrl, options) {
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
