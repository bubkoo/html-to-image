import { Options } from './types'
import { embedResources } from './embed-resources'
import { toArray, isInstanceOfElement, decodeImage } from './util'
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
    // There is nothing to inline for a data url, but the clone still has to
    // finish loading it. The images end up as subresources of the svg we build,
    // which the browser loads asynchronously and rasterises without the ones
    // that are not ready yet.
    if (isImageElement) {
      await decodeImage(clonedNode)
    }
    return
  }

  const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal

  const dataURL = await resourceToDataURL(url, getMimeType(url), options)
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve
    clonedNode.onerror = options.onImageErrorHandler
      ? (...attributes) => {
          try {
            resolve(options.onImageErrorHandler!(...attributes))
          } catch (error) {
            reject(error)
          }
        }
      : reject

    const image = clonedNode as HTMLImageElement
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

  // The load event tells us the data is there, not that it can be painted.
  if (isImageElement) {
    await decodeImage(clonedNode)
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
