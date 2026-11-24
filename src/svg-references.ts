import {
  hasDOMProperty,
  readDOMMethod,
  readDOMProperty,
  readOptionalDOMMethod,
  writeDOMProperty,
} from './dom.js'
import { readDocumentMethod, readDocumentProperty } from './document.js'
import type { Options } from './types.js'
import { getResourceLoader } from './dataurl.js'
import { ResourceResolverError } from './resource-loader.js'
import { getTask } from './task.js'
import { getMimeType } from './mimes.js'
import { uuid } from './util.js'
import { getSVGStyleFontCSS } from './embed-webfonts.js'
import {
  prepareSVGFileStyle,
  rewriteSVGStyleURLs,
} from './svg-style-imports.js'
import {
  createSVGStyleEnvironment,
  freezeSVGFragmentStyles,
  svgStyleContextKey,
  snapshotSVGPageStyles,
  type SVGStylePolicy,
} from './svg-style-scope.js'

export const svgNamespace = 'http://www.w3.org/2000/svg'
const xlinkNamespace = 'http://www.w3.org/1999/xlink'
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace'

export function getSVGReference(node: Element) {
  return (
    readDOMMethod(node, 'getAttribute')('href') ??
    readDOMMethod(node, 'getAttributeNS')(xlinkNamespace, 'href') ??
    readDOMMethod(node, 'getAttribute')('xlink:href')
  )
}

export function setSVGReference(node: Element, value: string) {
  readDOMMethod(node, 'setAttribute')('href', value)
  const legacy =
    readDOMMethod(node, 'getAttributeNodeNS')(xlinkNamespace, 'href') ||
    readDOMMethod(node, 'getAttributeNode')('xlink:href')
  if (legacy) writeDOMProperty(legacy, 'value', value)
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
  styleHost?: Element
  stylePolicy?: SVGStylePolicy
  custom?: boolean
  fragmentScope?: Scope
}

