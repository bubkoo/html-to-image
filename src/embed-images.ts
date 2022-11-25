import { Options } from './types'
import { embedResources } from './embed-resources'
import { toArray } from './util'
import { isDataUrl, resourceToDataURL } from './dataurl'
import { getMimeType } from './mimes'

async function embedProp(
  propName: string,
  node: HTMLElement,
  options: Options,
) {
  const propValue = node.style?.getPropertyValue(propName)
  if (propValue) {
    // TODO we should try to use svg def to avoid putting the same string multiple times
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
  if (!(await embedProp('background', clonedNode, options))) {
    await embedProp('background-image', clonedNode, options)
  }
  if (!(await embedProp('mask', clonedNode, options))) {
    await embedProp('mask-image', clonedNode, options)
  }
}

async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
) {
  if (
    !(clonedNode instanceof HTMLImageElement && !isDataUrl(clonedNode.src)) &&
    !(
      clonedNode instanceof SVGImageElement &&
      !isDataUrl(clonedNode.href.baseVal)
    )
  ) {
    return
  }

  const url =
    clonedNode instanceof HTMLImageElement
      ? clonedNode.src
      : clonedNode.href.baseVal

  const dataURL = await resourceToDataURL(url, getMimeType(url), options)
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve
    clonedNode.onerror = reject
    if (clonedNode instanceof HTMLImageElement) {
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
  // TODO choose between the loop and the Promise.all, the first one leverage the cache correctly, the second one does not but makes requests faster (I think?)
  for (const child of children) {
    await embedImages(child, options)
  }
  //const deferreds = children.map((child) => embedImages(child, options))
  //await Promise.all(deferreds).then(() => clonedNode)
}

export async function embedImages<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  if (clonedNode instanceof Element) {
    await embedBackground(clonedNode, options)
    await embedImageNode(clonedNode, options)
    await embedChildren(clonedNode, options)
  }
}
