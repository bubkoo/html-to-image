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
import { embedSVGReferences, getSVGReference } from './svg-references.js'
import { cloneScrollState } from './clone-scroll.js'

function createCloneDocument(source: Document) {
  // A detached element in a browsing document can still load resources in
  // WebKit when styles or image loading attributes change.
  const copy = source.implementation.createHTMLDocument()
  const base = copy.createElement('base')
  base.href = source.baseURI
  copy.head.append(base)
  return copy
}

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
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataURL = canvas.toDataURL()
    return createImage(dataURL, options)
  }

  const poster = video.poster
  const contentType = getMimeType(poster)
  const dataURL = await resourceToDataURL(poster, contentType, options)
  return createImage(dataURL, options)
}

async function cloneIFrameElement(
  iframe: HTMLIFrameElement,
  options: Options,
  targetDocument: Document,
  resolveSymbols: boolean,
) {
  let sourceBody: HTMLElement | null = null
  try {
    sourceBody = iframe.contentDocument?.body || null
  } catch {
    // Reading an inaccessible document may fail; user clone failures must not.
  }
  if (sourceBody) {
    const body = await cloneNode(
      sourceBody,
      options,
      true,
      resolveSymbols,
      targetDocument,
    )
    const viewport = targetDocument.createElement('div')
    viewport.appendChild(body!)
    return viewport
  }

  return targetDocument.importNode(iframe, false)
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
  targetDocument: Document,
  resolveSymbols: boolean,
): Promise<HTMLElement> {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return targetDocument.adoptNode(await cloneCanvasElement(node, options))
  }

  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return targetDocument.adoptNode(await cloneVideoElement(node, options))
  }

  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options, targetDocument, resolveSymbols)
  }

  const copy = targetDocument.importNode(node, false)
  if (isInstanceOfElement(node, HTMLImageElement)) {
    // Keep the source document's URL resolution when importing iframe content.
    ;(copy as unknown as HTMLImageElement).src = node.src
  } else if (isInstanceOfElement(node, SVGImageElement)) {
    const href = getSVGReference(node)
    if (href) {
      try {
        copy.setAttribute('href', new URL(href, node.baseURI).href)
        copy.removeAttributeNS('http://www.w3.org/1999/xlink', 'href')
      } catch {
        // Keep malformed references for the normal resource error path.
      }
    }
  }
  return copy
}

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement =>
  node.tagName != null && node.tagName.toUpperCase() === 'SLOT'

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  targetDocument: Document,
  resolveSymbols: boolean,
): Promise<T> {
  let children: T[]

  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    const assigned = nativeNode.assignedNodes()
    children = toArray<T>(assigned.length ? assigned : nativeNode.childNodes)
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
        .then(() =>
          cloneNode(child, options, false, resolveSymbols, targetDocument),
        )
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
  selected?: readonly string[],
  isRoot?: boolean,
) {
  const targetStyle = clonedNode.style
  if (!targetStyle) {
    return
  }

  const sourceStyle = (
    nativeNode.ownerDocument.defaultView || window
  ).getComputedStyle(nativeNode)
  if (sourceStyle.cssText && selected == null) {
    targetStyle.cssText = sourceStyle.cssText
    targetStyle.transformOrigin = sourceStyle.transformOrigin
  } else {
    let inheritedStyle: CSSStyleDeclaration | undefined
    const task = getTask(options)
    const shadowHost = (nativeNode.getRootNode() as ShadowRoot).host
    const parent = isRoot
      ? null
      : nativeNode.assignedSlot || nativeNode.parentElement || shadowHost
    getStyleProperties(sourceStyle, selected).forEach((name) => {
      let value = sourceStyle.getPropertyValue(name)
      if (selected == null && parent && name.startsWith('--')) {
        // Equal inherited variables are already available from the copied ancestor.
        if (task) {
          if (value === task.getInheritedStyleValue(parent, name)) return
        } else {
          inheritedStyle ||= (
            nativeNode.ownerDocument.defaultView || window
          ).getComputedStyle(parent)
          if (value === inheritedStyle.getPropertyValue(name)) return
        }
      }
      if (
        name === 'display' &&
        value === 'inline' &&
        isInstanceOfElement(nativeNode, HTMLIFrameElement)
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

function cloneOptionSelection<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
) {
  if (isInstanceOfElement(nativeNode, HTMLOptionElement)) {
    if (nativeNode.selected) {
      clonedNode.setAttribute('selected', '')
    } else {
      clonedNode.removeAttribute('selected')
    }
  }
}

function normalizeClipPathURLs(
  value: string,
  sourceDocument: Document,
): string {
  return value.replace(
    /url\(\s*(?:(["'])(.*?)\1|([^'"\s)]+))\s*\)/gi,
    (
      original,
      _quote,
      quoted: string | undefined,
      bare: string | undefined,
    ) => {
      const reference = quoted ?? bare
      if (!reference || reference.startsWith('#')) return original
      try {
        const target = new URL(reference, sourceDocument.baseURI)
        if (!target.hash) return original
        const source = new URL(sourceDocument.URL)
        source.hash = ''
        const fragment = target.hash
        target.hash = ''
        return target.href === source.href ? `url(${fragment})` : original
      } catch {
        return original
      }
    },
  )
}

function cloneClipPathReferences<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
) {
  const sourceDocument = nativeNode.ownerDocument
  const attribute = clonedNode.getAttribute('clip-path')
  if (attribute && /url\(/i.test(attribute)) {
    const normalized = normalizeClipPathURLs(attribute, sourceDocument)
    if (normalized !== attribute)
      clonedNode.setAttribute('clip-path', normalized)
  }
  const style = clonedNode.style
  const value = style?.getPropertyValue('clip-path')
  if (value?.includes('url(')) {
    const normalized = normalizeClipPathURLs(value, sourceDocument)
    if (normalized !== value) {
      style.setProperty(
        'clip-path',
        normalized,
        style.getPropertyPriority('clip-path'),
      )
    }
  }
}

function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  isRoot?: boolean,
): T {
  if (isInstanceOfElement(clonedNode, Element)) {
    const selected = options.stylePropertiesForNode
      ? options.stylePropertiesForNode(nativeNode)
      : options.includeStyleProperties
    cloneCSSStyle(nativeNode, clonedNode, options, selected, isRoot)
    clonePseudoElements(nativeNode, clonedNode, selected)
    cloneInputValue(nativeNode, clonedNode)
    cloneOptionSelection(nativeNode, clonedNode)
    cloneClipPathReferences(nativeNode, clonedNode)
    if (
      isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
      clonedNode.tagName === 'DIV'
    ) {
      let scrollLeft = 0
      let scrollTop = 0
      try {
        scrollLeft = nativeNode.contentWindow!.scrollX
        scrollTop = nativeNode.contentWindow!.scrollY
      } catch {
        // The frame may navigate or detach after its body was cloned.
      }
      cloneScrollState(
        nativeNode,
        clonedNode.firstElementChild as HTMLElement,
        options,
        scrollLeft,
        scrollTop,
      )
      // The iframe viewport clips its body even when it has not scrolled.
      clonedNode.style.overflow = 'hidden'
      // A transformed viewport anchors fixed descendants to this iframe.
      if (
        !clonedNode.style.transform ||
        clonedNode.style.transform === 'none'
      ) {
        clonedNode.style.transform = 'translate(0px, 0px)'
      }
    } else {
      cloneScrollState(nativeNode, clonedNode, options)
    }
    options.onCloneNode?.(nativeNode, clonedNode)
  }

  return clonedNode
}

export async function ensureSVGSymbols<T extends HTMLElement>(
  source: T,
  clone: T,
  options: Options,
) {
  await embedSVGReferences(source, clone, options, (definition) =>
    cloneNode(
      definition as HTMLElement,
      options,
      true,
      false,
      clone.ownerDocument,
    ),
  )
  return clone
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
  resolveSymbols = true,
  targetDocument?: Document,
): Promise<T | null> {
  const task = getTask(options)
  task?.check()
  const yieldToBrowser = task?.maybeYieldClone()
  if (yieldToBrowser) await yieldToBrowser
  task?.check()
  // HTML permits comment contents that XML forbids; comments have no pixels.
  if (node.nodeType === Node.COMMENT_NODE) return null
  if (
    !isRoot &&
    node.nodeType === 1 &&
    options.exclude?.some((selector) => node.matches(selector))
  ) {
    task?.excludeSource(node)
    return null
  }
  if (!isRoot && options.filter && !options.filter(node)) {
    task?.excludeSource(node)
    return null
  }

  const copyDocument = targetDocument || createCloneDocument(node.ownerDocument)
  return Promise.resolve(node)
    .then(
      (clonedNode) =>
        cloneSingleNode(
          clonedNode,
          options,
          copyDocument,
          resolveSymbols,
        ) as Promise<T>,
    )
    .then((clonedNode) => {
      if (isInstanceOfElement(node, Element)) {
        task?.registerClone(clonedNode, node)
      }
      return cloneChildren(
        node,
        clonedNode,
        options,
        copyDocument,
        resolveSymbols,
      )
    })
    .then((clonedNode) => decorate(node, clonedNode, options, isRoot))
    .then((clonedNode) =>
      isRoot && resolveSymbols
        ? ensureSVGSymbols(node, clonedNode, options)
        : clonedNode,
    )
}
