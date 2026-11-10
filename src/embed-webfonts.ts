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
      if (rule.type === CSSRule.STYLE_RULE) {
        addUsed(
          scope,
          (rule as CSSStyleRule).style.getPropertyValue('font-family'),
        )
      } else if ('cssRules' in rule) {
        visitStyleRules(scope, (rule as CSSGroupingRule).cssRules)
      }
    })
  }
  const visit = (element: Element, inherited: Element) => {
    const original =
      task?.getCloneSource(element) ||
      (element.ownerDocument.defaultView ? element : inherited)
    const document = original.ownerDocument
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
    const inline = (element as HTMLElement).style?.getPropertyValue(
      'font-family',
    )
    const family =
      inline ||
      (element.ownerDocument.defaultView || window)
        .getComputedStyle(element)
        .getPropertyValue('font-family')
    addUsed(scope, family)
    if (element.tagName.toLowerCase() === 'style') {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(element.textContent || '')
      scope.styles.push({ node: element, sheet, baseURL: original.baseURI })
      visitStyleRules(scope, sheet.cssRules)
    }
    Array.from(element.children).forEach((child) => visit(child, original))
    if (element.shadowRoot) {
      Array.from(element.shadowRoot.children).forEach((child) =>
        visit(child, original),
      )
    }
    if (isInstanceOfElement(element, HTMLIFrameElement)) {
      let body: HTMLElement | null = null
      try {
        body = element.contentDocument?.body || null
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
  const ownerDocument = node.ownerDocument
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
    for (let i = 0; i < items.length; i += 1) {
      getTask(options)?.check()
      const rule = items[i]
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const style = (rule as CSSFontFaceRule).style
        if (style.getPropertyValue('src')) {
          rules.push({
            cssText: rule.cssText,
            family: normalizeFontFamily(style.getPropertyValue('font-family')),
            baseURL,
          })
        }
      } else if (rule.type === CSSRule.IMPORT_RULE) {
        const imported = rule as CSSImportRule
        // eslint-disable-next-line no-await-in-loop
        if (imported.styleSheet) await visitSheet(imported.styleSheet, baseURL)
        // eslint-disable-next-line no-await-in-loop
        else await visitRemote(new URL(imported.href, baseURL).href)
      } else if ('cssRules' in rule) {
        // Grouping rules include @media, @supports and @layer.
        // eslint-disable-next-line no-await-in-loop
        await visitRules((rule as CSSGroupingRule).cssRules, baseURL)
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
      sheet.replaceSync(text)
      await visitRules(sheet.cssRules, url)
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
    const base = sheet.href || baseURL
    let items: CSSRuleList
    try {
      items = sheet.cssRules
    } catch (error) {
      if (sheet.href) await visitRemote(sheet.href)
      else report(base, error)
      return
    }
    await visitRules(items, base)
  }

  const sheets = new Map<CSSStyleSheet, string>()
  const addSheet = (sheet: CSSStyleSheet) =>
    sheets.set(sheet, ownerDocument.baseURI)
  Array.from(ownerDocument.styleSheets).forEach(addSheet)
  Array.from(ownerDocument.adoptedStyleSheets || []).forEach(addSheet)
  // Shadow roots are flattened by the cloner; their rules belong to this document.
  const collectShadowSheets = (element: Element) => {
    const shadow = element.shadowRoot
    if (shadow) {
      Array.from(shadow.adoptedStyleSheets || []).forEach(addSheet)
      shadow.querySelectorAll('style,link').forEach((element) => {
        const sheet = (element as HTMLStyleElement).sheet
        if (sheet) addSheet(sheet)
      })
      Array.from(shadow.children).forEach(collectShadowSheets)
    }
    Array.from(element.children).forEach(collectShadowSheets)
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
          if (scope.source.ownerDocument !== source.ownerDocument) {
            const name = scopedFontName(scope.source.ownerDocument, rule.family)
            scope.names.set(rule.family, name)
            const copy = new CSSStyleSheet()
            copy.replaceSync(cssText)
            const descriptors = (copy.cssRules[0] as CSSFontFaceRule).style
            // Firefox exposes read-only face descriptors; construct a new rule.
            const rest = Array.from(descriptors)
              .filter((property) => property !== 'font-family')
              .map(
                (property) =>
                  `${property}: ${descriptors.getPropertyValue(property)};`,
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
      const value = style.getPropertyValue('font-family')
      if (!value) return false
      let changed = false
      const names = fontFamilies(value).map((family) => {
        const name = scope.names.get(normalizeFontFamily(family))
        if (!name) return family
        changed = true
        return name
      })
      if (changed)
        style.setProperty(
          'font-family',
          names.join(', '),
          style.getPropertyPriority('font-family'),
        )
      return changed
    }
    scope.nodes.forEach((node) => {
      const style = (node as HTMLElement).style
      if (style) rename(style)
    })
    scope.styles.forEach(({ node, sheet }) => {
      const visit = (parent: CSSStyleSheet | CSSGroupingRule): boolean => {
        let changed = false
        for (let i = parent.cssRules.length - 1; i >= 0; i -= 1) {
          const rule = parent.cssRules[i]
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            // Only the embedded/explicit font CSS may supply faces in the copy.
            parent.deleteRule(i)
            changed = true
          } else if (rule.type === CSSRule.STYLE_RULE) {
            changed = rename((rule as CSSStyleRule).style) || changed
          } else if ('cssRules' in rule) {
            changed = visit(rule as CSSGroupingRule) || changed
          }
        }
        return changed
      }
      if (visit(sheet))
        node.textContent = Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n')
    })
  })
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
  styleSource: Element = node,
): Promise<string> {
  if (!node.ownerDocument)
    throw new Error('Provided element is not within a Document')
  return (await prepareFontCSS(node, options, styleSource)).cssText
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
    scopes = collectFontScopes(clonedNode, styleSource, options)
    scopes.forEach((scope) => {
      if (scope.source.ownerDocument === styleSource.ownerDocument) return
      scope.used.forEach((family) => {
        const name = scopedFontName(scope.source.ownerDocument, family)
        if (cssText.includes(name)) scope.names.set(family, name)
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
    const style = clonedNode.ownerDocument.createElement('style')
    style.textContent = cssText
    clonedNode.insertBefore(style, clonedNode.firstChild)
  }
}
