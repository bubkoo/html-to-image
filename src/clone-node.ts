import type { Options } from './types.js'
import { clonePseudoElements } from './clone-pseudos.js'
import {
  createImage,
  toArray,
  isInstanceOfElement,
  getStyleProperties,
} from './util.js'
import { getMimeType } from './mimes.js'
import { resourceToDataURL } from './dataurl.js'
import { getTask } from './task.js'

async function cloneCanvasElement(canvas: HTMLCanvasElement, options: Options) {
  const dataURL = canvas.toDataURL()
  if (dataURL === 'data:,') {
    return canvas.cloneNode(false) as HTMLCanvasElement
  }
  return createImage(dataURL, options)
}

async function cloneVideoElement(video: HTMLVideoElement, options: Options) {
  if (video.currentSrc) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataURL = canvas.toDataURL()
    return createImage(dataURL, options)
  }

  const poster = video.poster
  const contentType = getMimeType(poster)
  const dataURL = await resourceToDataURL(poster, contentType, options)
  return createImage(dataURL, options)
}

async function cloneIFrameElement(iframe: HTMLIFrameElement, options: Options) {
  try {
    if (iframe?.contentDocument?.body) {
      return (await cloneNode(
        iframe.contentDocument.body,
        options,
        true,
      )) as HTMLBodyElement
    }
  } catch {
    // Failed to clone iframe
  }

  return iframe.cloneNode(false) as HTMLIFrameElement
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<HTMLElement> {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement(node, options)
  }

  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement(node, options)
  }

  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options)
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
  let children: T[] = []

  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    children = toArray<T>(nativeNode.assignedNodes())
  } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement)) {
    // The iframe adapter has already cloned its body and descendants.
    return clonedNode
  } else {
    children = toArray<T>((nativeNode.shadowRoot ?? nativeNode).childNodes)
  }

  if (
    children.length === 0 ||
    isInstanceOfElement(nativeNode, HTMLVideoElement)
  ) {
    return clonedNode
  }

  await children.reduce(
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

  return clonedNode
}

function cloneCSSStyle<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
) {
  const targetStyle = clonedNode.style
  if (!targetStyle) {
    return
  }

  const sourceStyle = (
    nativeNode.ownerDocument.defaultView || window
  ).getComputedStyle(nativeNode)
  if (sourceStyle.cssText && options.includeStyleProperties == null) {
    targetStyle.cssText = sourceStyle.cssText
    targetStyle.transformOrigin = sourceStyle.transformOrigin
  } else {
    getStyleProperties(options, sourceStyle).forEach((name) => {
      let value = sourceStyle.getPropertyValue(name)
      if (name === 'font-size' && value.endsWith('px')) {
        const reducedFont =
          Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1
        value = `${reducedFont}px`
      }

      if (
        isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
        name === 'display' &&
        value === 'inline'
      ) {
        value = 'block'
      }

      if (name === 'd' && clonedNode.getAttribute('d')) {
        value = `path(${clonedNode.getAttribute('d')})`
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
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    clonedNode.textContent = nativeNode.value
  }

  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    clonedNode.setAttribute('value', nativeNode.value)
  }
}

function cloneSelectValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
    const clonedSelect = clonedNode as any as HTMLSelectElement
    const selectedOption = Array.from(clonedSelect.children).find(
      (child) => nativeNode.value === child.getAttribute('value'),
    )

    if (selectedOption) {
      selectedOption.setAttribute('selected', '')
    }
  }
}

function cloneScrollState<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  const { scrollLeft, scrollTop } = nativeNode
  if (!scrollLeft && !scrollTop) return
  const children = Array.from(clonedNode.children)
  const hasDirectText = Array.from(clonedNode.childNodes).some(
    (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
  )
  const isSupportedSticky = (child: Element, index: number) => {
    const style = (child as HTMLElement).style
    return (
      index === 0 &&
      scrollLeft === 0 &&
      style.position === 'sticky' &&
      parseFloat(style.top) === 0 &&
      (!style.bottom || style.bottom === 'auto')
    )
  }
  const hasUnsupportedPosition = children.some((child, index) => {
    const style = (child as HTMLElement).style
    return (
      style.position === 'fixed' ||
      (style.position === 'sticky' && !isSupportedSticky(child, index)) ||
      style.display === 'inline'
    )
  })
  if (hasDirectText || hasUnsupportedPosition) return
  const x = -scrollLeft
  const y = -scrollTop
  children.forEach((child, index) => {
    const element = child as HTMLElement
    if (isSupportedSticky(child, index)) {
      // Transformed siblings become stacking contexts; keep the sticky header
      // above the normal-flow content as it appears in the live scroller.
      if (!element.style.zIndex || element.style.zIndex === 'auto') {
        element.style.zIndex = '1'
      }
      return
    }
    const transform = element.style.transform
    element.style.transform = `translate(${x}px, ${y}px) ${
      transform && transform !== 'none' ? transform : ''
    }`.trim()
  })
  // SVG foreignObject serialization loses the live scroll offset. Preserve
  // the source viewport by clipping the shifted copy instead.
  clonedNode.style.overflow = 'hidden'
}

function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
): T {
  if (isInstanceOfElement(clonedNode, Element)) {
    cloneCSSStyle(nativeNode, clonedNode, options)
    clonePseudoElements(nativeNode, clonedNode, options)
    cloneInputValue(nativeNode, clonedNode)
    cloneSelectValue(nativeNode, clonedNode)
    cloneScrollState(nativeNode, clonedNode)
  }

  return clonedNode
}

async function ensureSVGSymbols<T extends HTMLElement>(
  clone: T,
  options: Options,
) {
  const uses = clone.querySelectorAll ? clone.querySelectorAll('use') : []
  if (uses.length === 0) {
    return clone
  }

  const processedDefs: { [key: string]: HTMLElement } = {}
  for (let i = 0; i < uses.length; i++) {
    const use = uses[i]
    const id = use.getAttribute('xlink:href')
    if (id) {
      const exist = clone.querySelector(id)
      const definition = document.querySelector(id) as HTMLElement
      if (!exist && definition && !processedDefs[id]) {
        // eslint-disable-next-line no-await-in-loop
        processedDefs[id] = (await cloneNode(definition, options, true))!
      }
    }
  }

  const nodes = Object.values(processedDefs)
  if (nodes.length) {
    const ns = 'http://www.w3.org/1999/xhtml'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('xmlns', ns)
    svg.style.position = 'absolute'
    svg.style.width = '0'
    svg.style.height = '0'
    svg.style.overflow = 'hidden'
    svg.style.display = 'none'

    const defs = document.createElementNS(ns, 'defs')
    svg.appendChild(defs)

    for (let i = 0; i < nodes.length; i++) {
      defs.appendChild(nodes[i])
    }

    clone.appendChild(svg)
  }

  return clone
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
): Promise<T | null> {
  getTask(options)?.check()
  if (
    !isRoot &&
    node.nodeType === 1 &&
    options.exclude?.some((selector) => node.matches(selector))
  ) {
    return null
  }
  if (!isRoot && options.filter && !options.filter(node)) {
    return null
  }

  return Promise.resolve(node)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(node, clonedNode, options))
    .then((clonedNode) => decorate(node, clonedNode, options))
    .then((clonedNode) => ensureSVGSymbols(clonedNode, options))
}
