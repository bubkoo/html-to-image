import {
  hasDOMProperty,
  readDOMMethod,
  readDOMProperty,
  writeDOMProperty,
} from './dom.js'
import type { Options } from './types.js'
import { getTask, type CaptureTask } from './task.js'
import { getResourceLoader } from './dataurl.js'
import {
  ResourceResolverError,
  type ResourceLoader,
} from './resource-loader.js'
import { getStyleProperties, uuid } from './util.js'
import { decodeCSS, rewriteSVGStyleURLs } from './svg-style-imports.js'
import { resolveNestedSelector } from './css-nesting.js'

const parts = [
  'scrollbar',
  'scrollbar-thumb',
  'scrollbar-track',
  'scrollbar-track-piece',
  'scrollbar-button',
  'scrollbar-corner',
  'resizer',
]

export function freezeScrollbarPresence(
  source: HTMLElement,
  clone: HTMLElement,
  sourceStyle?: CSSStyleDeclaration,
) {
  // Preserve a source auto bar that already occupies this axis. In an SVG
  // image, an auto bar can otherwise paint its fallback before its image is ready.
  if (!sourceStyle) return
  const style = readDOMProperty(clone, 'style')
  const border = (name: string) =>
    parseFloat(readDOMMethod(sourceStyle, 'getPropertyValue')(name)) || 0
  const axes = [
    [
      'overflowX',
      'scrollWidth',
      'clientWidth',
      'offsetHeight',
      'clientHeight',
      'border-top-width',
      'border-bottom-width',
    ],
    [
      'overflowY',
      'scrollHeight',
      'clientHeight',
      'offsetWidth',
      'clientWidth',
      'border-left-width',
      'border-right-width',
    ],
  ] as const
  axes.forEach(
    ([overflow, extent, client, offset, crossClient, start, end]) => {
      if (readDOMProperty(style, overflow) !== 'auto') return
      if (readDOMProperty(source, extent) <= readDOMProperty(source, client))
        return
      // Integer offset/client metrics can round fractional borders differently.
      // The upper border bound prevents a border from proving bar occupancy.
      const occupied =
        readDOMProperty(source, offset) -
        readDOMProperty(source, crossClient) -
        Math.ceil(border(start) + border(end))
      if (occupied > 0) writeDOMProperty(style, overflow, 'scroll')
    },
  )
}

