import { Options } from './types'
import { embedResources } from './embed-resources'
import { toArray, isInstanceOfElement } from './util'
import { isDataUrl, imageToDataUrl } from './dataurl'
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

  const dataURL = await imageToDataUrl(url, getMimeType(url), options)
  let imageErrorHandled = false
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve
    clonedNode.onerror = (...args: Parameters<OnErrorEventHandlerNonNull>) => {
      if (!options.onImageErrorHandler) {
        const imageLoadError = new Error('image load failed') as Error & {
          cause: unknown
        }
        imageLoadError.cause = args
        reject(imageLoadError)
        return
      }

      try {
        imageErrorHandled = true
        resolve(options.onImageErrorHandler(...args))
      } catch (error) {
        reject(error)
      }
    }

    const image = clonedNode as HTMLImageElement
    if (image.loading === 'lazy') {
      image.loading = 'eager'
    }
    image.decoding = 'sync'

    if (isImageElement) {
      clonedNode.srcset = ''
      clonedNode.src = dataURL
    } else {
      clonedNode.href.baseVal = dataURL
    }
  })

  if (!imageErrorHandled) {
    await (clonedNode as HTMLImageElement).decode()
  }
}

async function embedChildren<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  const children = toArray<HTMLElement>(clonedNode.childNodes)
  const deferreds = children.map((child) => embedImages(child, options))
  await Promise.all(deferreds).then(() => clonedNode)
}

export async function embedImages<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(clonedNode, options)
    await embedImageNode(clonedNode, options)
    await embedChildren(clonedNode, options)
  }
}
