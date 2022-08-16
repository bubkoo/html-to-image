import { Options } from './options'
import { getBlobFromURL } from './getBlobFromURL'
import { clonePseudoElements } from './clonePseudoElements'
import { createImage, getMimeType, makeDataUrl, toArray } from './util'

async function cloneCanvasElement(canvas: HTMLCanvasElement) {
  const dataURL = canvas.toDataURL()
  if (dataURL === 'data:,') {
    return canvas.cloneNode(false) as HTMLCanvasElement
  }

  return createImage(dataURL)
}

async function cloneVideoElement(video: HTMLVideoElement, options: Options) {
  const poster = video.poster
  const metadata = await getBlobFromURL(poster, options)
  const dataURL = makeDataUrl(
    metadata.blob,
    getMimeType(poster) || metadata.contentType,
  )
  return createImage(dataURL)
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

  return node.cloneNode(false) as T
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
    return clonedNode
  }

  return children
    .reduce(
      (deferred, child) =>
        deferred
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

function cloneCSSStyle<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  const sourceStyle = window.getComputedStyle(nativeNode)
  const targetStyle = clonedNode.style

  if (!targetStyle) {
    return
  }

  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText
    targetStyle.transformOrigin = sourceStyle.transformOrigin
  } else {
    toArray<string>(sourceStyle).forEach((name) => {
      let value = sourceStyle.getPropertyValue(name)
      if (name === 'font-size' && value.endsWith('px')) {
        const reducedFont =
          Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1
        value = `${reducedFont}px`
      }
      targetStyle.setProperty(
        name,
        value,
        sourceStyle.getPropertyPriority(name),
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

function cloneSelectValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (nativeNode instanceof HTMLSelectElement) {
    const clonedSelect = clonedNode as any as HTMLSelectElement
    const selectedOption = Array.from(clonedSelect.children).find(
      (child) => nativeNode.value === child.getAttribute('value'),
    )

    if (selectedOption) {
      selectedOption.setAttribute('selected', '')
    }
  }
}

function decorate<T extends HTMLElement>(nativeNode: T, clonedNode: T): T {
  if (!(clonedNode instanceof Element)) {
    return clonedNode
  }

  cloneCSSStyle(nativeNode, clonedNode)
  clonePseudoElements(nativeNode, clonedNode)
  cloneInputValue(nativeNode, clonedNode)
  cloneSelectValue(nativeNode, clonedNode)

  return clonedNode
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
): Promise<T | null> {
  if (!isRoot && options.filter && !options.filter(node)) {
    return null
  }

  return Promise.resolve(node)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(node, clonedNode, options))
    .then((clonedNode) => decorate(node, clonedNode))
}
