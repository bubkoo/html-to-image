import { Options } from './types'
import { embedResources } from './embed-resources'
import { toArray, isInstanceOfElement } from './util'
import { isDataUrl, resourceToDataURL } from './dataurl'
import { getMimeType } from './mimes'

async function embedProp(
  propName: string,
  node: HTMLElement,
  options: Options,
) {
  const propValue = node.style?.getPropertyValue(propName)
  if (propValue) {
    const cssString = await embedResources(propValue, null, options)
    node.style.setProperty(
      propName,
      cssString,
      node.style.getPropertyPriority(propName),
    )
    return true
  }
  return false
}

async function embedBackground<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  ;(await embedProp('background', clonedNode, options)) ||
    (await embedProp('background-image', clonedNode, options))
  ;(await embedProp('mask', clonedNode, options)) ||
    (await embedProp('-webkit-mask', clonedNode, options)) ||
    (await embedProp('mask-image', clonedNode, options)) ||
    (await embedProp('-webkit-mask-image', clonedNode, options))
}

async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement)

  if (
    !(isImageElement && !isDataUrl(clonedNode.src)) &&
    !(
      isInstanceOfElement(clonedNode, SVGImageElement) &&
      !isDataUrl(clonedNode.href.baseVal)
    )
  ) {
    return
  }

  const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal

  const dataURL = await resourceToDataURL(url, getMimeType(url), options)
  await new Promise((resolve, reject) => {
    // Check for abort signal before starting image loading
    if (options.signal?.aborted) {
      reject(new Error('Operation aborted'))
      return
    }

    const onAbort = () => {
      reject(new Error('Operation aborted'))
    }

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort)
    }

    clonedNode.onload = () => {
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort)
      }
      resolve(undefined)
    }
    clonedNode.onerror = options.onImageErrorHandler
      ? (...attributes) => {
          if (options.signal) {
            options.signal.removeEventListener('abort', onAbort)
          }
          try {
            resolve(options.onImageErrorHandler!(...attributes))
          } catch (error) {
            reject(error)
          }
        }
      : (error) => {
          if (options.signal) {
            options.signal.removeEventListener('abort', onAbort)
          }
          reject(error)
        }

    const image = clonedNode as HTMLImageElement
    if (image.decode) {
      image.decode = resolve as any
    }

    if (image.loading === 'lazy') {
      image.loading = 'eager'
    }

    if (isImageElement) {
      clonedNode.srcset = ''
      clonedNode.src = dataURL
    } else {
      clonedNode.href.baseVal = dataURL
    }
  })
}

async function embedChildren<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  const children = toArray<HTMLElement>(clonedNode.childNodes)
  const deferreds = children.map((child) => embedImages(child, options))

  // Check for abort signal before Promise.all
  if (options.signal?.aborted) {
    throw new Error('Operation aborted')
  }

  await Promise.all(deferreds).then(() => clonedNode)
}

export async function embedImages<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  // Check for abort signal at the beginning
  if (options.signal?.aborted) {
    throw new Error('Operation aborted')
  }

  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(clonedNode, options)
    await embedImageNode(clonedNode, options)
    await embedChildren(clonedNode, options)
  }
}
