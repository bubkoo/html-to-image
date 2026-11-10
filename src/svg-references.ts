import type { Options } from './types.js'
import { getResourceLoader } from './dataurl.js'
import { ResourceResolverError } from './resource-loader.js'
import { getTask } from './task.js'
import { getMimeType } from './mimes.js'
import { uuid } from './util.js'

export const svgNamespace = 'http://www.w3.org/2000/svg'
const xlinkNamespace = 'http://www.w3.org/1999/xlink'
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace'

export function getSVGReference(node: Element) {
  return (
    node.getAttribute('href') ??
    node.getAttributeNS(xlinkNamespace, 'href') ??
    node.getAttribute('xlink:href')
  )
}

export function setSVGReference(node: Element, value: string) {
  node.setAttribute('href', value)
  const legacy =
    node.getAttributeNodeNS(xlinkNamespace, 'href') ||
    node.getAttributeNode('xlink:href')
  if (legacy) legacy.value = value
}

const paintProperties = [
  'fill',
  'stroke',
  'filter',
  'clip-path',
  'mask',
  'marker',
  'marker-start',
  'marker-mid',
  'marker-end',
  'cursor',
  'background',
  'background-image',
  'mask-image',
  '-webkit-mask',
  '-webkit-mask-image',
]
const paintPropertySet = new Set(paintProperties)
const definitionLinks = new Set([
  'use',
  'linearGradient',
  'radialGradient',
  'pattern',
  'textPath',
  'mpath',
])

interface Scope {
  root: Document | DocumentFragment | Element
  url: string
  external: boolean
  ids?: Map<string, Element>
}

