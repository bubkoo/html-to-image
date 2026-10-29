import type { Options, ResourceKind } from './types.js'
import { getTask } from './task.js'
import {
  blobToDataURL,
  ResourceLoader,
  ResourceResolverError,
} from './resource-loader.js'

export function isDataUrl(url: string) {
  return /^data:/i.test(url)
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
  if (!res.ok)
    throw new Error(`Resource request failed (${res.status}): ${url}`)
  return process({ res, result: await blobToDataURL(await res.blob()) })
}

export function getResourceLoader(options: Options) {
  return (
    getTask(options)?.resources ||
    new ResourceLoader(options, {
      signal: options.signal || new AbortController().signal,
    })
  )
}

export async function resourceToDataURL(
  resourceUrl: string,
  contentType: string | undefined,
  options: Options,
  kind: ResourceKind = 'image',
) {
  const loader = getResourceLoader(options)
  try {
    const blob = await loader.load(resourceUrl, kind, contentType)
    // Response MIME types are authoritative; extension guesses are a fallback.
    return await blobToDataURL(
      blob.type || !contentType ? blob : blob.slice(0, blob.size, contentType),
    )
  } catch (error) {
    const signal = getTask(options)?.context.signal || options.signal
    if (signal?.aborted) throw signal.reason
    if (error instanceof ResourceResolverError) throw error
    loader.warn(
      Object.freeze({
        code: 'resource-error',
        message: error instanceof Error ? error.message : String(error),
        resource: resourceUrl,
      }),
    )
    return options.imagePlaceholder || ''
  }
}
