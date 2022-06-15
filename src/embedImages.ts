import { Options } from './options'
import { getBlobFromURL } from './getBlobFromURL'
import { embedResources } from './embedResources'
import { getMimeType, isDataUrl, makeDataUrl, toArray } from './util'

async function embedBackground<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<T> {
  const background = clonedNode.style?.getPropertyValue('background')
  if (!background) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(background)
    .then((cssString) =>
      embedResources(cssString, null, options, document, window),
    )
    .then((cssString) => {
      clonedNode.style.setProperty(
        'background',
        cssString,
        clonedNode.style.getPropertyPriority('background'),
      )

      return clonedNode
    })
}

async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
  window: Window,
): Promise<T> {
  const node = clonedNode as any
  if (
    !(
      node instanceof (window as any).HTMLImageElement && !isDataUrl(node.src)
    ) &&
    !(
      node instanceof (window as any).SVGImageElement &&
      !isDataUrl(node.href.baseVal)
    )
  ) {
    return Promise.resolve(clonedNode)
  }

  const src =
    node instanceof (window as any).HTMLImageElement
      ? node.src
      : node.href.baseVal

  return Promise.resolve(src)
    .then((url) => getBlobFromURL(url, options, window))
    .then((data) =>
      makeDataUrl(data.blob, getMimeType(src) || data.contentType),
    )
    .then(
      (dataURL) =>
        new Promise((resolve, reject) => {
          node.onload = resolve
          node.onerror = reject
          if (node instanceof (window as any).HTMLImageElement) {
            node.srcset = ''
            node.src = dataURL
          } else {
            node.href.baseVal = dataURL
          }
        }),
    )
    .then(
      () => clonedNode,
      () => clonedNode,
    )
}

async function embedChildren<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<T> {
  const children = toArray<HTMLElement>(clonedNode.childNodes)
  // eslint-disable-next-line no-use-before-define
  const deferreds = children.map((child) =>
    embedImages(child, options, document, window),
  )
  return Promise.all(deferreds).then(() => clonedNode)
}

export async function embedImages<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<T> {
  if (!(clonedNode instanceof (window as any).Element)) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(clonedNode)
    .then((node) => embedBackground(node, options, document, window))
    .then((node) => embedImageNode(node, options, window))
    .then((node) => embedChildren(node, options, document, window))
}
