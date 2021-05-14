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
  if (!(clonedNode instanceof HTMLImageElement) || isDataUrl(clonedNode.src)) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(clonedNode.src)
    .then((url) => getBlobFromURL(url, options))
    .then((data) =>
      toDataURL(data!.blob, getMimeType(clonedNode.src) || data!.contentType),
    )
    .then(
      (dataURL) =>
        new Promise((resolve, reject) => {
          clonedNode.onload = resolve
          clonedNode.onerror = reject
          clonedNode.src = dataURL
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
