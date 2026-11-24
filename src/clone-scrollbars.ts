import {
  hasDOMProperty,
  readDOMMethod,
  readDOMProperty,
  writeDOMProperty,
} from './dom.js'
import type { Options } from './types.js'
import { getTask } from './task.js'
import { getStyleProperties, uuid } from './util.js'
import { rewriteSVGStyleURLs } from './svg-style-imports.js'

const parts = [
  'scrollbar',
  'scrollbar-thumb',
  'scrollbar-track',
  'scrollbar-track-piece',
  'scrollbar-button',
  'scrollbar-corner',
  'resizer',
]

export function cloneScrollbarStyles(
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
  const authoredRules = scrollbarRules(source, id, selected)
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

// Native scrollbar parts have state (orientation, track side, button state)
// that getComputedStyle(element, pseudo) does not expose. Preserve those
// selectors and let the native renderer resolve their state in the snapshot.
function scrollbarRules(
  source: HTMLElement,
  id: string,
  selected?: readonly string[],
) {
  const root = readDOMMethod(source, 'getRootNode')() as Document | ShadowRoot
  const sheets =
    root === readDOMProperty(source, 'ownerDocument')
      ? Array.from(
          readDOMProperty(
            readDOMProperty(source, 'ownerDocument'),
            'styleSheets',
          ),
        )
      : Array.from(readDOMMethod(root, 'querySelectorAll')('style,link'))
          .map((node) => readDOMProperty(node as HTMLStyleElement, 'sheet'))
          .filter((sheet): sheet is CSSStyleSheet => !!sheet)
  sheets.push(...Array.from(readDOMProperty(root, 'adoptedStyleSheets') || []))
  const view =
    readDOMProperty(readDOMProperty(source, 'ownerDocument'), 'defaultView') ||
    window
  const active = new Set<CSSStyleSheet>()
  let matched = false
  const visit = (rules: CSSRuleList, base: string): string =>
    Array.from(rules)
      .map((rule): string => {
        if (readDOMProperty(rule, 'type') === CSSRule.MEDIA_RULE)
          return readDOMProperty(
            readDOMMethod(
              view,
              'matchMedia',
            )(readDOMProperty(rule as CSSMediaRule, 'conditionText')),
            'matches',
          )
            ? visit(readDOMProperty(rule as CSSMediaRule, 'cssRules'), base)
            : ''
        if (readDOMProperty(rule, 'type') === CSSRule.SUPPORTS_RULE)
          return readDOMMethod(
            readDOMProperty(view, 'CSS'),
            'supports',
          )(readDOMProperty(rule as CSSSupportsRule, 'conditionText'))
            ? visit(readDOMProperty(rule as CSSSupportsRule, 'cssRules'), base)
            : ''
        if (readDOMProperty(rule, 'type') === CSSRule.STYLE_RULE) {
          const styleRule = rule as CSSStyleRule
          const selectors = splitSelectors(
            readDOMProperty(styleRule, 'selectorText'),
          ).flatMap((selector) => {
            const marker = scrollbarMarker(selector)
            if (!marker) return []
            let prefix = selector.slice(0, marker.offset) || '*'
            if (/\s$|[>+~]$/.test(prefix)) prefix += '*'
            try {
              if (!readDOMMethod(source, 'matches')(prefix)) return []
            } catch {
              return []
            }
            // The never-matching branch retains the original prefix specificity.
            // :where scopes the live branch without adding another class weight.
            return [
              `:is(:where(.${id}),${prefix}:not(*))${selector.slice(marker.offset)}`,
            ]
          })
          if (!selectors.length) return ''
          const declarations = Array.from(readDOMProperty(styleRule, 'style'))
            .filter((name) => !selected || selected.includes(name))
            .map((name) => {
              const value = rewriteSVGStyleURLs(
                readDOMMethod(
                  readDOMProperty(styleRule, 'style'),
                  'getPropertyValue',
                )(name),
                (url) => {
                  if (url.startsWith('#')) return undefined
                  try {
                    return new URL(url, base).href
                  } catch {
                    return undefined
                  }
                },
              )
              const priority = readDOMMethod(
                readDOMProperty(styleRule, 'style'),
                'getPropertyPriority',
              )(name)
              return `${name}:${value}${priority ? '!' + priority : ''};`
            })
            .join('')
          if (!declarations) return ''
          matched = true
          return `${selectors.join(',')}{${declarations}}`
        }
        if (readDOMProperty(rule, 'type') === CSSRule.IMPORT_RULE) {
          const imported = rule as CSSImportRule
          if (
            readDOMProperty(imported, 'supportsText') &&
            !readDOMMethod(
              readDOMProperty(view, 'CSS'),
              'supports',
            )(readDOMProperty(imported, 'supportsText')!)
          )
            return ''
          if (
            readDOMProperty(readDOMProperty(imported, 'media'), 'mediaText') &&
            !readDOMProperty(
              readDOMMethod(
                view,
                'matchMedia',
              )(
                readDOMProperty(
                  readDOMProperty(imported, 'media'),
                  'mediaText',
                ),
              ),
              'matches',
            )
          )
            return ''
          const value = visitSheet(readDOMProperty(imported, 'styleSheet'))
          return readDOMProperty(imported, 'layerName') != null
            ? `@layer ${readDOMProperty(imported, 'layerName')}{${value}}`
            : value
        }
        if (hasDOMProperty('cssRules', rule)) {
          const body = visit(
            readDOMProperty(rule as CSSGroupingRule, 'cssRules'),
            base,
          )
          return body
            ? `${readDOMProperty(rule, 'cssText').slice(0, readDOMProperty(rule, 'cssText').indexOf('{'))}{${body}}`
            : ''
        }
        // Layer-order statements still affect rules in other blocks/sheets.
        return readDOMProperty(rule, 'cssText').startsWith('@layer ')
          ? readDOMProperty(rule, 'cssText')
          : ''
      })
      .join('\n')
  const visitSheet = (sheet: CSSStyleSheet | null): string => {
    if (!sheet || active.has(sheet) || readDOMProperty(sheet, 'disabled'))
      return ''
    if (
      readDOMProperty(readDOMProperty(sheet, 'media'), 'mediaText') &&
      !readDOMProperty(
        readDOMMethod(
          view,
          'matchMedia',
        )(readDOMProperty(readDOMProperty(sheet, 'media'), 'mediaText')),
        'matches',
      )
    )
      return ''
    active.add(sheet)
    try {
      return visit(
        readDOMProperty(sheet, 'cssRules'),
        readDOMProperty(sheet, 'href') || readDOMProperty(source, 'baseURI'),
      )
    } catch {
      return ''
    } finally {
      // Unreadable sheets retain the computed-style fallback.
      active.delete(sheet)
    }
  }
  const result = sheets.map(visitSheet).join('\n')
  return matched ? result : ''
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