export async function cloneScrollbarStyles(
  source: HTMLElement,
  clone: HTMLElement,
  options: Options,
  selected?: readonly string[],
) {
  const style = readDOMProperty(clone, 'style')
  if (
    !style ||
    selected?.length === 0 ||
    !['auto', 'scroll'].some(
      (value) =>
        readDOMProperty(style, 'overflowX') === value ||
        readDOMProperty(style, 'overflowY') === value,
    ) ||
    readDOMProperty(style, 'scrollbarWidth') === 'none'
  )
    return
  const view =
    readDOMProperty(readDOMProperty(source, 'ownerDocument'), 'defaultView') ||
    window
  if (
    !readDOMMethod(
      readDOMProperty(view, 'CSS'),
      'supports',
    )('selector(::-webkit-scrollbar)')
  )
    return
  // Non-auto standard properties override the legacy pseudo family. Their
  // values are already frozen by the normal element style copy.
  if (
    (readDOMProperty(style, 'scrollbarWidth') &&
      readDOMProperty(style, 'scrollbarWidth') !== 'auto') ||
    (readDOMProperty(style, 'scrollbarColor') &&
      readDOMProperty(style, 'scrollbarColor') !== 'auto')
  )
    return
  const rules: string[] = []
  const id = uuid()
  const cache = scrollbarCache(options)
  let authoredRules: string
  try {
    authoredRules = await scrollbarRules(
      source,
      clone,
      id,
      options,
      cache,
      selected,
    )
  } finally {
    if (!getTask(options)) cache.release()
  }
  if (authoredRules) rules.push(authoredRules)
  else
    parts.forEach((part) => {
      const computed = readDOMMethod(view, 'getComputedStyle')(
        source,
        `::-webkit-${part}`,
      )
      // Merely creating a rule for an unstyled button/track piece can make that
      // native part exist. Copy authored paint/geometry, not default empty parts.
      const painted =
        readDOMProperty(computed, 'backgroundImage') !== 'none' ||
        !['rgba(0, 0, 0, 0)', 'transparent', ''].includes(
          readDOMProperty(computed, 'backgroundColor'),
        ) ||
        readDOMProperty(computed, 'boxShadow') !== 'none' ||
        [
          readDOMProperty(computed, 'width'),
          readDOMProperty(computed, 'height'),
        ].some((value) => value && value !== 'auto') ||
        readDOMProperty(computed, 'display') === 'none' ||
        ['top', 'right', 'bottom', 'left'].some(
          (side) =>
            parseFloat(
              readDOMMethod(
                computed,
                'getPropertyValue',
              )(`border-${side}-width`),
            ) > 0,
        )
      if (!readDOMProperty(computed, 'length') || !painted) return
      const names = getStyleProperties(computed, selected).filter((name) => {
        const value = readDOMMethod(computed, 'getPropertyValue')(name)
        return name === 'width' || name === 'height'
          ? value !== 'auto'
          : name === 'background-color'
            ? !['transparent', 'rgba(0, 0, 0, 0)'].includes(value)
            : name === 'background-image' || name === 'box-shadow'
              ? value !== 'none'
              : name === 'display' && value === 'none'
      })
      const text = names
        .filter((name) => !selected || selected.includes(name))
        .map(
          (name) =>
            `${name}:${readDOMMethod(computed, 'getPropertyValue')(name)};`,
        )
        .join('')
      if (!text) return
      rules.push(`:where(.${id})::-webkit-${part}{${text}}`)
    })
  if (!rules.length) return
  readDOMMethod(readDOMProperty(clone, 'classList'), 'add')(id)
  const task = getTask(options)
  if (task) task.addClonedStyle(rules.join('\n'), `.${id}`)
  else {
    const sheet = readDOMMethod(
      readDOMProperty(clone, 'ownerDocument'),
      'createElement',
    )('style')
    writeDOMProperty(sheet, 'textContent', rules.join('\n'))
    readDOMMethod(clone, 'append')(sheet)
  }
}

interface StyleDeclarationSnapshot {
  name: string
  value: string
  priority: string
}

type RuleSnapshot =
  | {
      kind: 'style'
      selector: string
      declarations: StyleDeclarationSnapshot[]
      rules: RuleSnapshot[]
    }
  | { kind: 'declarations'; declarations: StyleDeclarationSnapshot[] }
  | {
      kind: 'import'
      href: string
      layer: string | null
      supports: string | null
      media: string
      sheet?: SheetSnapshot
    }
  | {
      kind: 'group'
      head: string
      condition?: 'media' | 'supports'
      text?: string
      rules: RuleSnapshot[]
    }
  | { kind: 'text'; text: string }

interface SheetSnapshot {
  href: string | null
  base: string
  encoding: string
  media: string
  disabled: boolean
  rules?: RuleSnapshot[]
  unreadable?: string
}

interface StylesheetCache {
  signal: AbortSignal
  closed: boolean
  remote: Map<string, Promise<{ blob: Blob; base: string }>>
  decoded: Map<
    string,
    Promise<{ text: string; encoding: string; base: string }>
  >
  parsed: Map<string, Promise<SheetSnapshot>>
  warned: Set<string>
  release: () => void
}

// Only capture-local promises and primitive snapshots live here. In particular,
// do not cache a native sheet, rule, source element or its owner document.
const stylesheetCaches = new WeakMap<CaptureTask, StylesheetCache>()
const stylesheetRoots = new WeakMap<CaptureTask, number>()

