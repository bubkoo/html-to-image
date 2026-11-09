import type { Options } from './types.js'
import { clonePseudoElements } from './clone-pseudos.js'
import {
  createImage,
  toArray,
  isInstanceOfElement,
  getStyleProperties,
  uuid,
} from './util.js'
import { getMimeType } from './mimes.js'
import { getResourceLoader, resourceToDataURL } from './dataurl.js'
import { getTask } from './task.js'
import { ResourceResolverError } from './resource-loader.js'

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
      const body = await cloneNode(iframe.contentDocument.body, options, true)
      const viewport = iframe.ownerDocument.createElement('div')
      viewport.appendChild(body!)
      return viewport
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

function cloneScrollState<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  scrollLeft = nativeNode.scrollLeft,
  scrollTop = nativeNode.scrollTop,
) {
  if (!scrollLeft && !scrollTop) return
  const children = Array.from(clonedNode.children)
  const hasDirectText = Array.from(clonedNode.childNodes).some(
    (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
  )
  // Moving every child with a transform prevents sticky positioning from
  // using the scrollport. In a block scroller, shifting the first in-flow
  // child's margin moves the flow while leaving sticky layout to the browser.
  if (
    scrollLeft === 0 &&
    scrollTop > 0 &&
    clonedNode.style.display === 'block' &&
    !hasDirectText &&
    children.some(
      (child) => (child as HTMLElement).style.position === 'sticky',
    ) &&
    children.every((child) => {
      const { display, position } = (child as HTMLElement).style
      return (
        !display.startsWith('inline') &&
        display !== 'contents' &&
        position !== 'absolute'
      )
    })
  ) {
    const firstFlowChild = children.find((child) => {
      const style = (child as HTMLElement).style
      return style.display !== 'none' && style.position !== 'fixed'
    }) as HTMLElement | undefined
    const margin = firstFlowChild?.style.marginTop || '0px'
    if (firstFlowChild && margin !== 'auto') {
      firstFlowChild.style.marginTop = `calc(${margin} - ${scrollTop}px)`
      clonedNode.style.overflow = 'hidden'
      return
    }
  }
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
      (style.position === 'sticky' && !isSupportedSticky(child, index)) ||
      style.display === 'inline'
    )
  })
  if (hasDirectText || hasUnsupportedPosition) return
  const x = -scrollLeft
  const y = -scrollTop
  children.forEach((child, index) => {
    const element = child as HTMLElement
    if (element.style.position === 'fixed') {
      // Translated siblings create stacking contexts above an auto-z fixed child.
      if (!element.style.zIndex || element.style.zIndex === 'auto') {
        element.style.zIndex = '1'
      }
      return
    }
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
      cloneScrollState(nativeNode, clonedNode)
    }
    options.onCloneNode?.(nativeNode, clonedNode)
  }

  return clonedNode
}

async function ensureSVGSymbols<T extends HTMLElement>(
  source: T,
  clone: T,
  options: Options,
) {
  const uses = clone.querySelectorAll ? clone.querySelectorAll('use') : []
  if (uses.length === 0) {
    return clone
  }

  const sourceDocument = source.ownerDocument
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const copied = new Map<string, string>()
  let definitions: SVGDefsElement | undefined
  const findById = (root: Element, id: string) =>
    root.getAttribute('id') === id
      ? root
      : Array.from(root.querySelectorAll('[id]')).find(
          (element) => element.getAttribute('id') === id,
        )
  const appendDefinition = (definition: Element) => {
    if (!definitions) {
      const holder = sourceDocument.createElementNS(svgNamespace, 'svg')
      holder.setAttribute('width', '0')
      holder.setAttribute('height', '0')
      holder.style.position = 'absolute'
      holder.style.overflow = 'hidden'
      definitions = sourceDocument.createElementNS(svgNamespace, 'defs')
      holder.append(definitions)
      clone.append(holder)
    }
    definitions.append(definition)
  }

  for (let i = 0; i < uses.length; i++) {
    getTask(options)?.check()
    const use = uses[i]
    const href = use.getAttribute('href') || use.getAttribute('xlink:href')
    if (!href) continue
    let target: URL
    try {
      target = new URL(href, sourceDocument.baseURI)
    } catch {
      continue
    }
    let id: string
    try {
      id = decodeURIComponent(target.hash.slice(1))
    } catch {
      continue
    }
    if (!id) continue
    target.hash = ''
    const sourceURL = new URL(sourceDocument.URL)
    sourceURL.hash = ''
    const local = href.startsWith('#') || target.href === sourceURL.href
    if (local) {
      if (findById(clone, id) || copied.has(`local:${id}`)) continue
      const definition = sourceDocument.getElementById(id)
      if (!definition || definition.namespaceURI !== svgNamespace) continue
      // eslint-disable-next-line no-await-in-loop
      const copy = await cloneNode(
        definition as HTMLElement,
        options,
        true,
        false,
      )
      if (copy) {
        appendDefinition(copy)
        copied.set(`local:${id}`, id)
      }
      continue
    }
    const key = `${target.href}#${id}`
    let alias = copied.get(key)
    if (!alias) {
      try {
        const loader = getResourceLoader(options)
        // eslint-disable-next-line no-await-in-loop
        const resource = await loader.load(target.href, 'image')
        // eslint-disable-next-line no-await-in-loop
        const body = await resource.text()
        const xml = new DOMParser().parseFromString(body, 'image/svg+xml')
        if (xml.querySelector('parsererror'))
          throw new Error(`Invalid SVG resource: ${target.href}`)
        const definition = findById(xml.documentElement, id)
        if (!definition || definition.namespaceURI !== svgNamespace)
          throw new Error(`SVG symbol not found: ${key}`)
        alias = uuid()
        const copy = sourceDocument.importNode(definition, true)
        copy.setAttribute('id', alias)
        appendDefinition(copy)
        copied.set(key, alias)
      } catch (error) {
        getTask(options)?.check()
        if (error instanceof ResourceResolverError) throw error
        getResourceLoader(options).warn(
          Object.freeze({
            code: 'resource-error',
            resource: target.href,
            message: error instanceof Error ? error.message : String(error),
          }),
        )
        continue
      }
    }
    use.setAttribute('href', `#${alias}`)
    if (use.hasAttribute('xlink:href'))
      use.setAttribute('xlink:href', `#${alias}`)
  }

  return clone
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
  resolveSymbols = true,
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
    return null
  }
  if (!isRoot && options.filter && !options.filter(node)) {
    return null
  }

  return Promise.resolve(node)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(node, clonedNode, options))
    .then((clonedNode) => decorate(node, clonedNode, options, isRoot))
    .then((clonedNode) =>
      isRoot && resolveSymbols
        ? ensureSVGSymbols(node, clonedNode, options)
        : clonedNode,
    )
}
