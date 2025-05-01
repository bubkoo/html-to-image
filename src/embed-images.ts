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

/**
 * Embeds an image from a URL into an HTML or SVG image element by converting it to a data URL
 *
 * @param clonedNode - The HTML or SVG image element to embed the image into
 * @param options - Configuration options for the embedding process
 * @returns A promise that resolves when the embedding is complete
 */
async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
): Promise<void> {
  // Check if node is an image element that needs embedding
  const isHTMLImage = isInstanceOfElement(clonedNode, HTMLImageElement)
  const isSVGImage = isInstanceOfElement(clonedNode, SVGImageElement)

  // Skip if not an image element or if already using a data URL
  if (isHTMLImage && isDataUrl(clonedNode.src)) {
    return
  }

  if (isSVGImage && isDataUrl(clonedNode.href.baseVal)) {
    return
  }

  if (!isHTMLImage && !isSVGImage) {
    return
  }

  // Get the URL from the appropriate attribute based on element type
  const url = isHTMLImage ? clonedNode.src : clonedNode.href.baseVal

  // Convert the resource to a data URL
  const mimeType = getMimeType(url)
  const dataURL = await resourceToDataURL(url, mimeType, options)

  // Handle different types of image elements
  if (isHTMLImage) {
    await updateHTMLImageElement(
      clonedNode as HTMLImageElement,
      dataURL,
      options,
    )
  } else if (isSVGImage) {
    await updateSVGImageElement(clonedNode as SVGImageElement, dataURL)
  }
}

/**
 * Updates an HTML image element with the data URL
 *
 * @param imgElement - The HTML image element to update
 * @param dataURL - The data URL to set
 * @param options - Configuration options
 * @returns A promise that resolves when the image is loaded
 */
async function updateHTMLImageElement(
  imgElement: HTMLImageElement,
  dataURL: string,
  options: Options,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Create error handler function
    const errorHandler = options.onImageErrorHandler
      ? (event: Event) => {
          try {
            const result = options.onImageErrorHandler!(event)
            resolve()
            return result
          } catch (error) {
            reject(error)
            return undefined
          }
        }
      : (event: Event) => {
          reject(event)
          return undefined
        }

    // Optimize loading strategy
    if (imgElement.loading === 'lazy') {
      imgElement.loading = 'eager'
    }

    imgElement.onerror = errorHandler
    imgElement.srcset = ''

    // Use decode method if available for better performance
    if (imgElement.decode) {
      imgElement.src = dataURL
      imgElement
        .decode()
        .then(() => resolve())
        .catch(errorHandler)
    } else {
      imgElement.onload = () => resolve()
      imgElement.src = dataURL
    }
  })
}

/**
 * Updates an SVG image element with the data URL
 *
 * @param svgImgElement - The SVG image element to update
 * @param dataURL - The data URL to set
 * @returns A promise that resolves when the image is loaded
 */
async function updateSVGImageElement(
  svgImgElement: SVGImageElement,
  dataURL: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    svgImgElement.onload = () => resolve()
    svgImgElement.onerror = (event) => reject(event)
    svgImgElement.href.baseVal = dataURL
  })
}

async function embedChildren<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  const children = toArray<HTMLElement>(clonedNode.childNodes)
  const deferrers = children.map((child) => embedImages(child, options))
  await Promise.all(deferrers).then(() => clonedNode)
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