function scrollbarCache(options: Options): StylesheetCache {
  const task = getTask(options)
  const existing = task && stylesheetCaches.get(task)
  if (existing) return existing
  const signal =
    task?.context.signal || options.signal || new AbortController().signal
  const cache: StylesheetCache = {
    signal,
    closed: false,
    remote: new Map(),
    decoded: new Map(),
    parsed: new Map(),
    warned: new Set(),
    release: () => {
      cache.closed = true
      cache.remote.clear()
      cache.decoded.clear()
      cache.parsed.clear()
      cache.warned.clear()
      signal.removeEventListener('abort', cache.release)
      if (task && stylesheetCaches.get(task) === cache)
        stylesheetCaches.delete(task)
    },
  }
  signal.addEventListener('abort', cache.release, { once: true })
  if (task) stylesheetCaches.set(task, cache)
  return cache
}

export function beginScrollbarStyleScope(options: Options) {
  const task = getTask(options)
  if (!task) return () => {}
  stylesheetRoots.set(task, (stylesheetRoots.get(task) || 0) + 1)
  return () => {
    const remaining = (stylesheetRoots.get(task) || 1) - 1
    if (remaining > 0) stylesheetRoots.set(task, remaining)
    else {
      stylesheetRoots.delete(task)
      stylesheetCaches.get(task)?.release()
    }
  }
}

function checkStylesheetCache(cache: StylesheetCache) {
  if (cache.signal.aborted) throw cache.signal.reason
  if (cache.closed)
    throw new Error('Scrollbar stylesheet snapshot was released')
}

function takeSheetSnapshot(
  sheet: CSSStyleSheet,
  base: string,
  encoding: string,
  active = new Set<CSSStyleSheet>(),
  live = true,
): SheetSnapshot {
  const href = readDOMProperty(sheet, 'href')
  const value: SheetSnapshot = {
    href,
    base: href || base,
    encoding,
    media: readDOMProperty(readDOMProperty(sheet, 'media'), 'mediaText'),
    disabled: readDOMProperty(sheet, 'disabled'),
  }
  if (active.has(sheet)) return { ...value, rules: [] }
  active.add(sheet)
  try {
    value.rules = takeRulesSnapshot(
      readDOMProperty(sheet, 'cssRules'),
      value.base,
      encoding,
      active,
      live,
    )
  } catch (error) {
    value.unreadable = error instanceof Error ? error.message : String(error)
  } finally {
    active.delete(sheet)
  }
  return value
}

function takeRulesSnapshot(
  rules: CSSRuleList,
  base: string,
  encoding: string,
  active: Set<CSSStyleSheet>,
  live: boolean,
): RuleSnapshot[] {
  return Array.from(rules).map((rule): RuleSnapshot => {
    const type = readDOMProperty(rule, 'type')
    // CSSStyleRule also exposes cssRules for nesting. Its declarations must
    // not be mistaken for an empty grouping rule.
    if (type === CSSRule.STYLE_RULE) {
      const styleRule = rule as CSSStyleRule
      const style = readDOMProperty(styleRule, 'style')
      return {
        kind: 'style',
        selector: readDOMProperty(styleRule, 'selectorText'),
        declarations: takeDeclarations(style),
        rules: readDOMProperty(styleRule, 'cssRules')
          ? takeRulesSnapshot(
              readDOMProperty(styleRule, 'cssRules'),
              base,
              encoding,
              active,
              live,
            )
          : [],
      }
    }
    if (type === CSSRule.IMPORT_RULE) {
      const imported = rule as CSSImportRule
      const child = live ? readDOMProperty(imported, 'styleSheet') : undefined
      return {
        kind: 'import',
        href: readDOMProperty(imported, 'href'),
        layer: readDOMProperty(imported, 'layerName'),
        supports: readDOMProperty(imported, 'supportsText'),
        media: readDOMProperty(readDOMProperty(imported, 'media'), 'mediaText'),
        sheet: child
          ? takeSheetSnapshot(child, base, encoding, active, true)
          : undefined,
      }
    }
    // CSSNestedDeclarations has no selector/cssRules and currently reports
    // type 0. Its implicit selector is the complete containing style rule,
    // including a pseudo-element that cannot be wrapped in :is().
    if (type === 0 && hasDOMProperty('style', rule))
      return {
        kind: 'declarations',
        declarations: takeDeclarations(
          readDOMProperty(
            rule as CSSRule & { style: CSSStyleDeclaration },
            'style',
          ),
        ),
      }
    const text = readDOMProperty(rule, 'cssText')
    if (hasDOMProperty('cssRules', rule)) {
      return {
        kind: 'group',
        head: text.slice(0, text.indexOf('{')),
        condition:
          type === CSSRule.MEDIA_RULE
            ? 'media'
            : type === CSSRule.SUPPORTS_RULE
              ? 'supports'
              : undefined,
        text:
          type === CSSRule.MEDIA_RULE
            ? readDOMProperty(rule as CSSMediaRule, 'conditionText')
            : type === CSSRule.SUPPORTS_RULE
              ? readDOMProperty(rule as CSSSupportsRule, 'conditionText')
              : undefined,
        rules: takeRulesSnapshot(
          readDOMProperty(rule as CSSGroupingRule, 'cssRules'),
          base,
          encoding,
          active,
          live,
        ),
      }
    }
    return { kind: 'text', text }
  })
}

