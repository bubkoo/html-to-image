import { Options } from './types.js'
import { embedResources } from './embed-resources.js'
import { toArray, isInstanceOfElement, createImage } from './util.js'
import { getTask } from './task.js'
import { isDataUrl, resourceToDataURL } from './dataurl.js'
import { getMimeType } from './mimes.js'

async function embedProp(
  propName: string,
  node: HTMLElement,
  options: Options,
) {
  const propValue = node.style?.getPropertyValue(propName)
  if (propValue) {
    const cssString = await embedResources(propValue, node.baseURI, options)
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
  const isSVGImage = isInstanceOfElement(clonedNode, SVGImageElement)
  if (!isImageElement && !isSVGImage) return
  const url = isImageElement
    ? clonedNode.src
    : (clonedNode as SVGImageElement).href.baseVal
  const dataURL = isDataUrl(url)
    ? url
    : await resourceToDataURL(url, getMimeType(url), options)
  if (isImageElement) {
    const image = clonedNode as HTMLImageElement
    image.loading = 'eager'
    image.srcset = ''
  }
  try {
    await createImage(
      dataURL,
      options,
      isImageElement ? (clonedNode as HTMLImageElement) : undefined,
    )
  } catch (error) {
    getTask(options)?.check()
    if (options.onImageErrorHandler) {
      options.onImageErrorHandler.call(clonedNode, new Event('error'))
      return
    }
    throw error
  }
  if (!isImageElement) {
    ;(clonedNode as SVGImageElement).href.baseVal = dataURL
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
