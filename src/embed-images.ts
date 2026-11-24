import {
  hasDOMProperty,
  readDOMMethod,
  readDOMProperty,
  writeDOMProperty,
} from './dom.js'
import { readDocumentProperty } from './document.js'
import { Options } from './types.js'
import { embedResources } from './embed-resources.js'
import { toArray, isInstanceOfElement, createImage } from './util.js'
import { getTask } from './task.js'
import { isDataUrl, resourceToDataURL } from './dataurl.js'
import { getMimeType } from './mimes.js'
import { getSVGReference, svgNamespace } from './svg-references.js'

async function embedProp(
  propName: string,
  style: CSSStyleDeclaration,
  baseURI: string,
  options: Options,
) {
  const propValue = readDOMMethod(style, 'getPropertyValue')(propName)
  if (propValue) {
    const cssString = await embedResources(propValue, baseURI, options)
    readDOMMethod(style, 'setProperty')(
      propName,
      cssString,
      readDOMMethod(style, 'getPropertyPriority')(propName),
    )
    return true
  }
  return false
}

async function embedBackground(
  style: CSSStyleDeclaration | undefined,
  baseURI: string,
  options: Options,
) {
  if (!style) return
  ;(await embedProp('background', style, baseURI, options)) ||
    (await embedProp('background-image', style, baseURI, options))
  ;(await embedProp('mask', style, baseURI, options)) ||
    (await embedProp('-webkit-mask', style, baseURI, options)) ||
    (await embedProp('mask-image', style, baseURI, options)) ||
    (await embedProp('-webkit-mask-image', style, baseURI, options))
}

interface EmbedContext {
  parserDocument?: Document
}

async function embedStyleRules(
  node: HTMLElement,
  options: Options,
  context: EmbedContext,
) {
  if (
    readDOMProperty(node, 'localName') !== 'style' ||
    !readDOMProperty(node, 'textContent')
  )
    return
  // An inert stylesheet preserves @import rules without loading them. A
  // constructed CSSStyleSheet.replaceSync would silently remove those rules.
  const parserDocument = (context.parserDocument ||= readDOMMethod(
    readDocumentProperty(
      readDOMProperty(node, 'ownerDocument'),
      'implementation',
    ),
    'createHTMLDocument',
  )())
  const parser = Reflect.apply(
    readDocumentProperty(parserDocument, 'createElement'),
    parserDocument,
    ['style'],
  ) as HTMLStyleElement
  const type = readDOMMethod(node, 'getAttribute')('type')
  if (type) readDOMMethod(parser, 'setAttribute')('type', type)
  writeDOMProperty(parser, 'textContent', readDOMProperty(node, 'textContent'))
  readDOMMethod(readDocumentProperty(parserDocument, 'head'), 'append')(parser)
  try {
    const sheet = readDOMProperty(parser, 'sheet')
    if (!sheet) return
    const baseURI = readDOMProperty(node, 'baseURI')
    let changed = false
    const visit = async (rules: CSSRuleList): Promise<void> => {
      await Promise.all(
        Array.from(rules).map(async (rule) => {
          if (readDOMProperty(rule, 'type') === CSSRule.STYLE_RULE) {
            const style = readDOMProperty(rule as CSSStyleRule, 'style')
            const before = readDOMProperty(style, 'cssText')
            await embedBackground(style, baseURI, options)
            changed = changed || before !== readDOMProperty(style, 'cssText')
          }
          if (hasDOMProperty('cssRules', rule)) {
            await visit(readDOMProperty(rule as CSSGroupingRule, 'cssRules'))
          }
        }),
      )
    }
    await visit(readDOMProperty(sheet, 'cssRules'))
    if (changed) {
      writeDOMProperty(
        node,
        'textContent',
        Array.from(readDOMProperty(sheet, 'cssRules'))
          .map((rule) => readDOMProperty(rule, 'cssText'))
          .join('\n'),
      )
    }
  } finally {
    // Retain the parser document across asynchronous embedding, as with the
    // clone document; its nodes alone are insufficient ownership in WebKit.
    readDOMMethod(
      readDocumentProperty(parserDocument, 'head'),
      'removeChild',
    )(parser)
  }
}

async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement)
  const isSVGImage =
    isInstanceOfElement(clonedNode, SVGImageElement) ||
    (readDOMProperty(clonedNode, 'namespaceURI') === svgNamespace &&
      readDOMProperty(clonedNode, 'localName') === 'feImage')
  if (!isImageElement && !isSVGImage) return
  let url = isImageElement
    ? readDOMProperty(clonedNode, 'src')
    : getSVGReference(clonedNode) || ''
  if (isSVGImage && !url) return
  if (!isDataUrl(url)) {
    try {
      url = new URL(url, readDOMProperty(clonedNode, 'baseURI')).href
    } catch {
      // Let the resource loader and image error handler recover invalid URLs.
    }
  }
  const dataURL = isDataUrl(url)
    ? url
    : await resourceToDataURL(url, getMimeType(url), options)
  if (isImageElement) {
    const image = clonedNode as HTMLImageElement
    writeDOMProperty(image, 'loading', 'eager')
    writeDOMProperty(image, 'srcset', '')
    if (
      !readDocumentProperty(
        readDOMProperty(image, 'ownerDocument'),
        'defaultView',
      )
    ) {
      writeDOMProperty(image, 'decoding', 'sync')
      writeDOMProperty(image, 'crossOrigin', 'anonymous')
      writeDOMProperty(image, 'src', dataURL)
    }
  }
  try {
    await createImage(
      dataURL,
      options,
      isImageElement &&
        readDocumentProperty(
          readDOMProperty(clonedNode, 'ownerDocument'),
          'defaultView',
        )
        ? (clonedNode as HTMLImageElement)
        : undefined,
    )
  } catch (error) {
    getTask(options)?.check()
    if (isImageElement)
      writeDOMProperty(clonedNode as HTMLImageElement, 'src', '')
    if (options.onImageErrorHandler) {
      await options.onImageErrorHandler.call(clonedNode, new Event('error'))
      return
    }
    throw error
  }
  if (!isImageElement) {
    readDOMMethod(clonedNode, 'setAttribute')('href', dataURL)
    readDOMMethod(clonedNode, 'removeAttributeNS')(
      'http://www.w3.org/1999/xlink',
      'href',
    )
  }
}

async function embedChildren<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  context: EmbedContext,
) {
  const children = toArray<HTMLElement>(
    readDOMProperty(clonedNode, 'childNodes'),
  )
  const deferreds = children.map((child) => embedNode(child, options, context))
  await Promise.all(deferreds).then(() => clonedNode)
}

async function embedNode<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  context: EmbedContext,
) {
  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(
      readDOMProperty(clonedNode, 'style'),
      readDOMProperty(clonedNode, 'baseURI'),
      options,
    )
    await embedImageNode(clonedNode, options)
    await embedStyleRules(clonedNode, options, context)
    await embedChildren(clonedNode, options, context)
  }
}

export async function embedImages<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  await embedNode(clonedNode, options, {})
}
