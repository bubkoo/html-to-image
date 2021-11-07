import { Options } from './options'
import { getBlobFromURL } from './getBlobFromURL'
import { clonePseudoElements } from './clonePseudoElements'
import { createImage, getMimeType, makeDataUrl, toArray } from './util'

async function cloneCanvasElement(node: HTMLCanvasElement) {
  const dataURL = node.toDataURL()
  if (dataURL === 'data:,') {
    return Promise.resolve(node.cloneNode(false) as HTMLCanvasElement)
  }

  return createImage(dataURL)
}

async function cloneVideoElement(node: HTMLVideoElement, options: Options) {
  return Promise.resolve(node.poster)
    .then((url) => getBlobFromURL(url, options))
    .then((data) =>
      makeDataUrl(data.blob, getMimeType(node.poster) || data.contentType),
    )
    .then((dataURL) => createImage(dataURL))
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<HTMLElement> {
  if (node instanceof HTMLCanvasElement) {
    return cloneCanvasElement(node)
  }

  if (node instanceof HTMLVideoElement && node.poster) {
    return cloneVideoElement(node, options)
  }

  return Promise.resolve(node.cloneNode(false) as T)
}

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement =>
  node.tagName != null && node.tagName.toUpperCase() === 'SLOT'

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
): Promise<T> {
  const children =
    isSlotElement(nativeNode) && nativeNode.assignedNodes
      ? toArray<T>(nativeNode.assignedNodes())
      : toArray<T>((nativeNode.shadowRoot ?? nativeNode).childNodes)

  if (children.length === 0 || nativeNode instanceof HTMLVideoElement) {
    return Promise.resolve(clonedNode)
  }

  return children
    .reduce(
      (deferred, child) =>
        deferred
          // eslint-disable-next-line no-use-before-define
          .then(() => cloneNode(child, options))
          .then((clonedChild: HTMLElement | null) => {
            // eslint-disable-next-line promise/always-return
            if (clonedChild) {
              clonedNode.appendChild(clonedChild)
            }
          }),
      Promise.resolve(),
    )
    .then(() => clonedNode)
}

function cloneCSSStyle<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  const source = window.getComputedStyle(nativeNode)
  const target = clonedNode.style

  if (!target) {
    return
  }

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

function cloneInputValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (nativeNode instanceof HTMLTextAreaElement) {
    clonedNode.innerHTML = nativeNode.value
  }

  if (nativeNode instanceof HTMLInputElement) {
    clonedNode.setAttribute('value', nativeNode.value)
  }
}

function cloneScrollPosition<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
) {
  // If element is not scrolled, we don't need to move the children.
  if (nativeNode.scrollTop === 0 && nativeNode.scrollLeft === 0) {
    return
  }

  for (let i = 0; i < clonedNode.children.length; i += 1) {
    const child = clonedNode.children[i]
    if (!('style' in child)) {
      return
    }

    const element = child as HTMLElement

    // For each of the children, get the current transform and translate it with
    // the native node's scroll position.
    const { transform } = element.style
    const matrix = new DOMMatrix(transform)

    const { a, b, c, d } = matrix
    // reset rotation/skew so it wont change the translate direction.
    matrix.a = 1
    matrix.b = 0
    matrix.c = 0
    matrix.d = 1
    matrix.translateSelf(-nativeNode.scrollLeft, -nativeNode.scrollTop)
    // restore rotation and skew
    matrix.a = a
    matrix.b = b
    matrix.c = c
    matrix.d = d
    element.style.transform = matrix.toString()
  }
}

async function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
): Promise<T> {
  if (!(clonedNode instanceof Element)) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve()
    .then(() => cloneCSSStyle(nativeNode, clonedNode))
    .then(() => clonePseudoElements(nativeNode, clonedNode))
    .then(() => cloneInputValue(nativeNode, clonedNode))
    .then(() => cloneScrollPosition(nativeNode, clonedNode))
    .then(() => clonedNode)
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
): Promise<T | null> {
  if (!isRoot && options.filter && !options.filter(node)) {
    return Promise.resolve(null)
  }

  return Promise.resolve(node)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(node, clonedNode, options))
    .then((clonedNode) => decorate(node, clonedNode))
}