export async function embedSVGReferences(
  source: Element,
  root: Element,
  options: Options,
  cloneLocal: (node: Element) => Promise<Element | null>,
) {
  if (
    root.namespaceURI !== svgNamespace &&
    !root.matches('[style*="url("]') &&
    !root.querySelector('svg,[style*="url("]')
  )
    return
  const task = getTask(options)
  const loader = getResourceLoader(options)
  const targetDocument = root.ownerDocument
  const scopes = new Map<Node, Scope>()
  const external = new Map<string, Promise<Scope>>()
  const copies = new Map<Element, Element>()
  const origins = new WeakMap<Element, { source: Element; scope: Scope }>()
  const aliases = new Map<Element, string>()
  const visited = new WeakSet<Element>()
  const primary = new WeakSet<Element>()
  const ids = new Set<string>()
  let definitions: SVGDefsElement | undefined

  const withoutHash = (value: string) => {
    const url = new URL(value)
    url.hash = ''
    return url.href
  }
  const localScope = (node: Element): Scope => {
    const document = node.ownerDocument
    const tree = node.getRootNode()
    const root =
      'querySelectorAll' in tree
        ? (tree as Document | DocumentFragment | Element)
        : document
    let scope = scopes.get(root)
    if (!scope) {
      scope = {
        root,
        url: withoutHash(document.URL),
        external: false,
      }
      scopes.set(root, scope)
    }
    return scope
  }
  const find = (scope: Scope, id: string) => {
    if (!scope.ids) {
      scope.ids = new Map()
      const nodes = Array.from(scope.root.querySelectorAll('[id]'))
      if (scope.root.nodeType === Node.ELEMENT_NODE)
        nodes.unshift(scope.root as Element)
      nodes.forEach((node) => {
        if (node.id && !scope.ids!.has(node.id)) scope.ids!.set(node.id, node)
      })
    }
    return scope.ids.get(id)
  }
  const sourceScope = localScope(source)
  ;[root, ...Array.from(root.querySelectorAll('*'))].forEach((node) => {
    primary.add(node)
    if (node.id) ids.add(node.id)
    const original = task?.getCloneSource(node)
    if (original) {
      copies.set(original, node)
      origins.set(node, {
        source: original,
        scope: localScope(original),
      })
    }
  })

  const append = (node: Element) => {
    if (!definitions) {
      const holder = targetDocument.createElementNS(svgNamespace, 'svg')
      holder.setAttribute('width', '0')
      holder.setAttribute('height', '0')
      holder.style.cssText = 'position:absolute;overflow:hidden'
      definitions = targetDocument.createElementNS(svgNamespace, 'defs')
      holder.append(definitions)
      root.append(holder)
    }
    definitions.append(node)
  }
  const privateId = () => {
    let id = uuid()
    while (ids.has(id)) id = uuid()
    ids.add(id)
    return id
  }
  const baseFor = (node: Element, scope: Scope) => {
    if (!scope.external) return node.baseURI
    const ancestors: Element[] = []
    for (
      let current: Element | null = node;
      current;
      current = current.parentElement
    )
      ancestors.unshift(current)
    return ancestors.reduce((base, current) => {
      const value = current.getAttributeNS(xmlNamespace, 'base')
      return value ? new URL(value, base).href : base
    }, scope.url)
  }
  const loadScope = (url: string) => {
    let pending = external.get(url)
    if (!pending) {
      pending = (async () => {
        const blob = await loader.load(url, 'image', getMimeType(url))
        const document = new DOMParser().parseFromString(
          await blob.text(),
          'image/svg+xml',
        )
        if (
          document.querySelector('parsererror') ||
          document.documentElement.namespaceURI !== svgNamespace
        )
          throw new Error(`Invalid SVG resource: ${url}`)
        return { root: document, url, external: true }
      })()
      external.set(url, pending)
    }
    return pending
  }

  const copyDefinition = async (
    original: Element,
    scope: Scope,
  ): Promise<string | undefined> => {
    const previous = aliases.get(original)
    if (previous) return previous
    if (task?.isExcludedSource(original)) {
      const missing = privateId()
      aliases.set(original, missing)
      return missing
    }
    const existing = copies.get(original)
    if (existing) {
      const id = existing.id || privateId()
      existing.id = id
      aliases.set(original, id)
      await visit(existing, scope)
      return id
    }
    const id =
      !scope.external && !ids.has(original.id) ? original.id : privateId()
    ids.add(id)
    // Reserve the identity before following edges, so cycles cannot recurse.
    aliases.set(original, id)
    const copy = scope.external
      ? targetDocument.importNode(original, true)
      : await cloneLocal(original)
    if (!copy) return undefined
    copy.setAttribute('id', id)
    const register = (native: Element, node: Element) => {
      const old = copies.get(native)
      if (old && !primary.has(old)) {
        node.replaceWith(old)
        return
      }
      origins.set(node, { source: native, scope })
      if (!old) copies.set(native, node)
      if (native.id && node !== copy) {
        const alias =
          old && primary.has(old)
            ? privateId()
            : aliases.get(native) ||
              (scope.external || ids.has(native.id) ? privateId() : native.id)
        ids.add(alias)
        if (!old || !primary.has(old)) aliases.set(native, alias)
        node.setAttribute('id', alias)
      }
      if (scope.external) {
        Array.from(native.children).forEach((child, index) =>
          register(child, node.children[index]),
        )
      }
    }
    register(original, copy)
    if (!scope.external) {
      Array.from(copy.querySelectorAll('*')).forEach((node) => {
        const native = task?.getCloneSource(node)
        if (native && copy.contains(node)) register(native, node)
      })
    }
    append(copy)
    await visit(copy, scope)
    return id
  }

  const reference = async (
    value: string,
    original: Element,
    scope: Scope,
    wholeDocument = false,
  ) => {
    if (!value.trim()) return value
    let target: URL
    let id: string
    try {
      target = new URL(value, baseFor(original, scope))
      id = decodeURIComponent(target.hash.slice(1))
    } catch {
      return value
    }
    if (!target.hash && !wholeDocument)
      return scope.external ? target.href : value
    target.hash = ''
    const local = value.startsWith('#') || target.href === scope.url
    let owner: Scope
    let definition: Element | undefined
    try {
      owner = local ? scope : await loadScope(target.href)
      definition = id
        ? find(owner, id)
        : owner.root.nodeType === Node.DOCUMENT_NODE
          ? (owner.root as Document).documentElement
          : owner.root.nodeType === Node.ELEMENT_NODE
            ? (owner.root as Element)
            : undefined
      if (definition?.namespaceURI !== svgNamespace) definition = undefined
      if (!definition && owner.external)
        throw new Error(`SVG symbol not found: ${target.href}#${id}`)
    } catch (error) {
      task?.check()
      if (error instanceof ResourceResolverError) throw error
      loader.warn(
        Object.freeze({
          code: 'resource-error',
          resource: target.href,
          message: error instanceof Error ? error.message : String(error),
        }),
      )
      return value
    }
    if (!definition) {
      // A previous iframe pass may already have localized this reference.
      return value
    }
    const alias = await copyDefinition(definition, owner)
    return alias ? `#${encodeURIComponent(alias)}` : value
  }
  const paintValue = async (
    value: string,
    original: Element,
    scope: Scope,
    property: string,
  ) => {
    const pattern = /url\(\s*(['"]?)([^'"()]+?)\1\s*\)/g
    let match: RegExpExecArray | null
    let result = ''
    let offset = 0
    while ((match = pattern.exec(value))) {
      let resolved = match[2]
      if (property.startsWith('background') || property === 'cursor') {
        if (scope.external)
          resolved = new URL(resolved, baseFor(original, scope)).href
      } else {
        // eslint-disable-next-line no-await-in-loop
        resolved = await reference(resolved, original, scope)
      }
      result +=
        value.slice(offset, match.index) +
        (resolved === match[2] ? match[0] : `url("${resolved}")`)
      offset = match.index + match[0].length
    }
    return result + value.slice(offset)
  }
  async function visit(node: Element, fallback: Scope): Promise<void> {
    if (visited.has(node)) return
    visited.add(node)
    task?.check()
    await task?.maybeYieldClone()
    const origin = origins.get(node)
    const original = origin?.source || source
    const scope = origin?.scope || fallback
    if (node.namespaceURI === svgNamespace) {
      const href = getSVGReference(node)
      if (href && definitionLinks.has(node.localName))
        setSVGReference(
          node,
          await reference(href, original, scope, node.localName === 'use'),
        )
      else if (
        href &&
        scope.external &&
        ['image', 'feImage'].includes(node.localName)
      )
        setSVGReference(node, new URL(href, baseFor(original, scope)).href)
      const attributes = Array.from(node.attributes)
      for (let index = 0; index < attributes.length; index += 1) {
        const attribute = attributes[index]
        if (paintPropertySet.has(attribute.localName)) {
          // eslint-disable-next-line no-await-in-loop
          attribute.value = await paintValue(
            attribute.value,
            original,
            scope,
            attribute.localName,
          )
        }
      }
    }
    const style = (node as HTMLElement).style
    if (style) {
      for (let index = 0; index < paintProperties.length; index += 1) {
        const property = paintProperties[index]
        if (style.getPropertyValue(property).includes('url(')) {
          // eslint-disable-next-line no-await-in-loop
          const value = await paintValue(
            style.getPropertyValue(property),
            original,
            scope,
            property,
          )
          style.setProperty(
            property,
            value,
            style.getPropertyPriority(property),
          )
        }
      }
    }
    const children = Array.from(node.children)
    for (let index = 0; index < children.length; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await visit(children[index], scope)
    }
  }
  await visit(root, sourceScope)
}
