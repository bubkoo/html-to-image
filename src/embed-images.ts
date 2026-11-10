import { Options } from './types.js'
import { embedResources } from './embed-resources.js'
import { toArray, isInstanceOfElement, createImage } from './util.js'
import { getTask } from './task.js'
import { isDataUrl, resourceToDataURL } from './dataurl.js'
import { getMimeType } from './mimes.js'

async function embedProp(
  propName: string,
  style: CSSStyleDeclaration,
  baseURI: string,
  options: Options,
) {
  const propValue = style.getPropertyValue(propName)
  if (propValue) {
    const cssString = await embedResources(propValue, baseURI, options)
    style.setProperty(propName, cssString, style.getPropertyPriority(propName))
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
  if (node.localName !== 'style' || !node.textContent) return
  // An inert stylesheet preserves @import rules without loading them. A
  // constructed CSSStyleSheet.replaceSync would silently remove those rules.
  const parserDocument = (context.parserDocument ||=
    node.ownerDocument.implementation.createHTMLDocument())
  const parser = parserDocument.createElement('style')
  const type = node.getAttribute('type')
  if (type) parser.setAttribute('type', type)
  parser.textContent = node.textContent
  parserDocument.head.append(parser)
  try {
    const sheet = parser.sheet
    if (!sheet) return
    const baseURI = node.baseURI
    let changed = false
    const visit = async (rules: CSSRuleList): Promise<void> => {
      await Promise.all(
        Array.from(rules).map(async (rule) => {
          if (rule.type === CSSRule.STYLE_RULE) {
            const { style } = rule as CSSStyleRule
            const before = style.cssText
            await embedBackground(style, baseURI, options)
            changed = changed || before !== style.cssText
          }
          if ('cssRules' in rule) {
            await visit((rule as CSSGroupingRule).cssRules)
          }
        }),
      )
    }
    await visit(sheet.cssRules)
    if (changed) {
      node.textContent = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n')
    }
  } finally {
    // Retain the parser document across asynchronous embedding, as with the
    // clone document; its nodes alone are insufficient ownership in WebKit.
    parserDocument.head.removeChild(parser)
  }
}

async function embedImageNode<T extends HTMLElement | SVGImageElement>(
  clonedNode: T,
  options: Options,
) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement)
  const isSVGImage = isInstanceOfElement(clonedNode, SVGImageElement)
  if (!isImageElement && !isSVGImage) return
  let url = isImageElement
    ? clonedNode.src
    : clonedNode.getAttribute('href') ||
      clonedNode.getAttribute('xlink:href') ||
      ''
  if (!isDataUrl(url)) {
    try {
      url = new URL(url, clonedNode.baseURI).href
    } catch {
      // Let the resource loader and image error handler recover invalid URLs.
    }
  }
  const dataURL = isDataUrl(url)
    ? url
    : await resourceToDataURL(url, getMimeType(url), options)
  if (isImageElement) {
    const image = clonedNode as HTMLImageElement
    image.loading = 'eager'
    image.srcset = ''
    if (!image.ownerDocument.defaultView) {
      image.decoding = 'sync'
      image.crossOrigin = 'anonymous'
      image.src = dataURL
    }
  }
  try {
    await createImage(
      dataURL,
      options,
      isImageElement && clonedNode.ownerDocument.defaultView
        ? (clonedNode as HTMLImageElement)
        : undefined,
    )
  } catch (error) {
    getTask(options)?.check()
    if (isImageElement) (clonedNode as HTMLImageElement).src = ''
    if (options.onImageErrorHandler) {
      await options.onImageErrorHandler.call(clonedNode, new Event('error'))
      return
    }
    throw error
  }
  if (!isImageElement) {
    clonedNode.setAttribute('href', dataURL)
    clonedNode.removeAttributeNS('http://www.w3.org/1999/xlink', 'href')
  }
}

async function embedChildren<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  context: EmbedContext,
) {
  const children = toArray<HTMLElement>(clonedNode.childNodes)
  const deferreds = children.map((child) => embedNode(child, options, context))
  await Promise.all(deferreds).then(() => clonedNode)
}

async function embedNode<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  context: EmbedContext,
) {
  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(clonedNode.style, clonedNode.baseURI, options)
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
