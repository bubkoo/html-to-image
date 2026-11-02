import { toPng, toSvg } from '../../src'
import { fetchAsDataURL, resourceToDataURL } from '../../src/dataurl'
import { bootstrap, getSvgDocument } from './helper'
import './setup'

// A 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function base64ToBytes(base64: string) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

// A server that sends Content-Type twice reaches fetch() with the values joined into
// one header, exactly as Headers.append() joins them here. Android WebView does this
// for responses served through shouldInterceptRequest in .NET MAUI BlazorWebView.
function duplicatedContentType(body: Blob, contentType: string) {
  const headers = new Headers()
  headers.append('Content-Type', contentType)
  headers.append('Content-Type', contentType)
  return new Response(body, { status: 200, headers })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

describe('responses with a duplicated Content-Type header', () => {
  let originalFetch: typeof window.fetch

  beforeEach(() => {
    originalFetch = window.fetch
  })

  afterEach(() => {
    window.fetch = originalFetch
  })

  function serveWithDuplicatedContentType(contentType: string) {
    window.fetch = async () =>
      duplicatedContentType(new Blob([base64ToBytes(PNG_BASE64)]), contentType)
  }

  it('reaches fetch() as one comma-joined value', async () => {
    serveWithDuplicatedContentType('image/png')

    const response = await window.fetch('https://example.test/joined.png')

    expect(response.headers.get('Content-Type')).toBe('image/png, image/png')
  })

  it('embeds a resource whose content type comes from its extension', async () => {
    serveWithDuplicatedContentType('image/png')

    const dataURL = await resourceToDataURL(
      'https://example.test/known-extension.png',
      'image/png',
      {},
    )

    expect(dataURL).toBe(`data:image/png;base64,${PNG_BASE64}`)
    await expectAsync(loadImage(dataURL)).toBeResolved()
  })

  it('embeds a resource whose content type comes from the response', async () => {
    serveWithDuplicatedContentType('image/png')

    const dataURL = await resourceToDataURL(
      'https://example.test/no-extension',
      undefined,
      {},
    )

    expect(dataURL).toBe(`data:image/png;base64,${PNG_BASE64}`)
    await expectAsync(loadImage(dataURL)).toBeResolved()
  })

  it('hands fetchAsDataURL callers a data URL with a single media type', async () => {
    serveWithDuplicatedContentType('image/png')

    const dataURL = await fetchAsDataURL(
      'https://example.test/font-or-image.png',
      undefined,
      ({ result }) => result,
    )

    expect(dataURL).toBe(`data:image/png;base64,${PNG_BASE64}`)
  })

  it('keeps a single Content-Type response unchanged', async () => {
    window.fetch = async () =>
      new Response(new Blob([base64ToBytes(PNG_BASE64)]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      })

    const dataURL = await fetchAsDataURL(
      'https://example.test/single-header.png',
      undefined,
      ({ result }) => result,
    )

    expect(dataURL).toBe(`data:image/png;base64,${PNG_BASE64}`)
  })

  it('captures a node whose images are served with it', async () => {
    const node = await bootstrap('images/node.html', 'images/style.css')
    // A query string the other specs never use keeps their cached data URLs
    // for these images out of this capture.
    node.querySelectorAll('img').forEach((img) => {
      img.setAttribute('src', `${img.getAttribute('src')}?duplicated`)
    })
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init)
      const contentType = response.headers.get('Content-Type') || ''
      return duplicatedContentType(await response.blob(), contentType)
    }
    const options = { includeQueryParams: true }

    const svg = await getSvgDocument(await toSvg(node, options))
    const png = await toPng(node, options)

    const sources = Array.from(svg.querySelectorAll('img')).map(
      (img) => img.getAttribute('src') || '',
    )
    expect(sources.length).toBe(2)
    expect(sources[0]).toMatch(/^data:image\/jpeg;base64,\/9j\//)
    expect(sources[1]).toMatch(/^data:image\/png;base64,iVBORw0KGgo/)
    expect(png).toMatch(/^data:image\/png;base64,/)
  })
})
