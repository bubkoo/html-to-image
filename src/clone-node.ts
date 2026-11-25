import {
  readDOMMethod,
  readDOMProperty,
  readOptionalDOMMethod,
  writeDOMProperty,
} from './dom.js'
import {
  readDocumentMethod,
  readDocumentProperty,
  readOptionalDocumentProperty,
} from './document.js'
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
import { normalizeRootLayout, type RootLayoutPlan } from './root-layout.js'
import {
  cloneScrollbarStyles,
  beginScrollbarStyleScope,
  freezeScrollbarPresence,
} from './clone-scrollbars.js'

function createCloneDocument(source: Document) {
  // A detached element in a browsing document can still load resources in
  // WebKit when styles or image loading attributes change.
  const copy = readDOMMethod(
    readDocumentProperty(source, 'implementation'),
    'createHTMLDocument',
  )()
  const base = Reflect.apply(
    readDocumentProperty(copy, 'createElement'),
    copy,
    ['base'],
  ) as HTMLBaseElement
  writeDOMProperty(base, 'href', readDocumentProperty(source, 'baseURI'))
  readDOMMethod(readDocumentProperty(copy, 'head'), 'append')(base)
  return copy
}

async function cloneCanvasElement(canvas: HTMLCanvasElement, options: Options) {
  const dataURL = readDOMMethod(canvas, 'toDataURL')()
  if (dataURL === 'data:,') {
    return readDOMMethod(canvas, 'cloneNode')(false) as HTMLCanvasElement
  }
  return createImage(dataURL, options)
}

