import { Options } from './types'
import { embedResources } from './embed-resources'
import {
  toArray,
  isHTMLImageElement,
  isSVGImageElement,
  isElement,
} from './util'
import { isDataUrl, resourceToDataURL } from './dataurl'
import { getMimeType } from './mimes'

async function embedBackground<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  const background = clonedNode.style?.getPropertyValue('background')
  if (background) {
    const cssString = await embedResources(background, null, options)
    clonedNode.style.setProperty(
      'background',
      cssString,
      clonedNode.style.getPropertyPriority('background'),
    )
  }
}

async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
) {
  if (
    !(isHTMLImageElement(clonedNode) && !isDataUrl(clonedNode.src)) &&
    !(isSVGImageElement(clonedNode) && !isDataUrl(clonedNode.href.baseVal))
  ) {
    return
  }

  const url = isHTMLImageElement(clonedNode)
    ? clonedNode.src
    : clonedNode.href.baseVal

  const dataURL = await resourceToDataURL(url, getMimeType(url), options)
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve
    clonedNode.onerror = reject

    const image = clonedNode as HTMLImageElement
    if (image.decode) {
      image.decode = resolve as any
    }

    if (isHTMLImageElement(clonedNode)) {
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
  await Promise.all(deferreds).then(() => clonedNode)
}

export async function embedImages<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  if (isElement(clonedNode)) {
    await embedBackground(clonedNode, options)
    await embedImageNode(clonedNode, options)
    await embedChildren(clonedNode, options)
  }
}
