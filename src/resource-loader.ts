import { readDocumentProperty } from './document.js'
import type {
  CaptureDiagnostic,
  ExtensionContext,
  Options,
  ResourceKind,
  ResourceRequest,
  ResourceResolver,
} from './types.js'

async function resolveWithAbort(
  resolver: ResourceResolver,
  request: ResourceRequest,
  context: ExtensionContext,
): Promise<Blob | undefined> {
  const { signal } = context
  let abort!: () => void
  const cancelled = new Promise<never>((resolve, reject) => {
    abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
  })
  const pending = Promise.resolve().then(() => {
    if (signal.aborted) throw signal.reason
    return resolver(request, context)
  })
  try {
    return await Promise.race([pending, cancelled])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

export class ResourceResolverError extends Error {
  constructor(readonly cause: unknown) {
    super('Custom resource resolver failed')
    this.name = 'ResourceResolverError'
    Object.setPrototypeOf(this, ResourceResolverError.prototype)
  }
}

function firstMediaType(type: string): string {
  let quoted = false
  let escaped = false
  for (let i = 0; i < type.length; i += 1) {
    const char = type[i]
    if (escaped) escaped = false
    else if (quoted && char === '\\') escaped = true
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) return type.slice(0, i).trim()
  }
  return type
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // FileReader copies Blob.type into the data URL. A repeated Content-Type
    // header may arrive as "image/png, image/png", which is not a data URL MIME.
    const mediaType = firstMediaType(blob.type)
    const readable =
      mediaType === blob.type ? blob : blob.slice(0, blob.size, mediaType)
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(readable)
  })
}

export class ResourceLoader {
  private pending = new Map<string, Promise<Blob>>()
  private responseURLs = new Map<string, string>()
  private customResponses = new Set<string>()

  constructor(
    private readonly options: Options,
    private readonly context: ExtensionContext,
    readonly warn: (diagnostic: CaptureDiagnostic) => void = () => {},
  ) {}

  private key(url: string, kind: ResourceKind, contentType?: string) {
    // Full URLs identify resources by default. The legacy option remains opt-in.
    const identity =
      this.options.includeQueryParams === false ? url.replace(/\?.*/, '') : url
    return JSON.stringify([identity, kind, contentType])
  }

  responseURL(url: string, kind: ResourceKind, contentType?: string) {
    return this.responseURLs.get(this.key(url, kind, contentType)) || url
  }

  isCustomResponse(url: string, kind: ResourceKind, contentType?: string) {
    return this.customResponses.has(this.key(url, kind, contentType))
  }

  load(url: string, kind: ResourceKind, contentType?: string): Promise<Blob> {
    const key = this.key(url, kind, contentType)
    const existing = this.pending.get(key)
    if (existing) return existing

    const request = this.fetch(url, kind, contentType).then((result) => {
      if (this.pending.get(key) === request) {
        this.responseURLs.set(key, result.url)
        if (result.custom) this.customResponses.add(key)
      }
      return result.blob
    })
    this.pending.set(key, request)
    request.catch(() => {
      if (this.pending.get(key) === request) this.pending.delete(key)
    })
    return request
  }

  private async fetch(url: string, kind: ResourceKind, contentType?: string) {
    const { signal } = this.context
    if (signal.aborted) throw signal.reason
    const request = Object.freeze({ url, kind, contentType })
    const resolvers = [
      this.options.resources?.resolve,
      ...(this.options.plugins || []).map((plugin) => plugin.resolveResource),
    ]
    for (let i = 0; i < resolvers.length; i += 1) {
      const resolve = resolvers[i]
      if (resolve) {
        let result: Blob | undefined
        try {
          // eslint-disable-next-line no-await-in-loop
          result = await resolveWithAbort(resolve, request, this.context)
        } catch (error) {
          if (signal.aborted) throw signal.reason
          throw new ResourceResolverError(error)
        }
        if (signal.aborted) throw signal.reason
        if (result !== undefined) {
          if (result == null || typeof result.arrayBuffer !== 'function') {
            throw new ResourceResolverError(
              new TypeError(
                'Resource resolvers must return a Blob or undefined',
              ),
            )
          }
          return { blob: result, url, custom: true }
        }
      }
    }
    const requestURL = new URL(url, readDocumentProperty(document, 'baseURI'))
    requestURL.hash = ''
    const originalURL = requestURL.href
    const originalNonce = requestURL.searchParams.getAll('_htmlToImage')
    let nonce: string | undefined
    if (this.options.cacheBust) {
      nonce = String(Date.now())
      requestURL.searchParams.set('_htmlToImage', nonce)
    }
    const response = await fetch(requestURL.href, {
      ...this.options.fetchRequestInit,
      signal,
    })
    if (!response.ok) {
      throw new Error(`Resource request failed (${response.status}): ${url}`)
    }
    const finalURL = new URL(response.url || requestURL.href)
    if (nonce && finalURL.searchParams.get('_htmlToImage') === nonce) {
      finalURL.searchParams.delete('_htmlToImage')
      originalNonce.forEach((value) =>
        finalURL.searchParams.append('_htmlToImage', value),
      )
    }
    let blob = await response.blob()
    // Some engines omit charset parameters from Response.blob().type. CSS
    // decoding still needs the network response's declared encoding.
    if (kind === 'stylesheet') {
      const type = firstMediaType(response.headers.get('Content-Type') || '')
      if (/;\s*charset\s*=/i.test(type) && type !== blob.type)
        blob = blob.slice(0, blob.size, type)
    }
    return {
      blob,
      // A transport cache-buster is not part of the SVG document identity.
      url: response.url === requestURL.href ? originalURL : finalURL.href,
      custom: false,
    }
  }

  clear() {
    this.pending.clear()
    this.responseURLs.clear()
    this.customResponses.clear()
  }
}
