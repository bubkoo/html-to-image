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

async function cloneVideoElement(
  node: HTMLVideoElement,
  options: Options,
  window: Window,
) {
  return Promise.resolve(node.poster)
    .then((url) => getBlobFromURL(url, options, window))
    .then((data) =>
      makeDataUrl(data.blob, getMimeType(node.poster) || data.contentType),
    )
    .then((dataURL) => createImage(dataURL))
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
  window: Window,
): Promise<HTMLElement> {
  const ownerWindow = window as any
  if (node instanceof ownerWindow.HTMLCanvasElement) {
    return cloneCanvasElement(node as any)
  }

  if (node instanceof ownerWindow.HTMLVideoElement) {
    const nodeAsAny = node as any
    if (nodeAsAny.poster) {
      return cloneVideoElement(nodeAsAny, options, window)
    }
  }

  return Promise.resolve(node.cloneNode(false) as T)
}

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement =>
  node.tagName != null && node.tagName.toUpperCase() === 'SLOT'

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<T> {
  const children =
    isSlotElement(nativeNode) && nativeNode.assignedNodes
      ? toArray<T>(nativeNode.assignedNodes())
      : toArray<T>((nativeNode.shadowRoot ?? nativeNode).childNodes)

  if (
    children.length === 0 ||
    nativeNode instanceof (window as any).HTMLVideoElement
  ) {
    return Promise.resolve(clonedNode)
  }

  return children
    .reduce(
      (deferred, child) =>
        deferred
          // eslint-disable-next-line no-use-before-define
          .then(() => cloneNode(child, options, document, window))
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

function cloneCSSStyle<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  window: Window,
) {
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

function cloneInputValue<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  window: Window,
) {
  const ownerWindow = window as any
  if (nativeNode instanceof ownerWindow.HTMLTextAreaElement) {
    clonedNode.innerHTML = (nativeNode as unknown as HTMLTextAreaElement).value
  }

  if (nativeNode instanceof ownerWindow.HTMLInputElement) {
    clonedNode.innerHTML = (nativeNode as unknown as HTMLInputElement).value
  }
}

async function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  document: Document,
  window: Window,
): Promise<T> {
  if (!(clonedNode instanceof (window as any).Element)) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve()
    .then(() => cloneCSSStyle(nativeNode, clonedNode, window))
    .then(() => clonePseudoElements(nativeNode, clonedNode, document, window))
    .then(() => cloneInputValue(nativeNode, clonedNode, window))
    .then(() => clonedNode)
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  document: Document,
  nodeWindow: Window,
  isRoot?: boolean,
): Promise<T | null> {
  if (!isRoot && options.filter && !options.filter(node)) {
    return Promise.resolve(null)
  }

  return Promise.resolve(node)
    .then(
      (clonedNode) =>
        cloneSingleNode(clonedNode, options, nodeWindow) as Promise<T>,
    )
    .then((clonedNode) =>
      cloneChildren(node, clonedNode, options, document, nodeWindow),
    )
    .then((clonedNode) => decorate(node, clonedNode, document, nodeWindow))
}