function takeDeclarations(style: CSSStyleDeclaration) {
  return Array.from(style, (name) => ({
    name,
    value: readDOMMethod(style, 'getPropertyValue')(name),
    priority: readDOMMethod(style, 'getPropertyPriority')(name),
  }))
}

function hasRelativeStyleURL(value: string): boolean {
  let relative = false
  rewriteSVGStyleURLs(value, (url) => {
    if (!url.startsWith('#')) {
      try {
        new URL(url)
      } catch {
        relative = true
      }
    }
    return undefined
  })
  return relative
}

function remoteStylesheet(
  url: string,
  loader: ResourceLoader,
  cache: StylesheetCache,
) {
  let pending = cache.remote.get(url)
  if (!pending) {
    pending = (async () => {
      const blob = await loader.load(url, 'stylesheet')
      checkStylesheetCache(cache)
      return { blob, base: loader.responseURL(url, 'stylesheet') }
    })()
    cache.remote.set(url, pending)
  }
  return pending
}

function decodedStylesheet(
  url: string,
  encoding: string,
  loader: ResourceLoader,
  cache: StylesheetCache,
) {
  const key = JSON.stringify([url, encoding])
  let pending = cache.decoded.get(key)
  if (!pending) {
    pending = (async () => {
      const { blob, base } = await remoteStylesheet(url, loader, cache)
      const decoded = await decodeStylesheet(blob, encoding, cache.signal)
      checkStylesheetCache(cache)
      return { ...decoded, base }
    })()
    cache.decoded.set(key, pending)
  }
  return pending
}

