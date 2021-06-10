import { Options } from './index'
import { getBlobFromURL } from './getBlobFromURL'
import { embedResources } from './embedResources'
import { toArray, isDataUrl, toDataURL, getMimeType } from './util'

export async function embedImages(
  clonedNode: HTMLElement,
  options: Object,
): Promise<HTMLElement> {
  if (!(clonedNode instanceof Element)) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(clonedNode)
    .then((node) => embedBackground(node, options))
    .then((node) => embedImageNode(node, options))
    .then((node) => embedChildren(node, options))
}

async function embedBackground(
  clonedNode: HTMLElement,
  options: Options,
): Promise<HTMLElement> {
  const background = clonedNode.style?.getPropertyValue('background')
  if (!background) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(background)
    .then((cssString) => embedResources(cssString, null, options))
    .then((cssString) => {
      clonedNode.style.setProperty(
        'background',
        cssString,
        clonedNode.style.getPropertyPriority('background'),
      )

      return clonedNode
    })
}

function embedImageNode(
  clonedNode: HTMLElement,
  options: Options,
): Promise<HTMLElement> {
  const isImageInstance =
    clonedNode instanceof HTMLImageElement ||
    clonedNode instanceof SVGImageElement

  if (!isImageInstance) return Promise.resolve(clonedNode)

  let imageUrlAttribute: 'src' | 'href' | 'xlink:href' = 'src'

  const elementImageUrl = (() => {
    switch (true) {
      case !!clonedNode.getAttribute('src'): {
        imageUrlAttribute = 'src'

        return clonedNode.getAttribute('src')
      }

      case !!clonedNode.getAttribute('xlink:href'): {
        imageUrlAttribute = 'xlink:href'

        return clonedNode.getAttribute('xlink:href')
      }

      case !!clonedNode.getAttribute('href'): {
        imageUrlAttribute = 'href'

        return clonedNode.getAttribute('href')
      }

      default:
        return undefined
    }
  })()

  if (!elementImageUrl) {
    return Promise.reject(new Error('Provide a valid image url to element'))
  }

  if (isDataUrl(elementImageUrl)) return Promise.resolve(clonedNode)

  return Promise.resolve(elementImageUrl)
    .then((url) => getBlobFromURL(url, options))
    .then((data) =>
      toDataURL(data!.blob, getMimeType(elementImageUrl) || data!.contentType),
    )
    .then(
      (dataURL) =>
        new Promise((resolve, reject) => {
          clonedNode.onload = resolve
          clonedNode.onerror = reject
          clonedNode.setAttribute(imageUrlAttribute, dataURL)
        }),
    )
    .then(
      () => clonedNode,
      () => clonedNode,
    )
}

async function embedChildren(
  clonedNode: HTMLElement,
  options: Object,
): Promise<HTMLElement> {
  const children = toArray<HTMLElement>(clonedNode.childNodes)
  const deferreds = children.map((child) => embedImages(child, options))

  return Promise.all(deferreds).then(() => clonedNode)
}