export async function embedSVGReferences(
  source: Element,
  root: Element,
  options: Options,
  cloneLocal: (node: Element) => Promise<Element | null>,
) {
  if (
    readDOMProperty(root, 'namespaceURI') !== svgNamespace &&
    !readDOMMethod(root, 'matches')('[style*="url("]') &&
    !readDOMMethod(root, 'querySelector')('svg,[style*="url("]')
  )
    return
  const task = getTask(options)
  const loader = getResourceLoader(options)
  const loadedFontFamilies: string[] = []
  readOptionalDOMMethod(
    readDocumentProperty(readDOMProperty(source, 'ownerDocument'), 'fonts'),
    'forEach',
  )?.((font) => {
    if (readDOMProperty(font, 'status') === 'loaded')
      loadedFontFamilies.push(readDOMProperty(font, 'family'))
  })
  const targetDocument = readDOMProperty(root, 'ownerDocument')
  const pageStyles = snapshotSVGPageStyles(
    readDOMProperty(source, 'ownerDocument'),
    (resource, error) =>
      loader.warn(
        Object.freeze({
          code: 'resource-error',
          resource,
          message:
            'Unable to read native page CSS for an external SVG: ' +
            (error instanceof Error ? error.message : String(error)),
        }),
      ),
  )
  const styleEnvironment = createSVGStyleEnvironment(
    readDOMProperty(source, 'ownerDocument'),
    task?.context.signal,
  )
  const scopes = new Map<Node, Scope>()
  const external = new Map<string, Promise<Scope>>()
  const copies = new Map<Element, Element>()
  const origins = new WeakMap<Element, { source: Element; scope: Scope }>()
  const aliases = new Map<Element, string>()
  const visited = new WeakSet<Element>()
  const primary = new WeakSet<Element>()
  const ids = new Set<string>()
  let definitions: SVGDefsElement | undefined
  let stylePolicy: Promise<SVGStylePolicy | undefined> | undefined
  const styledScopes = new Map<string, Scope>()
  const fragmentRoots = new WeakMap<Node, number>()
  let fragmentSequence = 0
  const fragmentKey = (scope: Scope | undefined) => {
    if (!scope) return 0
    let key = fragmentRoots.get(scope.root)
    if (!key) {
      key = ++fragmentSequence
      fragmentRoots.set(scope.root, key)
    }
    return key
  }
  const nativeInstance = (instance: Element, value: string) => {
    const original = task?.getCloneSource(instance)
    if (
      !original ||
      !readDOMProperty(original, 'isConnected') ||
      readDOMProperty(original, 'localName') !== 'use'
    )
      return false
    try {
      const href = getSVGReference(original)
      if (
        href == null ||
        new URL(href, readDOMProperty(original, 'baseURI')).href !==
          new URL(value, readDOMProperty(original, 'baseURI')).href
      )
        return false
      const box = readDOMMethod(original as SVGUseElement, 'getBBox')()
      return (
        readDOMProperty(box, 'width') > 0 || readDOMProperty(box, 'height') > 0
      )
    } catch {
      return false
    }
  }
  const activeUses = new Map<string, Element>()
  const nativeStylePolicy = () => {
    stylePolicy ||= styleEnvironment
      .measurePolicy(
        () => task?.check(),
        (error) => {
          loader.warn(
            Object.freeze({
              code: 'resource-error',
              resource: 'external-svg-style-import-probe',
              message:
                'Native SVG import capabilities could not be measured; retaining the measured base stylesheet scope: ' +
                (error instanceof Error ? error.message : String(error)),
            }),
          )
        },
        (error) => {
          loader.warn(
            Object.freeze({
              code: 'resource-error',
              resource: 'external-svg-fragment-scope-probe',
              message:
                'Native SVG fragment scope could not be measured; retaining existing fragment definitions: ' +
                (error instanceof Error ? error.message : String(error)),
            }),
          )
        },
      )
      .catch((error) => {
        task?.check()
        // An unavailable optional probe must not discard a valid SVG resource.
        loader.warn(
          Object.freeze({
            code: 'resource-error',
            resource: 'external-svg-style-probe',
            message:
              'Native SVG stylesheet scope could not be measured; retaining existing definition styles: ' +
              (error instanceof Error ? error.message : String(error)),
          }),
        )
        return undefined
      })
    return stylePolicy
  }

  const withoutHash = (value: string) => {
    const url = new URL(value)
    url.hash = ''
    return url.href
  }
  const localScope = (node: Element): Scope => {
    const document = readDOMProperty(node, 'ownerDocument')
    const tree = readDOMMethod(node, 'getRootNode')()
    const root = hasDOMProperty('querySelectorAll', tree)
      ? (tree as Document | DocumentFragment | Element)
      : document
    let scope = scopes.get(root)
    if (!scope) {
      scope = {
        root,
        url: withoutHash(readDocumentProperty(document, 'URL')),
        external: false,
      }
      scopes.set(root, scope)
    }
    return scope
  }
  const find = (scope: Scope, id: string) => {
    if (!scope.ids) {
      scope.ids = new Map()
      const nodes = Array.from(
        readDocumentMethod(scope.root, 'querySelectorAll')('[id]'),
      )
      if (readDocumentProperty(scope.root, 'nodeType') === Node.ELEMENT_NODE)
        nodes.unshift(scope.root as Element)
      nodes.forEach((node) => {
        if (
          readDOMProperty(node, 'id') &&
          !scope.ids!.has(readDOMProperty(node, 'id'))
        )
          scope.ids!.set(readDOMProperty(node, 'id'), node)
      })
    }
    return scope.ids.get(id)
  }
  const sourceScope = localScope(source)
  ;[root, ...Array.from(readDOMMethod(root, 'querySelectorAll')('*'))].forEach(
    (node) => {
      primary.add(node)
      if (readDOMProperty(node, 'id')) ids.add(readDOMProperty(node, 'id'))
      const original = task?.getCloneSource(node)
      if (original) {
        copies.set(original, node)
        origins.set(node, { source: original, scope: localScope(original) })
      }
    },
  )

  const append = (node: Element) => {
    if (!definitions) {
      const holder = readDocumentMethod(targetDocument, 'createElementNS')(
        svgNamespace,
        'svg',
      )
      readDOMMethod(holder, 'setAttribute')('width', '0')
      readDOMMethod(holder, 'setAttribute')('height', '0')
      writeDOMProperty(
        readDOMProperty(holder, 'style'),
        'cssText',
        'position:absolute;overflow:hidden',
      )
      definitions = readDocumentMethod(targetDocument, 'createElementNS')(
        svgNamespace,
        'defs',
      )
      readDOMMethod(holder, 'append')(definitions)
      readDOMMethod(root, 'append')(holder)
    }
    readDOMMethod(definitions, 'append')(node)
  }
  const privateId = () => {
    let id = uuid()
    while (ids.has(id)) id = uuid()
    ids.add(id)
    return id
  }
  const baseFor = (node: Element, scope: Scope) => {
    if (!scope.external) return readDOMProperty(node, 'baseURI')
    const ancestors: Element[] = []
    for (
      let current: Element | null = node;
      current;
      current = readDOMProperty(current, 'parentElement')
    )
      ancestors.unshift(current)
    return ancestors.reduce((base, current) => {
      const value = readDOMMethod(current, 'getAttributeNS')(
        xmlNamespace,
        'base',
      )
      return value ? new URL(value, base).href : base
    }, scope.url)
  }
  const loadScope = (url: string) => {
    let pending = external.get(url)
    if (!pending) {
      pending = (async () => {
        const blob = await loader.load(url, 'image', getMimeType(url))
        const finalURL = loader.responseURL(url, 'image', getMimeType(url))
        const document = new DOMParser().parseFromString(
          await blob.text(),
          'image/svg+xml',
        )
        if (
          readDocumentMethod(document, 'querySelector')('parsererror') ||
          readDOMProperty(
            readDocumentProperty(document, 'documentElement'),
            'namespaceURI',
          ) !== svgNamespace
        )
          throw new Error(`Invalid SVG resource: ${url}`)
        if (!external.has(finalURL)) external.set(finalURL, pending!)
        return {
          root: document,
          url: finalURL,
          external: true,
          custom: loader.isCustomResponse(url, 'image', getMimeType(url)),
        }
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
      // Referenced SVG targets from flattened source trees need a private
      // identity. Preserve unrelated IDs and explicit clone-time ID changes.
      const id =
        readDOMProperty(existing, 'id') &&
        (scope.root === sourceScope.root ||
          readDOMProperty(existing, 'id') !== readDOMProperty(original, 'id'))
          ? readDOMProperty(existing, 'id')
          : privateId()
      writeDOMProperty(existing, 'id', id)
      aliases.set(original, id)
      await visit(existing, scope)
      return id
    }
    const id =
      !scope.external && !ids.has(readDOMProperty(original, 'id'))
        ? readDOMProperty(original, 'id')
        : privateId()
    ids.add(id)
    // Reserve the identity before following edges, so cycles cannot recurse.
    aliases.set(original, id)
    const copy = scope.external
      ? readDocumentMethod(targetDocument, 'importNode')(original, true)
      : await cloneLocal(original)
    if (!copy) return undefined
    if (scope.styleHost && scope.stylePolicy) {
      await freezeSVGFragmentStyles(
        original,
        copy,
        scope.root,
        scope.styleHost,
        await styleEnvironment.getDocument(),
        scope.stylePolicy,
        (text, style) =>
          rewriteSVGStyleURLs(text, (value) => {
            if (value.startsWith('#')) return undefined
            try {
              return new URL(value, baseFor(style, scope)).href
            } catch {
              // Keep invalid URLs and their native CSS fallback values intact.
              return undefined
            }
          }),
        pageStyles,
        (families) =>
          options.fontEmbedCSS != null
            ? Promise.resolve(options.fontEmbedCSS)
            : options.skipFonts
              ? Promise.resolve('')
              : getSVGStyleFontCSS(
                  families,
                  loadedFontFamilies,
                  source,
                  options,
                ),
        (error) => {
          task?.check()
          loader.warn(
            Object.freeze({
              code: 'resource-error',
              resource: 'external-svg-font-metrics',
              message:
                'Unable to load a source font for SVG measurement: ' +
                (error instanceof Error ? error.message : String(error)),
            }),
          )
        },
        async (text) =>
          prepareSVGFileStyle(
            text,
            await styleEnvironment.getDocument(),
            scope.stylePolicy!,
            (url) => loader.load(url, 'stylesheet', 'text/css'),
            async () => {
              task?.check()
              await task?.maybeYieldClone()
            },
            (url, error) => {
              task?.check()
              if (error instanceof ResourceResolverError) throw error
              loader.warn(
                Object.freeze({
                  code: 'resource-error',
                  resource: url,
                  message:
                    error instanceof Error ? error.message : String(error),
                }),
              )
            },
          ),
      )
    }
    readDOMMethod(copy, 'setAttribute')('id', id)
    const register = (native: Element, node: Element) => {
      const old = copies.get(native)
      if (old && !primary.has(old)) {
        readDOMMethod(node, 'replaceWith')(old)
        return
      }
      origins.set(node, { source: native, scope })
      if (!old) copies.set(native, node)
      if (readDOMProperty(native, 'id') && node !== copy) {
        const alias =
          old && primary.has(old)
            ? privateId()
            : aliases.get(native) ||
              (scope.external || ids.has(readDOMProperty(native, 'id'))
                ? privateId()
                : readDOMProperty(native, 'id'))
        ids.add(alias)
        if (!old || !primary.has(old)) aliases.set(native, alias)
        readDOMMethod(node, 'setAttribute')('id', alias)
      }
      if (scope.external) {
        Array.from(readDOMProperty(native, 'children')).forEach(
          (child, index) =>
            register(
              child,
              readDOMProperty(readDOMProperty(node, 'children'), index),
            ),
        )
      }
    }
    register(original, copy)
    if (!scope.external) {
      Array.from(readDOMMethod(copy, 'querySelectorAll')('*')).forEach(
        (node) => {
          const native = task?.getCloneSource(node)
          if (native && readDOMMethod(copy, 'contains')(node))
            register(native, node)
        },
      )
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
    instance?: Element,
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
    const edgeKey = JSON.stringify([target.href, id])
    const active = instance && activeUses.get(edgeKey)
    if (active) {
      const alias = aliases.get(active)
      if (alias) return `#${encodeURIComponent(alias)}`
    }
    let owner: Scope
    let definition: Element | undefined
    try {
      if (instance && wholeDocument && !id && !local) {
        const policy = await nativeStylePolicy()
        if (policy && !policy.whole) return ''
      }
      owner = local
        ? scope
        : target.href === sourceScope.url
          ? sourceScope
          : await loadScope(target.href)
      if (owner.external && instance && owner !== scope) {
        const policy = await nativeStylePolicy()
        if (policy) {
          const fragmentScope = scope.external
            ? scope.fragmentScope
            : !owner.custom || nativeInstance(instance, value)
              ? scope
              : undefined
          const key = JSON.stringify([
            owner.url,
            svgStyleContextKey(instance),
            fragmentKey(fragmentScope),
          ])
          let styled = styledScopes.get(key)
          if (!styled) {
            styled = {
              ...owner,
              root: readDocumentMethod(
                owner.root,
                'cloneNode',
              )(true) as Document,
              ids: undefined,
              styleHost: instance,
              stylePolicy: policy,
              fragmentScope,
            }
            styledScopes.set(key, styled)
          }
          owner = styled
        }
      }
      definition = id
        ? find(owner, id)
        : readDocumentProperty(owner.root, 'nodeType') === Node.DOCUMENT_NODE
          ? readDocumentProperty(owner.root as Document, 'documentElement')
          : readDocumentProperty(owner.root, 'nodeType') === Node.ELEMENT_NODE
            ? (owner.root as Element)
            : undefined
      if (
        !definition ||
        readDOMProperty(definition, 'namespaceURI') !== svgNamespace
      )
        definition = undefined
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
    // Context-specific copies still share a reserved identity on a cyclic path.
    if (instance) activeUses.set(edgeKey, definition)
    try {
      const alias = await copyDefinition(definition, owner)
      return alias ? `#${encodeURIComponent(alias)}` : value
    } finally {
      if (instance) activeUses.delete(edgeKey)
    }
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
        resolved = await reference(
          resolved,
          original,
          scope.external &&
            scope.stylePolicy?.fragment === 'page' &&
            resolved.startsWith('#')
            ? scope.fragmentScope || scope
            : scope,
        )
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
    if (readDOMProperty(node, 'namespaceURI') === svgNamespace) {
      const href = getSVGReference(node)
      if (href && definitionLinks.has(readDOMProperty(node, 'localName')))
        setSVGReference(
          node,
          await reference(
            href,
            original,
            scope,
            readDOMProperty(node, 'localName') === 'use',
            readDOMProperty(node, 'localName') === 'use' ? node : undefined,
          ),
        )
      else if (
        href &&
        scope.external &&
        ['image', 'feImage'].includes(readDOMProperty(node, 'localName'))
      )
        setSVGReference(node, new URL(href, baseFor(original, scope)).href)
      const attributes = Array.from(readDOMProperty(node, 'attributes'))
      for (let index = 0; index < attributes.length; index += 1) {
        const attribute = attributes[index]
        if (paintPropertySet.has(readDOMProperty(attribute, 'localName'))) {
          writeDOMProperty(
            attribute,
            'value',
            // eslint-disable-next-line no-await-in-loop
            await paintValue(
              readDOMProperty(attribute, 'value'),
              original,
              scope,
              readDOMProperty(attribute, 'localName'),
            ),
          )
        }
      }
    }
    const style = readDOMProperty(node as HTMLElement, 'style')
    if (style) {
      for (let index = 0; index < paintProperties.length; index += 1) {
        const property = paintProperties[index]
        if (
          readDOMMethod(style, 'getPropertyValue')(property).includes('url(')
        ) {
          // eslint-disable-next-line no-await-in-loop
          const value = await paintValue(
            readDOMMethod(style, 'getPropertyValue')(property),
            original,
            scope,
            property,
          )
          readDOMMethod(style, 'setProperty')(
            property,
            value,
            readDOMMethod(style, 'getPropertyPriority')(property),
          )
        }
      }
    }
    const children = Array.from(readDOMProperty(node, 'children'))
    for (let index = 0; index < children.length; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await visit(children[index], scope)
    }
  }
  try {
    await visit(root, sourceScope)
  } finally {
    styleEnvironment.dispose()
  }
}
