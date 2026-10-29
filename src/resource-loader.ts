import type {
  CaptureDiagnostic,
  ExtensionContext,
  Options,
  ResourceKind,
} from './types.js'

export class ResourceResolverError extends Error {
  constructor(readonly cause: unknown) {
    super('Custom resource resolver failed')
    this.name = 'ResourceResolverError'
    Object.setPrototypeOf(this, ResourceResolverError.prototype)
  }
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export class ResourceLoader {
  private pending = new Map<string, Promise<Blob>>()

  constructor(
    private readonly options: Options,
    private readonly context: ExtensionContext,
    readonly warn: (diagnostic: CaptureDiagnostic) => void = () => {},
  ) {}

  load(url: string, kind: ResourceKind, contentType?: string): Promise<Blob> {
    // Full URLs identify resources by default. The legacy option remains opt-in.
    const identity =
      this.options.includeQueryParams === false ? url.replace(/\?.*/, '') : url
    const key = JSON.stringify([identity, kind, contentType])
    const existing = this.pending.get(key)
    if (existing) return existing

    const request = this.fetch(url, kind, contentType)
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
          result = await resolve(request, this.context)
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
          return result
        }
      }
    }
    const requestURL = new URL(url, document.baseURI)
    requestURL.hash = ''
    if (this.options.cacheBust) {
      requestURL.searchParams.set('_htmlToImage', String(Date.now()))
    }
    const response = await fetch(requestURL.href, {
      ...this.options.fetchRequestInit,
      signal,
    })
    if (!response.ok) {
      throw new Error(`Resource request failed (${response.status}): ${url}`)
    }
    return response.blob()
  }

  clear() {
    this.pending.clear()
  }
}