async function cloneVideoElement(video: HTMLVideoElement, options: Options) {
  if (
    !readDOMProperty(video, 'poster') &&
    readDOMProperty(video, 'readyState') ===
      readDOMProperty(video, 'HAVE_NOTHING')
  ) {
    // No media image exists yet; preserve the styled, transparent replaced box.
    const empty = readDocumentMethod(document, 'createElement')('canvas')
    return createImage(readDOMMethod(empty, 'toDataURL')(), options)
  }
  if (readDOMProperty(video, 'currentSrc')) {
    const canvas = readDocumentMethod(document, 'createElement')('canvas')
    const ctx = readDOMMethod(canvas, 'getContext')('2d')
    writeDOMProperty(canvas, 'width', readDOMProperty(video, 'videoWidth'))
    writeDOMProperty(canvas, 'height', readDOMProperty(video, 'videoHeight'))
    ctx?.drawImage(
      video,
      0,
      0,
      readDOMProperty(canvas, 'width'),
      readDOMProperty(canvas, 'height'),
    )
    const dataURL = readDOMMethod(canvas, 'toDataURL')()
    return createImage(dataURL, options)
  }

  const poster = readDOMProperty(video, 'poster')
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
    sourceBody =
      readOptionalDocumentProperty(
        readDOMProperty(iframe, 'contentDocument'),
        'body',
      ) || null
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
    const viewport = readDocumentMethod(targetDocument, 'createElement')('div')
    readDOMMethod(viewport, 'appendChild')(body!)
    return viewport
  }

  return readDocumentMethod(targetDocument, 'importNode')(iframe, false)
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
  targetDocument: Document,
  resolveSymbols: boolean,
): Promise<HTMLElement> {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return readDocumentMethod(
      targetDocument,
      'adoptNode',
    )(await cloneCanvasElement(node, options))
  }

  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return readDocumentMethod(
      targetDocument,
      'adoptNode',
    )(await cloneVideoElement(node, options))
  }

  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options, targetDocument, resolveSymbols)
  }

  const copy = readDocumentMethod(targetDocument, 'importNode')(node, false)
  if (isInstanceOfElement(node, HTMLImageElement)) {
    // Keep the source document's URL resolution when importing iframe content.
    writeDOMProperty(
      copy as unknown as HTMLImageElement,
      'src',
      readDOMProperty(node, 'src'),
    )
  } else if (isInstanceOfElement(node, SVGImageElement)) {
    const href = getSVGReference(node)
    if (href) {
      try {
        readDOMMethod(copy, 'setAttribute')(
          'href',
          new URL(href, readDOMProperty(node, 'baseURI')).href,
        )
        readDOMMethod(copy, 'removeAttributeNS')(
          'http://www.w3.org/1999/xlink',
          'href',
        )
      } catch {
        // Keep malformed references for the normal resource error path.
      }
    }
  }
  return copy
}

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement =>
  readDOMProperty(node, 'tagName') != null &&
  readDOMProperty(node, 'tagName').toUpperCase() === 'SLOT'

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  targetDocument: Document,
  resolveSymbols: boolean,
  rootLayout?: RootLayoutPlan,
): Promise<T> {
  let children: T[]

  if (
    isSlotElement(nativeNode) &&
    readDOMProperty(nativeNode, 'assignedNodes')
  ) {
    const assigned = readDOMMethod(nativeNode, 'assignedNodes')()
    children = toArray<T>(
      assigned.length ? assigned : readDOMProperty(nativeNode, 'childNodes'),
    )
  } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement)) {
    // The iframe adapter has already cloned its body and descendants.
    return clonedNode
  } else {
    children = toArray<T>(
      readDOMProperty(
        readDOMProperty(nativeNode, 'shadowRoot') ?? nativeNode,
        'childNodes',
      ),
    )
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
          cloneNode(
            child,
            options,
            false,
            resolveSymbols,
            targetDocument,
            rootLayout,
          ),
        )
        .then((clonedChild: HTMLElement | null) => {
          if (clonedChild) {
            readDOMMethod(clonedNode, 'appendChild')(clonedChild)
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
  const targetStyle = readDOMProperty(clonedNode, 'style')
  if (!targetStyle) {
    return
  }

  const sourceStyle = readDOMMethod(
    readDocumentProperty(
      readDOMProperty(nativeNode, 'ownerDocument'),
      'defaultView',
    ) || window,
    'getComputedStyle',
  )(nativeNode)
  if (readDOMProperty(sourceStyle, 'cssText') && selected == null) {
    writeDOMProperty(
      targetStyle,
      'cssText',
      readDOMProperty(sourceStyle, 'cssText'),
    )
    writeDOMProperty(
      targetStyle,
      'transformOrigin',
      readDOMProperty(sourceStyle, 'transformOrigin'),
    )
  } else {
    let inheritedStyle: CSSStyleDeclaration | undefined
    const task = getTask(options)
    const shadowHost = readDOMProperty(
      readDOMMethod(nativeNode, 'getRootNode')() as ShadowRoot,
      'host',
    )
    const parent = isRoot
      ? null
      : readDOMProperty(nativeNode, 'assignedSlot') ||
        readDOMProperty(nativeNode, 'parentElement') ||
        shadowHost
    getStyleProperties(sourceStyle, selected).forEach((name) => {
      let value = readDOMMethod(sourceStyle, 'getPropertyValue')(name)
      if (selected == null && parent && name.startsWith('--')) {
        // Equal inherited variables are already available from the copied ancestor.
        if (task) {
          if (value === task.getInheritedStyleValue(parent, name)) return
        } else {
          inheritedStyle ||= readDOMMethod(
            readDocumentProperty(
              readDOMProperty(nativeNode, 'ownerDocument'),
              'defaultView',
            ) || window,
            'getComputedStyle',
          )(parent)
          if (value === readDOMMethod(inheritedStyle, 'getPropertyValue')(name))
            return
        }
      }
      if (
        name === 'display' &&
        value === 'inline' &&
        isInstanceOfElement(nativeNode, HTMLIFrameElement)
      ) {
        value = 'block'
      }

      if (name === 'd' && readDOMMethod(clonedNode, 'getAttribute')('d')) {
        value = `path(${readDOMMethod(clonedNode, 'getAttribute')('d')})`
      }

      readDOMMethod(targetStyle, 'setProperty')(
        name,
        value,
        readDOMMethod(sourceStyle, 'getPropertyPriority')(name),
      )
    })
  }
  return sourceStyle
}

function restoreScrollbarBox<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  sourceStyle: CSSStyleDeclaration,
  selected?: readonly string[],
) {
  const targetStyle = readDOMProperty(clonedNode, 'style')
  if (
    readDOMProperty(sourceStyle, 'boxSizing') === 'content-box' &&
    ['auto', 'scroll', 'hidden'].some(
      (value) =>
        readDOMProperty(sourceStyle, 'overflowX') === value ||
        readDOMProperty(sourceStyle, 'overflowY') === value,
    )
  ) {
    const px = (name: string) =>
      parseFloat(readDOMMethod(sourceStyle, 'getPropertyValue')(name)) || 0
    const restore = (
      dimension: 'width' | 'height',
      offset: number,
      start: string,
      end: string,
    ) => {
      const horizontal =
        readDOMProperty(sourceStyle, 'writingMode') === 'horizontal-tb'
      const logical =
        dimension === 'width'
          ? horizontal
            ? 'inline-size'
            : 'block-size'
          : horizontal
            ? 'block-size'
            : 'inline-size'
      if (
        selected &&
        !selected.includes(dimension) &&
        !selected.includes(logical)
      )
        return
      const axis = dimension === 'width' ? 'overflow-y' : 'overflow-x'
      const targetOverflow =
        readDOMMethod(targetStyle, 'getPropertyValue')(axis) ||
        readDOMMethod(
          targetStyle,
          'getPropertyValue',
        )(logical === 'inline-size' ? 'overflow-block' : 'overflow-inline')
      // Legacy scroll encoding hides the native gutter and uses its content
      // viewport. Restore the outer box only when that gutter is retained.
      const keepsStableGutter =
        targetOverflow === 'hidden' &&
        logical === 'inline-size' &&
        readDOMMethod(
          sourceStyle,
          'getPropertyValue',
        )('scrollbar-gutter').includes('stable')
      if (
        targetOverflow !==
          readDOMMethod(sourceStyle, 'getPropertyValue')(axis) &&
        !keepsStableGutter
      )
        return
      const used = parseFloat(
        readDOMMethod(sourceStyle, 'getPropertyValue')(dimension),
      )
      if (!Number.isFinite(used) || !Number.isFinite(offset)) return
      const edges =
        px(`padding-${start}`) +
        px(`padding-${end}`) +
        px(`border-${start}-width`) +
        px(`border-${end}-width`)
      const gutter = offset - Math.round(used + edges)
      if (gutter <= 0) return
      // CSSOM resolves a content-box dimension after subtracting its gutter.
      // A second scroll container must start from the original box dimension,
      // otherwise it subtracts the same scrollbar space again.
      const property =
        selected && !selected.includes(dimension) ? logical : dimension
      readDOMMethod(targetStyle, 'removeProperty')(property)
      readDOMMethod(targetStyle, 'setProperty')(property, `${used + gutter}px`)
    }
    restore(
      'width',
      readDOMProperty(nativeNode, 'offsetWidth'),
      'left',
      'right',
    )
    restore(
      'height',
      readDOMProperty(nativeNode, 'offsetHeight'),
      'top',
      'bottom',
    )
  }
}

function cloneInputValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    writeDOMProperty(
      clonedNode,
      'textContent',
      readDOMProperty(nativeNode, 'value'),
    )
  }

  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    readDOMMethod(clonedNode, 'setAttribute')(
      'value',
      readDOMProperty(nativeNode, 'value'),
    )
  }
}

