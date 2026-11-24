import {
  hasDOMProperty,
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
import { getResourceLoader } from './dataurl.js'
import { embedResources } from './embed-resources.js'
import { getTask } from './task.js'
import { isInstanceOfElement, uuid } from './util.js'

interface FontRule {
  cssText: string
  family: string
  baseURL: string
}

// Stable per-document names let getFontEmbedCSS() be reused for the same roots.
// Weak keys retain neither source documents nor response/configuration caches.
const documentFontNames = new WeakMap<Document, string>()

function fontFamilies(value: string): string[] {
  const result: string[] = []
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]
    if (char === '\\') i += 1
    else if (quote) {
      if (char === quote) quote = ''
    } else if (char === '"' || char === "'") quote = char
    else if (char === ',') {
      result.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  result.push(value.slice(start).trim())
  return result.filter(Boolean)
}

function normalizeFontFamily(font: string) {
  const raw = font.trim()
  const name = /^(["']).*\1$/.test(raw)
    ? raw.slice(1, -1)
    : raw.replace(/\s+/g, ' ')
  return name
    .replace(/\\([0-9a-f]{1,6}\s?|[\s\S])/gi, (_, escaped: string) => {
      const code = /^[0-9a-f]/i.test(escaped)
        ? parseInt(escaped, 16)
        : undefined
      if (code === undefined) return escaped
      return String.fromCodePoint(code > 0 && code <= 0x10ffff ? code : 0xfffd)
    })
    .toLowerCase()
}

function scopedFontName(document: Document, family: string) {
  let id = documentFontNames.get(document)
  if (!id) {
    id = uuid()
    documentFontNames.set(document, id)
  }
  // Encoding the family avoids retaining an ever-growing family-name cache.
  const encoded = Array.from(family, (char) =>
    char.codePointAt(0)!.toString(16),
  ).join('-')
  return `hti-font-${id}-${encoded}`
}

interface FontStyle {
  node: Element
  sheet: CSSStyleSheet
  baseURL: string
}

interface FontScope {
  source: Element
  nodes: Element[]
  styles: FontStyle[]
  used: Set<string>
  names: Map<string, string>
}

function collectFontScopes(node: Element, source: Element, options: Options) {
  const scopes = new Map<Document, FontScope>()
  const task = getTask(options)
  const addUsed = (scope: FontScope, value: string) => {
    fontFamilies(value).forEach((family) =>
      scope.used.add(normalizeFontFamily(family)),
    )
  }
  const visitStyleRules = (scope: FontScope, rules: CSSRuleList) => {
    Array.from(rules).forEach((rule) => {
      if (readDOMProperty(rule, 'type') === CSSRule.STYLE_RULE) {
        addUsed(
          scope,
          readDOMMethod(
            readDOMProperty(rule as CSSStyleRule, 'style'),
            'getPropertyValue',
          )('font-family'),
        )
      } else if (hasDOMProperty('cssRules', rule)) {
        visitStyleRules(
          scope,
          readDOMProperty(rule as CSSGroupingRule, 'cssRules'),
        )
      }
    })
  }
  const visit = (element: Element, inherited: Element) => {
    const original =
      task?.getCloneSource(element) ||
      (readDocumentProperty(
        readDOMProperty(element, 'ownerDocument'),
        'defaultView',
      )
        ? element
        : inherited)
    const document = readDOMProperty(original, 'ownerDocument')
    let scope = scopes.get(document)
    if (!scope) {
      scope = {
        source: original,
        nodes: [],
        styles: [],
        used: new Set(),
        names: new Map(),
      }
      scopes.set(document, scope)
    }
    scope.nodes.push(element)
    const inline = readOptionalDOMMethod(
      readDOMProperty(element as HTMLElement, 'style'),
      'getPropertyValue',
    )?.('font-family')
    const family =
      inline ||
      readDOMMethod(
        readDOMMethod(
          readDocumentProperty(
            readDOMProperty(element, 'ownerDocument'),
            'defaultView',
          ) || window,
          'getComputedStyle',
        )(element),
        'getPropertyValue',
      )('font-family')
    addUsed(scope, family)
    if (readDOMProperty(element, 'tagName').toLowerCase() === 'style') {
      const sheet = new CSSStyleSheet()
      readDOMMethod(
        sheet,
        'replaceSync',
      )(readDOMProperty(element, 'textContent') || '')
      scope.styles.push({
        node: element,
        sheet,
        baseURL: readDOMProperty(original, 'baseURI'),
      })
      visitStyleRules(scope, readDOMProperty(sheet, 'cssRules'))
    }
    Array.from(readDOMProperty(element, 'children')).forEach((child) =>
      visit(child, original),
    )
    if (readDOMProperty(element, 'shadowRoot')) {
      Array.from(
        readDOMProperty(readDOMProperty(element, 'shadowRoot')!, 'children'),
      ).forEach((child) => visit(child, original))
    }
    if (isInstanceOfElement(element, HTMLIFrameElement)) {
      let body: HTMLElement | null = null
      try {
        body =
          readOptionalDocumentProperty(
            readDOMProperty(element, 'contentDocument'),
            'body',
          ) || null
      } catch {
        // An inaccessible frame has no reachable font scope.
      }
      if (body) visit(body, body)
    }
  }
  visit(node, source)
  return Array.from(scopes.values())
}

async function collectFontRules(
  node: Element,
  options: Options,
  extra: FontStyle[],
) {
  const ownerDocument = readDOMProperty(node, 'ownerDocument')
  const loader = getResourceLoader(options)
  const rules: FontRule[] = []
  const visited = new Set<CSSStyleSheet>()
  const fetched = new Set<string>()

  const report = (url: string, error: unknown) => {
    getTask(options)?.check()
    // A custom resolver failure is a caller error, not a missing font.
    if (error instanceof Error && error.name === 'ResourceResolverError')
      throw error
    loader.warn(
      Object.freeze({
        code: 'resource-error',
        resource: url,
        message: error instanceof Error ? error.message : String(error),
      }),
    )
  }

  const visitRules = async (
    items: CSSRuleList,
    baseURL: string,
  ): Promise<void> => {
    for (let i = 0; i < readDOMProperty(items, 'length'); i += 1) {
      getTask(options)?.check()
      const rule = readDOMProperty(items, i)
      if (readDOMProperty(rule, 'type') === CSSRule.FONT_FACE_RULE) {
        const style = readDOMProperty(rule as CSSFontFaceRule, 'style')
        if (readDOMMethod(style, 'getPropertyValue')('src')) {
          rules.push({
            cssText: readDOMProperty(rule, 'cssText'),
            family: normalizeFontFamily(
              readDOMMethod(style, 'getPropertyValue')('font-family'),
            ),
            baseURL,
          })
        }
      } else if (readDOMProperty(rule, 'type') === CSSRule.IMPORT_RULE) {
        const imported = rule as CSSImportRule
        if (readDOMProperty(imported, 'styleSheet')) {
          // eslint-disable-next-line no-await-in-loop
          await visitSheet(readDOMProperty(imported, 'styleSheet')!, baseURL)
        } else {
          // eslint-disable-next-line no-await-in-loop
          await visitRemote(
            new URL(readDOMProperty(imported, 'href'), baseURL).href,
          )
        }
      } else if (hasDOMProperty('cssRules', rule)) {
        // Grouping rules include @media, @supports and @layer.
        // eslint-disable-next-line no-await-in-loop
        await visitRules(
          readDOMProperty(rule as CSSGroupingRule, 'cssRules'),
          baseURL,
        )
      }
    }
  }

  const visitRemote = async (url: string): Promise<void> => {
    if (fetched.has(url)) return
    fetched.add(url)
    try {
      const css = await (await loader.load(url, 'stylesheet')).text()
      getTask(options)?.check()
      // Constructed sheets are detached: never insert rules into the live page.
      const sheet = new CSSStyleSheet()
      const imports: string[] = []
      const text = css.replace(
        /@import\s+(?:url\(\s*(['"]?)(.*?)\1\s*\)|(['"])(.*?)\3)[^;]*;/gi,
        (match, quote, path, stringQuote, stringPath) => {
          imports.push(new URL(path || stringPath, url).href)
          return ''
        },
      )
      readDOMMethod(sheet, 'replaceSync')(text)
      await visitRules(readDOMProperty(sheet, 'cssRules'), url)
      for (let i = 0; i < imports.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await visitRemote(imports[i])
      }
    } catch (error) {
      report(url, error)
    }
  }

  const visitSheet = async (
    sheet: CSSStyleSheet,
    baseURL: string,
  ): Promise<void> => {
    if (visited.has(sheet)) return
    visited.add(sheet)
    const base = readDOMProperty(sheet, 'href') || baseURL
    let items: CSSRuleList
    try {
      items = readDOMProperty(sheet, 'cssRules')
    } catch (error) {
      if (readDOMProperty(sheet, 'href'))
        await visitRemote(readDOMProperty(sheet, 'href')!)
      else report(base, error)
      return
    }
    await visitRules(items, base)
  }

  const sheets = new Map<CSSStyleSheet, string>()
  const addSheet = (sheet: CSSStyleSheet) =>
    sheets.set(sheet, readDocumentProperty(ownerDocument, 'baseURI'))
  Array.from(readDocumentProperty(ownerDocument, 'styleSheets')).forEach(
    addSheet,
  )
  Array.from(
    readDocumentProperty(ownerDocument, 'adoptedStyleSheets') || [],
  ).forEach(addSheet)
  // Shadow roots are flattened by the cloner; their rules belong to this document.
  const collectShadowSheets = (element: Element) => {
    const shadow = readDOMProperty(element, 'shadowRoot')
    if (shadow) {
      Array.from(readDOMProperty(shadow, 'adoptedStyleSheets') || []).forEach(
        addSheet,
      )
      readDOMMethod(
        readDOMMethod(shadow, 'querySelectorAll')('style,link'),
        'forEach',
      )((element) => {
        const sheet = readDOMProperty(element as HTMLStyleElement, 'sheet')
        if (sheet) addSheet(sheet)
      })
      Array.from(readDOMProperty(shadow, 'children')).forEach(
        collectShadowSheets,
      )
    }
    Array.from(readDOMProperty(element, 'children')).forEach(
      collectShadowSheets,
    )
  }
  collectShadowSheets(node)
  extra.forEach(({ sheet, baseURL }) => sheets.set(sheet, baseURL))
  const collected = Array.from(sheets)
  for (let i = 0; i < collected.length; i += 1) {
    const [sheet, baseURL] = collected[i]
    // eslint-disable-next-line no-await-in-loop
    await visitSheet(sheet, baseURL)
  }
  return rules
}

async function prepareFontCSS(
  node: Element,
  options: Options,
  source: Element,
) {
  const scopes = collectFontScopes(node, source, options)
  const css = await Promise.all(
    scopes.map(async (scope) => {
      const rules = await collectFontRules(scope.source, options, scope.styles)
      const unique = new Set<string>()
      const used = rules.filter((rule) => {
        const identity = JSON.stringify([rule.cssText, rule.baseURL])
        if (!scope.used.has(rule.family) || unique.has(identity)) return false
        unique.add(identity)
        return true
      })
      return Promise.all(
        used.map((rule) => {
          let { cssText } = rule
          if (
            readDOMProperty(scope.source, 'ownerDocument') !==
            readDOMProperty(source, 'ownerDocument')
          ) {
            const name = scopedFontName(
              readDOMProperty(scope.source, 'ownerDocument'),
              rule.family,
            )
            scope.names.set(rule.family, name)
            const copy = new CSSStyleSheet()
            readDOMMethod(copy, 'replaceSync')(cssText)
            const descriptors = readDOMProperty(
              readDOMProperty(
                readDOMProperty(copy, 'cssRules'),
                0,
              ) as CSSFontFaceRule,
              'style',
            )
            // Firefox exposes read-only face descriptors; construct a new rule.
            const rest = Array.from(descriptors)
              .filter((property) => property !== 'font-family')
              .map(
                (property) =>
                  `${property}: ${readDOMMethod(descriptors, 'getPropertyValue')(property)};`,
              )
              .join(' ')
            cssText = `@font-face { font-family: ${name}; ${rest} }`
          }
          return embedResources(cssText, rule.baseURL, options, 'font')
        }),
      )
    }),
  )
  return { cssText: css.map((rules) => rules.join('\n')).join('\n'), scopes }
}

function applyFontScopes(scopes: FontScope[]) {
  scopes.forEach((scope) => {
    const rename = (style: CSSStyleDeclaration) => {
      const value = readDOMMethod(style, 'getPropertyValue')('font-family')
      if (!value) return false
      let changed = false
      const names = fontFamilies(value).map((family) => {
        const name = scope.names.get(normalizeFontFamily(family))
        if (!name) return family
        changed = true
        return name
      })
      if (changed)
        readDOMMethod(style, 'setProperty')(
          'font-family',
          names.join(', '),
          readDOMMethod(style, 'getPropertyPriority')('font-family'),
        )
      return changed
    }
    scope.nodes.forEach((node) => {
      const style = readDOMProperty(node as HTMLElement, 'style')
      if (style) rename(style)
    })
    scope.styles.forEach(({ node, sheet }) => {
      const visit = (parent: CSSStyleSheet | CSSGroupingRule): boolean => {
        let changed = false
        for (
          let i =
            readDOMProperty(readDOMProperty(parent, 'cssRules'), 'length') - 1;
          i >= 0;
          i -= 1
        ) {
          const rule = readDOMProperty(readDOMProperty(parent, 'cssRules'), i)
          if (readDOMProperty(rule, 'type') === CSSRule.FONT_FACE_RULE) {
            // Only the embedded/explicit font CSS may supply faces in the copy.
            readDOMMethod(parent, 'deleteRule')(i)
            changed = true
          } else if (readDOMProperty(rule, 'type') === CSSRule.STYLE_RULE) {
            changed =
              rename(readDOMProperty(rule as CSSStyleRule, 'style')) || changed
          } else if (hasDOMProperty('cssRules', rule)) {
            changed = visit(rule as CSSGroupingRule) || changed
          }
        }
        return changed
      }
      if (visit(sheet))
        writeDOMProperty(
          node,
          'textContent',
          Array.from(readDOMProperty(sheet, 'cssRules'))
            .map((rule) => readDOMProperty(rule, 'cssText'))
            .join('\n'),
        )
    })
  })
}

function declaredFontFamilies(cssText: string) {
  const sheet = new CSSStyleSheet()
  readDOMMethod(sheet, 'replaceSync')(cssText)
  const names = new Set<string>()
  const visit = (rules: CSSRuleList) => {
    Array.from(rules).forEach((rule) => {
      if (readDOMProperty(rule, 'type') === CSSRule.FONT_FACE_RULE) {
        names.add(
          normalizeFontFamily(
            readDOMMethod(
              readDOMProperty(rule as CSSFontFaceRule, 'style'),
              'getPropertyValue',
            )('font-family'),
          ),
        )
      } else if (hasDOMProperty('cssRules', rule)) {
        visit(readDOMProperty(rule as CSSGroupingRule, 'cssRules'))
      }
    })
  }
  visit(readDOMProperty(sheet, 'cssRules'))
  return names
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
  styleSource: Element = node,
): Promise<string> {
  if (!readDOMProperty(node, 'ownerDocument'))
    throw new Error('Provided element is not within a Document')
  return (await prepareFontCSS(node, options, styleSource)).cssText
}

export function getSVGStyleFontCSS(
  families: readonly string[],
  loadedFamilies: readonly string[],
  source: Element,
  options: Options,
) {
  // Only source-page families that were already loaded may affect measurement.
  // Do not activate @font-face declarations supplied by fetched SVG content.
  const loaded = new Set(loadedFamilies.map(normalizeFontFamily))
  const document = readDOMMethod(
    readDocumentProperty(
      readDOMProperty(source, 'ownerDocument'),
      'implementation',
    ),
    'createHTMLDocument',
  )()
  const node = Reflect.apply(
    readDocumentProperty(document, 'createElement'),
    document,
    ['div'],
  ) as HTMLDivElement
  families.forEach((value) => {
    const used = fontFamilies(value).filter((name) =>
      loaded.has(normalizeFontFamily(name)),
    )
    if (used.length) {
      const span = Reflect.apply(
        readDocumentProperty(document, 'createElement'),
        document,
        ['span'],
      ) as HTMLSpanElement
      writeDOMProperty(
        readDOMProperty(span, 'style'),
        'fontFamily',
        used.join(', '),
      )
      readDOMMethod(node, 'append')(span)
    }
  })
  return readDOMProperty(node, 'childElementCount')
    ? getWebFontCSS(node, options, source)
    : Promise.resolve('')
}

export async function embedWebFonts<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  styleSource: Element = clonedNode,
) {
  if (options.skipFonts && options.fontEmbedCSS == null) return
  let cssText: string
  let scopes: FontScope[]
  if (options.fontEmbedCSS != null) {
    cssText = options.fontEmbedCSS
    const declared = declaredFontFamilies(cssText)
    scopes = collectFontScopes(clonedNode, styleSource, options)
    scopes.forEach((scope) => {
      if (
        readDOMProperty(scope.source, 'ownerDocument') ===
        readDOMProperty(styleSource, 'ownerDocument')
      )
        return
      scope.used.forEach((family) => {
        const name = scopedFontName(
          readDOMProperty(scope.source, 'ownerDocument'),
          family,
        )
        if (declared.has(normalizeFontFamily(name)))
          scope.names.set(family, name)
      })
    })
  } else {
    ;({ cssText, scopes } = await prepareFontCSS(
      clonedNode,
      options,
      styleSource,
    ))
  }
  getTask(options)?.check()
  applyFontScopes(scopes)
  if (cssText) {
    const style = readDocumentMethod(
      readDOMProperty(clonedNode, 'ownerDocument'),
      'createElement',
    )('style')
    writeDOMProperty(style, 'textContent', cssText)
    readDOMMethod(clonedNode, 'insertBefore')(
      style,
      readDOMProperty(clonedNode, 'firstChild'),
    )
  }
}
