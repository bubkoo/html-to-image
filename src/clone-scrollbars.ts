import type { Options } from './types.js'
import { getTask } from './task.js'
import { getStyleProperties, uuid } from './util.js'

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
  const { style } = clone
  if (
    !style ||
    selected?.length === 0 ||
    !['auto', 'scroll'].some(
      (value) => style.overflowX === value || style.overflowY === value,
    ) ||
    style.scrollbarWidth === 'none'
  )
    return
  const view = source.ownerDocument.defaultView || window
  if (!view.CSS.supports('selector(::-webkit-scrollbar)')) return
  // Non-auto standard properties override the legacy pseudo family. Their
  // values are already frozen by the normal element style copy.
  if (
    (style.scrollbarWidth && style.scrollbarWidth !== 'auto') ||
    (style.scrollbarColor && style.scrollbarColor !== 'auto')
  )
    return
  const rules: string[] = []
  const id = uuid()
  parts.forEach((part) => {
    const computed = view.getComputedStyle(source, `::-webkit-${part}`)
    // Merely creating a rule for an unstyled button/track piece can make that
    // native part exist. Copy authored paint/geometry, not default empty parts.
    const painted =
      computed.backgroundImage !== 'none' ||
      !['rgba(0, 0, 0, 0)', 'transparent', ''].includes(
        computed.backgroundColor,
      ) ||
      computed.boxShadow !== 'none' ||
      [computed.width, computed.height].some(
        (value) => value && value !== 'auto',
      ) ||
      computed.display === 'none' ||
      ['top', 'right', 'bottom', 'left'].some(
        (side) =>
          parseFloat(computed.getPropertyValue(`border-${side}-width`)) > 0,
      )
    if (!computed.length || !painted) return
    const authored = scrollbarProperties(source, part)
    const names = authored.size
      ? [...authored]
      : getStyleProperties(computed, selected).filter((name) => {
          const value = computed.getPropertyValue(name)
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
      .map((name) => `${name}:${computed.getPropertyValue(name)};`)
      .join('')
    if (!text) return
    rules.push(`:where(.${id})::-webkit-${part}{${text}}`)
  })
  if (!rules.length) return
  clone.classList.add(id)
  const task = getTask(options)
  if (task) task.addClonedStyle(rules.join('\n'), `.${id}`)
  else {
    const sheet = clone.ownerDocument.createElement('style')
    sheet.textContent = rules.join('\n')
    clone.append(sheet)
  }
}

// Freeze declarations that actually belong to this pseudo. CSSOM also returns
// normal-element initial values for native parts; explicitly assigning those
// values can change intrinsic thumb sizing or create formerly absent buttons.
function scrollbarProperties(source: HTMLElement, part: string) {
  const root = source.getRootNode() as Document | ShadowRoot
  const sheets =
    root === source.ownerDocument
      ? Array.from(source.ownerDocument.styleSheets)
      : Array.from(root.querySelectorAll('style,link'))
          .map((node) => (node as HTMLStyleElement).sheet)
          .filter((sheet): sheet is CSSStyleSheet => !!sheet)
  sheets.push(...Array.from(root.adoptedStyleSheets || []))
  const names = new Set<string>()
  const view = source.ownerDocument.defaultView || window
  const visited = new Set<CSSStyleSheet>()
  const visit = (rules: CSSRuleList) =>
    Array.from(rules).forEach((rule) => {
      if (
        rule.type === CSSRule.MEDIA_RULE &&
        !view.matchMedia((rule as CSSMediaRule).conditionText).matches
      )
        return
      if (
        rule.type === CSSRule.SUPPORTS_RULE &&
        !view.CSS.supports((rule as CSSSupportsRule).conditionText)
      )
        return
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule
        splitSelectors(styleRule.selectorText).forEach((selector) => {
          const marker = `::-webkit-${part}`
          const offset = selector.indexOf(marker)
          if (offset < 0 || selector.slice(offset + marker.length).trim())
            return
          let prefix = selector.slice(0, offset) || '*'
          if (/\s$|[>+~]$/.test(prefix)) prefix += '*'
          try {
            if (source.matches(prefix))
              Array.from(styleRule.style).forEach((name) => names.add(name))
          } catch {
            /* Unavailable selector contexts keep the computed fallback. */
          }
        })
      }
      if (rule.type === CSSRule.IMPORT_RULE)
        visitSheet((rule as CSSImportRule).styleSheet)
      else if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules)
    })
  const visitSheet = (sheet: CSSStyleSheet | null) => {
    if (!sheet || visited.has(sheet)) return
    visited.add(sheet)
    try {
      visit(sheet.cssRules)
    } catch {
      /* Cross-origin rules are not readable. */
    }
  }
  sheets.forEach(visitSheet)
  return names
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