function cloneOptionSelection<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
) {
  if (isInstanceOfElement(nativeNode, HTMLOptionElement)) {
    if (readDOMProperty(nativeNode, 'selected')) {
      readDOMMethod(clonedNode, 'setAttribute')('selected', '')
    } else {
      readDOMMethod(clonedNode, 'removeAttribute')('selected')
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
        const target = new URL(
          reference,
          readDocumentProperty(sourceDocument, 'baseURI'),
        )
        if (!target.hash) return original
        const source = new URL(readDocumentProperty(sourceDocument, 'URL'))
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
  const sourceDocument = readDOMProperty(nativeNode, 'ownerDocument')
  const attribute = readDOMMethod(clonedNode, 'getAttribute')('clip-path')
  if (attribute && /url\(/i.test(attribute)) {
    const normalized = normalizeClipPathURLs(attribute, sourceDocument)
    if (normalized !== attribute)
      readDOMMethod(clonedNode, 'setAttribute')('clip-path', normalized)
  }
  const style = readDOMProperty(clonedNode, 'style')
  const value = readOptionalDOMMethod(style, 'getPropertyValue')?.('clip-path')
  if (value?.includes('url(')) {
    const normalized = normalizeClipPathURLs(value, sourceDocument)
    if (normalized !== value) {
      readDOMMethod(style, 'setProperty')(
        'clip-path',
        normalized,
        readDOMMethod(style, 'getPropertyPriority')('clip-path'),
      )
    }
  }
}

async function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  isRoot?: boolean,
  rootLayout?: RootLayoutPlan,
): Promise<T> {
  if (isInstanceOfElement(clonedNode, Element)) {
    const selected = options.stylePropertiesForNode
      ? options.stylePropertiesForNode(nativeNode)
      : options.includeStyleProperties
    const sourceStyle = cloneCSSStyle(
      nativeNode,
      clonedNode,
      options,
      selected,
      isRoot,
    )
    clonePseudoElements(nativeNode, clonedNode, selected)
    await cloneScrollbarStyles(nativeNode, clonedNode, options, selected)
    cloneInputValue(nativeNode, clonedNode)
    cloneOptionSelection(nativeNode, clonedNode)
    cloneClipPathReferences(nativeNode, clonedNode)
    if (
      isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
      readDOMProperty(clonedNode, 'tagName') === 'DIV'
    ) {
      let scrollLeft = 0
      let scrollTop = 0
      try {
        scrollLeft = readDOMProperty(
          readDOMProperty(nativeNode, 'contentWindow')!,
          'scrollX',
        )
        scrollTop = readDOMProperty(
          readDOMProperty(nativeNode, 'contentWindow')!,
          'scrollY',
        )
      } catch {
        // The frame may navigate or detach after its body was cloned.
      }
      cloneScrollState(
        nativeNode,
        readDOMProperty(clonedNode, 'firstElementChild') as HTMLElement,
        options,
        scrollLeft,
        scrollTop,
      )
      // The iframe viewport clips its body even when it has not scrolled.
      writeDOMProperty(
        readDOMProperty(clonedNode, 'style'),
        'overflow',
        'hidden',
      )
      // A transformed viewport anchors fixed descendants to this iframe.
      if (
        !readDOMProperty(readDOMProperty(clonedNode, 'style'), 'transform') ||
        readDOMProperty(readDOMProperty(clonedNode, 'style'), 'transform') ===
          'none'
      ) {
        writeDOMProperty(
          readDOMProperty(clonedNode, 'style'),
          'transform',
          'translate(0px, 0px)',
        )
      }
    } else {
      cloneScrollState(nativeNode, clonedNode, options)
    }
    if (sourceStyle)
      restoreScrollbarBox(nativeNode, clonedNode, sourceStyle, selected)
    freezeScrollbarPresence(nativeNode, clonedNode, sourceStyle)
    if (rootLayout)
      normalizeRootLayout(rootLayout, nativeNode, clonedNode, isRoot)
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
      readDOMProperty(clone, 'ownerDocument'),
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
  rootLayout?: RootLayoutPlan,
): Promise<T | null> {
  const task = getTask(options)
  task?.check()
  const yieldToBrowser = task?.maybeYieldClone()
  if (yieldToBrowser) await yieldToBrowser
  task?.check()
  // HTML permits comment contents that XML forbids; comments have no pixels.
  if (readDOMProperty(node, 'nodeType') === Node.COMMENT_NODE) return null
  if (
    !isRoot &&
    readDOMProperty(node, 'nodeType') === 1 &&
    options.exclude?.some((selector) =>
      readDOMMethod(node, 'matches')(selector),
    )
  ) {
    task?.excludeSource(node)
    return null
  }
  if (!isRoot && options.filter && !options.filter(node)) {
    task?.excludeSource(node)
    return null
  }

  const copyDocument =
    targetDocument ||
    createCloneDocument(readDOMProperty(node, 'ownerDocument'))
  const releaseScrollbarStyles = isRoot
    ? beginScrollbarStyleScope(options)
    : undefined
  const result = Promise.resolve(node)
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
        rootLayout,
      )
    })
    .then((clonedNode) =>
      decorate(node, clonedNode, options, isRoot, rootLayout),
    )
    .then((clonedNode) =>
      isRoot && resolveSymbols
        ? ensureSVGSymbols(node, clonedNode, options)
        : clonedNode,
    )
  if (!releaseScrollbarStyles) return result
  return result.then(
    (clone) => {
      releaseScrollbarStyles()
      return clone
    },
    (error) => {
      releaseScrollbarStyles()
      throw error
    },
  )
}
