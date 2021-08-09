import { Options } from './options'
import { getBlobFromURL } from './getBlobFromURL'
import { clonePseudoElements } from './clonePseudoElements'
import { createImage, toArray, toDataURL, getMimeType } from './util'

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<HTMLElement> {
  if (node instanceof HTMLCanvasElement) {
    const dataURL = node.toDataURL()
    if (dataURL === 'data:,') {
      return Promise.resolve(node.cloneNode(false) as HTMLCanvasElement)
    }

    return createImage(dataURL)
  }

  if (node instanceof HTMLVideoElement && node.poster) {
    return Promise.resolve(node.poster)
      .then((url) => getBlobFromURL(url, options))
      .then((data) =>
        toDataURL(data!.blob, getMimeType(node.poster) || data!.contentType),
      )
      .then((dataURL) => createImage(dataURL))
  }

  return Promise.resolve(node.cloneNode(false) as T)
}

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
): Promise<T> {
  const children =
    isSlotElement(nativeNode) && nativeNode.assignedNodes
      ? toArray<T>(nativeNode.assignedNodes())
      : toArray<T>((nativeNode.shadowRoot ?? nativeNode).childNodes)

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

async function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
): Promise<T> {
  if (!(clonedNode instanceof Element)) {
    return clonedNode
  }

  return Promise.resolve()
    .then(() => cloneCssStyle(nativeNode, clonedNode))
    .then(() => clonePseudoElements(nativeNode, clonedNode))
    .then(() => cloneInputValue(nativeNode, clonedNode))
    .then(() => clonedNode)
}

function cloneCssStyle<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
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

export async function cloneNode<T extends HTMLElement>(
  nativeNode: T,
  options: Options,
  isRoot?: boolean,
): Promise<T | null> {
  if (!isRoot && options.filter && !options.filter(nativeNode)) {
    return Promise.resolve(null)
  }

  return Promise.resolve(nativeNode)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(nativeNode, clonedNode, options))
    .then((clonedNode) => decorate(nativeNode, clonedNode))
}

const isSlotElement = (node: Element): node is HTMLSlotElement =>
  node.tagName === 'SLOT'
