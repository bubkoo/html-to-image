import { clonePseudoElements } from './clonePseudoElements'
import { getBlobFromURL } from './getBlobFromURL'
import { createImage, toArray, toDataURL, getMimeType } from './util'
import { Options } from './index'

async function cloneSingleNode(
  node: HTMLCanvasElement | SVGElement | HTMLElement,
  options: Options
): Promise<HTMLElement> {
  if (node instanceof HTMLCanvasElement) {
    const dataURL = node.toDataURL()
    if (dataURL === 'data:,') {
      return Promise.resolve(node.cloneNode(false) as HTMLElement)
    }

    return createImage(dataURL)
  }
  if (node instanceof HTMLVideoElement) {
    return Promise.resolve(node.poster)
      .then((url) => getBlobFromURL(url, options))
      .then((data) =>
        toDataURL(data!.blob, getMimeType(node.poster) || data!.contentType),
      )
      .then(dataURL => createImage(dataURL))
  }

  // if (node.tagName && node.tagName.toLowerCase() === 'svg') {
  //   return Promise.resolve(node as SVGElement)
  //     .then((svg) => svgToDataURL(svg))
  //     .then(createImage)
  // }

  return Promise.resolve(node.cloneNode(false) as HTMLElement)
}

async function cloneChildren(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
  options: Options,
): Promise<HTMLElement> {
  const children = toArray<HTMLElement>(
    (nativeNode.shadowRoot ?? nativeNode).childNodes,
  )
  if (children.length === 0) {
    return Promise.resolve(clonedNode)
  }

  return children
    .reduce(
      (done, child) =>
        done
          .then(() => cloneNode(child, options))
          .then((clonedChild: HTMLElement | null) => {
            if (clonedChild) {
              clonedNode.appendChild(clonedChild)
            }
          }),
      Promise.resolve(),
    )
    .then(() => clonedNode)
}

async function decorate(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
): Promise<HTMLElement> {
  if (!(clonedNode instanceof Element)) {
    return clonedNode
  }

  return Promise.resolve()
    .then(() => cloneCssStyle(nativeNode, clonedNode))
    .then(() => clonePseudoElements(nativeNode, clonedNode))
    .then(() => cloneInputValue(nativeNode, clonedNode))
    .then(() => clonedNode)
}

function cloneCssStyle(nativeNode: HTMLElement, clonedNode: HTMLElement) {
  const source = window.getComputedStyle(nativeNode)
  const target = clonedNode.style
  if (!target) return
  if (source.cssText) {
    target.cssText = source.cssText
  } else {
    toArray<string>(source).forEach((name) => {
      target.setProperty(
        name,
        source.getPropertyValue(name),
        source.getPropertyPriority(name),
      )
    })
  }
}

function cloneInputValue(nativeNode: HTMLElement, clonedNode: HTMLElement) {
  if (nativeNode instanceof HTMLTextAreaElement) {
    clonedNode.innerHTML = nativeNode.value
  }

  if (nativeNode instanceof HTMLInputElement) {
    clonedNode.setAttribute('value', nativeNode.value)
  }
}

export async function cloneNode(
  nativeNode: HTMLElement,
  options: Options,
  isRoot?: boolean,
): Promise<HTMLElement | null> {
  if (!isRoot && options.filter && !options.filter(nativeNode)) {
    return Promise.resolve(null)
  }

  return Promise.resolve(nativeNode)
    .then((clonedNode) => cloneSingleNode(clonedNode, options))
    .then((clonedNode) => cloneChildren(nativeNode, clonedNode, options))
    .then((clonedNode) => decorate(nativeNode, clonedNode))
}