async function decodeStylesheet(
  blob: Blob,
  encoding: string,
  signal: AbortSignal,
) {
  if (signal.aborted) throw signal.reason
  let onAbort = () => {}
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
  })
  try {
    // A resolver's Blob can defer its byte read. Let source-owning collector
    // frames unwind on abort; the losing decode retains only bytes/encoding.
    return await Promise.race([decodeCSS(blob, blob.type, encoding), aborted])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

async function parseRemoteStylesheet(
  url: string,
  encoding: string,
  ownedDocument: Document,
  loader: ResourceLoader,
  cache: StylesheetCache,
) {
  const key = JSON.stringify([url, encoding])
  let pending = cache.parsed.get(key)
  if (!pending) {
    pending = (async () => {
      const decoded = await decodedStylesheet(url, encoding, loader, cache)
      const parserDocument = readDOMMethod(
        readDOMProperty(ownedDocument, 'implementation'),
        'createHTMLDocument',
      )()
      const parser = readDOMMethod(parserDocument, 'createElement')('style')
      writeDOMProperty(parser, 'textContent', decoded.text)
      readDOMMethod(readDOMProperty(parserDocument, 'head'), 'append')(parser)
      try {
        const sheet = readDOMProperty(parser, 'sheet')
        if (!sheet)
          throw new Error('Stylesheet parser did not create a CSS sheet')
        return takeSheetSnapshot(
          sheet,
          decoded.base,
          decoded.encoding,
          new Set(),
          false,
        )
      } finally {
        readDOMMethod(parser, 'remove')()
      }
    })()
    cache.parsed.set(key, pending)
  }
  return pending
}

// Native scrollbar parts have state (orientation, track side, button state)
// that getComputedStyle(element, pseudo) does not expose. Preserve those
// selectors and let the native renderer resolve their state in the snapshot.
async function scrollbarRules(
  source: HTMLElement,
  clone: HTMLElement,
  id: string,
  options: Options,
  cache: StylesheetCache,
  selected?: readonly string[],
) {
  const root = readDOMMethod(source, 'getRootNode')() as Document | ShadowRoot
  const document = readDOMProperty(source, 'ownerDocument')
  const sheets =
    root === document
      ? Array.from(readDOMProperty(document, 'styleSheets'))
      : Array.from(readDOMMethod(root, 'querySelectorAll')('style,link'))
          .map((node) => readDOMProperty(node as HTMLStyleElement, 'sheet'))
          .filter((sheet): sheet is CSSStyleSheet => !!sheet)
  sheets.push(...Array.from(readDOMProperty(root, 'adoptedStyleSheets') || []))
  const base = readDOMProperty(source, 'baseURI')
  const encoding = readDOMProperty(document, 'characterSet')
  // Snapshot native CSSOM before awaiting a foreign resolver. The cached
  // result is made only of strings; later capture results retain no source DOM.
  const snapshots = sheets.map((sheet) =>
    takeSheetSnapshot(sheet, base, encoding),
  )
  const ownedDocument = readDOMProperty(clone, 'ownerDocument')
  const view = readDOMProperty(document, 'defaultView') || window
  const loader = getResourceLoader(options)
  const active = new Set<string>()
  let matched = false
  const report = (url: string, error: unknown) => {
    checkStylesheetCache(cache)
    if (error instanceof ResourceResolverError) throw error
    if (cache.warned.has(url)) return
    cache.warned.add(url)
    loader.warn(
      Object.freeze({
        code: 'resource-error',
        resource: url,
        message:
          'Native scrollbar stylesheet could not be fully read: ' +
          (error instanceof Error ? error.message : String(error)),
      }),
    )
  }
  const mediaMatches = (media: string) =>
    !media ||
    readDOMProperty(readDOMMethod(view, 'matchMedia')(media), 'matches')
  const supports = (condition: string) =>
    readDOMMethod(readDOMProperty(view, 'CSS'), 'supports')(condition) ||
    readDOMMethod(readDOMProperty(view, 'CSS'), 'supports')(`(${condition})`)
  const selectorsFor = (text: string) =>
    splitSelectors(text).flatMap((selector) => {
      const marker = scrollbarMarker(selector)
      if (!marker) return []
      let prefix = selector.slice(0, marker.offset) || '*'
      if (/\s$|[>+~]$/.test(prefix)) prefix += '*'
      try {
        if (!readDOMMethod(source, 'matches')(prefix)) return []
      } catch {
        return []
      }
      return [
        `:is(:where(.${id}),${prefix}:not(*))${selector.slice(marker.offset)}`,
      ]
    })
  const needsFinalBase = (rules: RuleSnapshot[], parent = ''): boolean =>
    rules.some((rule) => {
      if (rule.kind === 'style') {
        const selector = parent
          ? resolveNestedSelector(rule.selector, parent)
          : rule.selector
        return (
          (selectorsFor(selector).length > 0 &&
            rule.declarations.some(({ value }) =>
              hasRelativeStyleURL(value),
            )) ||
          needsFinalBase(rule.rules, selector)
        )
      }
      if (rule.kind === 'declarations')
        return (
          selectorsFor(parent).length > 0 &&
          rule.declarations.some(({ value }) => hasRelativeStyleURL(value))
        )
      if (rule.kind === 'group') {
        if (rule.condition === 'media' && !mediaMatches(rule.text || ''))
          return false
        if (rule.condition === 'supports' && !supports(rule.text || ''))
          return false
        return needsFinalBase(rule.rules, parent)
      }
      if (
        rule.kind !== 'import' ||
        (rule.supports && !supports(rule.supports)) ||
        !mediaMatches(rule.media)
      )
        return false
      // A native imported sheet already carries its browser-resolved URL. Only
      // an unresolved relative import needs the parent's response directory.
      if (rule.sheet?.href) return false
      try {
        new URL(rule.href)
        return false
      } catch {
        return true
      }
    })
  const needsEncoding = (rules: RuleSnapshot[]): boolean =>
    rules.some((rule) => {
      if (rule.kind === 'style') return needsEncoding(rule.rules)
      if (rule.kind === 'group') {
        if (rule.condition === 'media' && !mediaMatches(rule.text || ''))
          return false
        if (rule.condition === 'supports' && !supports(rule.text || ''))
          return false
        return needsEncoding(rule.rules)
      }
      if (
        rule.kind !== 'import' ||
        (rule.supports && !supports(rule.supports)) ||
        !mediaMatches(rule.media) ||
        rule.sheet?.disabled ||
        (rule.sheet && !mediaMatches(rule.sheet.media))
      )
        return false
      return !rule.sheet?.rules || needsEncoding(rule.sheet.rules)
    })
  const visit = async (
    rules: RuleSnapshot[],
    ruleBase: string,
    charset: string,
    parent = '',
  ): Promise<string> => {
    const values: string[] = []
    for (let index = 0; index < rules.length; index++) {
      checkStylesheetCache(cache)
      const rule = rules[index]
      if (rule.kind === 'style' || rule.kind === 'declarations') {
        const selector =
          rule.kind === 'declarations'
            ? parent
            : parent
              ? resolveNestedSelector(rule.selector, parent)
              : rule.selector
        const selectors = selectorsFor(selector)
        const declarations = rule.declarations
          .filter(({ name }) => !selected || selected.includes(name))
          .map(({ name, value, priority }) => {
            const resolved = rewriteSVGStyleURLs(value, (url) => {
              if (url.startsWith('#')) return undefined
              try {
                return new URL(url, ruleBase).href
              } catch {
                return undefined
              }
            })
            return `${name}:${resolved}${priority ? '!' + priority : ''};`
          })
          .join('')
        if (selectors.length && declarations) {
          matched = true
          values.push(`${selectors.join(',')}{${declarations}}`)
        }

        if (rule.kind === 'style' && rule.rules.length) {
          // eslint-disable-next-line no-await-in-loop
          const css = await visit(rule.rules, ruleBase, charset, selector)
          if (css) values.push(css)
        }
      } else if (rule.kind === 'import') {
        if (
          (rule.supports && !supports(rule.supports)) ||
          !mediaMatches(rule.media)
        )
          continue
        let href: string
        try {
          href = new URL(rule.href, ruleBase).href
        } catch (error) {
          report(rule.href, error)
          continue
        }
        // Native imported CSSOM remains authoritative when readable. Otherwise
        // the import must use the parent's actual final response directory.
        const sheet = rule.sheet || {
          href,
          base: href,
          encoding: charset,
          media: '',
          disabled: false,
        }
        // eslint-disable-next-line no-await-in-loop
        const css = await visitSheet(sheet, charset)
        values.push(rule.layer != null ? `@layer ${rule.layer}{${css}}` : css)
      } else if (rule.kind === 'group') {
        if (rule.condition === 'media' && !mediaMatches(rule.text || ''))
          continue
        if (rule.condition === 'supports' && !supports(rule.text || ''))
          continue
        // eslint-disable-next-line no-await-in-loop
        const css = await visit(rule.rules, ruleBase, charset, parent)
        if (css) values.push(rule.condition ? css : `${rule.head}{${css}}`)
      } else if (rule.text.startsWith('@layer ')) values.push(rule.text)
    }
    return values.join('\n')
  }
  const visitSheet = async (
    snapshot: SheetSnapshot,
    inheritedEncoding = snapshot.encoding,
  ): Promise<string> => {
    if (snapshot.disabled || !mediaMatches(snapshot.media)) return ''
    if (snapshot.href && active.has(snapshot.href)) return ''
    let sheet = { ...snapshot, encoding: inheritedEncoding }
    try {
      if (!sheet.rules) {
        if (!sheet.href)
          throw new Error(
            sheet.unreadable ||
              'Unreadable native stylesheet has no resource URL',
          )
        sheet = await parseRemoteStylesheet(
          sheet.href,
          sheet.encoding,
          ownedDocument,
          loader,
          cache,
        )
      } else if (sheet.href && needsEncoding(sheet.rules)) {
        // CSSOM already decoded its strings, but does not expose that encoding.
        // An opaque descendant needs the actual parent's encoding even when its
        // import href is absolute. Keep live rules and read only byte metadata.
        const response = await decodedStylesheet(
          sheet.href,
          inheritedEncoding,
          loader,
          cache,
        )
        sheet = { ...sheet, base: response.base, encoding: response.encoding }
      } else if (sheet.href && needsFinalBase(sheet.rules)) {
        // CSSStyleSheet.href can remain the pre-redirect URL. Keep live CSSOM
        // edits while taking only response-base metadata from the loader.
        const response = await remoteStylesheet(sheet.href, loader, cache)
        sheet = { ...sheet, base: response.base }
      }
    } catch (error) {
      report(snapshot.href || snapshot.base, error)
      return ''
    }
    // Only transport/decoding belongs to the diagnostic catch above. A child
    // diagnostic can invoke user code; its error must not be reclassified as a
    // parent fetch failure or swallowed by a second warning.
    checkStylesheetCache(cache)
    if (active.has(sheet.base)) return ''
    active.add(sheet.base)
    try {
      return await visit(sheet.rules || [], sheet.base, sheet.encoding)
    } finally {
      active.delete(sheet.base)
    }
  }
  const result: string[] = []
  for (let index = 0; index < snapshots.length; index++) {
    // eslint-disable-next-line no-await-in-loop
    result.push(await visitSheet(snapshots[index]))
  }
  return matched ? result.join('\n') : ''
}

function scrollbarMarker(selector: string) {
  let quote = '',
    bracket = 0,
    escaped = false
  for (let offset = 0; offset < selector.length; offset++) {
    const char = selector[offset]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === String.fromCharCode(92)) {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '[') bracket++
    if (char === ']') bracket--
    if (bracket || !selector.startsWith('::-webkit-', offset)) continue
    const part = parts.find((name) => {
      const end = offset + '::-webkit-'.length + name.length
      return (
        selector.startsWith(name, offset + '::-webkit-'.length) &&
        (end === selector.length || selector[end] === ':')
      )
    })
    if (part) return { offset, part }
  }
  return undefined
}

function splitSelectors(text: string) {
  const result: string[] = []
  let start = 0,
    depth = 0,
    quote = '',
    escaped = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === String.fromCharCode(92)) {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '(' || char === '[') depth++
    if (char === ')' || char === ']') depth--
    if (char === ',' && !depth) {
      result.push(text.slice(start, i))
      start = i + 1
    }
  }
  result.push(text.slice(start))
  return result.map((selector) => selector.trim())
}
