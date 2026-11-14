export type SVGLayerPolicy = 'none' | 'flat' | 'ordered'

export interface SVGImportPolicy {
  dataImports: boolean
  fileLayers: SVGLayerPolicy
  importLayers: SVGLayerPolicy
}

function ruleHead(text: string) {
  let quote = ''
  let parentheses = 0
  let brackets = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '\\') index++
    else if (quote) {
      if (char === quote) quote = ''
    } else if (char === '"' || char === "'") quote = char
    else if (char === '(') parentheses++
    else if (char === ')') parentheses--
    else if (char === '[') brackets++
    else if (char === ']') brackets--
    else if (char === '{' && !parentheses && !brackets)
      return text.slice(0, index)
  }
  return text
}

async function decodeCSS(blob: Blob, metadata: string, environment: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const decoder = (label: string | undefined) => {
    if (!label) return undefined
    try {
      return new TextDecoder(label)
    } catch {
      return undefined
    }
  }
  let encoding: TextDecoder | undefined
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    encoding = new TextDecoder('utf-8')
  else if (bytes[0] === 0xff && bytes[1] === 0xfe)
    encoding = new TextDecoder('utf-16le')
  else if (bytes[0] === 0xfe && bytes[1] === 0xff)
    encoding = new TextDecoder('utf-16be')
  const charset = /;\s*charset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;\s]*))/i.exec(
    metadata,
  )
  encoding ||= decoder(
    (charset && (charset[1] || charset[2] || charset[3])) || undefined,
  )
  if (!encoding) {
    const prefix = Array.from(bytes.slice(0, 1024), (byte) =>
      String.fromCharCode(byte),
    ).join('')
    const declared = /^@charset "([^"]*)";/.exec(prefix)
    encoding = decoder(declared?.[1])
    if (encoding?.encoding === 'utf-16be' || encoding?.encoding === 'utf-16le')
      encoding = new TextDecoder('utf-8')
  }
  encoding ||= decoder(environment) || new TextDecoder('utf-8')
  return { text: encoding.decode(bytes), encoding: encoding.encoding }
}

export async function prepareSVGFileStyle(
  text: string,
  document: Document,
  policy: SVGImportPolicy,
  load: (url: string) => Promise<Blob>,
  check: () => Promise<void>,
  report: (url: string, error: unknown) => void,
) {
  // An inert parser retains imports without activating their resources. A
  // constructed sheet would remove @import before it could be inspected.
  const parserDocument = document.implementation.createHTMLDocument()
  const view = document.defaultView || window
  const active = new Set<string>()
  const parse = (css: string) => {
    const style = parserDocument.createElement('style')
    style.textContent = css
    parserDocument.head.append(style)
    return style
  }
  const resolveURLs = (css: string, base: string) =>
    css.replace(
      /url\(\s*(['"]?)([^'"()]+?)\1\s*\)/g,
      (match, quote, value: string) => {
        try {
          return `url("${new URL(value, base).href}")`
        } catch {
          return match
        }
      },
    )
  const visit = async (
    rules: CSSRuleList,
    layers: SVGLayerPolicy,
    base?: string,
    encoding = document.characterSet,
  ): Promise<string> => {
    const result: string[] = []
    for (let index = 0; index < rules.length; index++) {
      // eslint-disable-next-line no-await-in-loop
      await check()
      const rule = rules[index]
      if (rule.type === CSSRule.IMPORT_RULE) {
        const imported = rule as CSSImportRule & {
          layerName?: string | null
          supportsText?: string | null
        }
        if (!policy.dataImports || !/^data:/i.test(imported.href)) continue
        const media = imported.media.mediaText
        if (media && !view.matchMedia(media).matches) continue
        const supports = imported.supportsText
        if (supports && !view.CSS.supports(`(${supports})`)) continue
        const layer = imported.layerName
        if (layer != null && policy.importLayers === 'none') continue
        const url = new URL(imported.href)
        url.hash = ''
        if (active.has(url.href)) continue
        active.add(url.href)
        try {
          // eslint-disable-next-line no-await-in-loop
          const blob = await load(url.href)
          const metadata = blob.type || url.href.slice(5).split(',')[0]
          const mime = metadata.split(';')[0].trim().toLowerCase()
          if (mime !== 'text/css') continue
          // eslint-disable-next-line no-await-in-loop
          const decoded = await decodeCSS(blob, metadata, encoding)
          const parser = parse(decoded.text)
          try {
            // eslint-disable-next-line no-await-in-loop
            let css = await visit(
              parser.sheet!.cssRules,
              policy.fileLayers,
              url.href,
              decoded.encoding,
            )
            if (layer != null && policy.importLayers === 'ordered')
              css = `@layer ${layer}{${css}}`
            if (supports) css = `@supports (${supports}){${css}}`
            if (media && media !== 'all') css = `@media ${media}{${css}}`
            result.push(css)
          } finally {
            parser.remove()
          }
        } catch (error) {
          report(url.href, error)
        } finally {
          active.delete(url.href)
        }
      } else if (rule.type === CSSRule.STYLE_RULE) {
        // Modern style rules also expose cssRules for CSS nesting; their own
        // declarations must not be mistaken for an empty grouping rule.
        result.push(base ? resolveURLs(rule.cssText, base) : rule.cssText)
      } else if (/^@layer\b/i.test(rule.cssText)) {
        if (layers === 'none') continue
        if ('cssRules' in rule) {
          // eslint-disable-next-line no-await-in-loop
          const css = await visit(
            (rule as CSSGroupingRule).cssRules,
            layers,
            base,
            encoding,
          )
          result.push(
            layers === 'flat' ? css : `${ruleHead(rule.cssText)}{${css}}`,
          )
        } else if (layers === 'ordered') result.push(rule.cssText)
      } else if ('cssRules' in rule) {
        // eslint-disable-next-line no-await-in-loop
        const css = await visit(
          (rule as CSSGroupingRule).cssRules,
          layers,
          base,
          encoding,
        )
        result.push(`${ruleHead(rule.cssText)}{${css}}`)
      } else result.push(base ? resolveURLs(rule.cssText, base) : rule.cssText)
    }
    return result.join('\n')
  }
  const parser = parse(text)
  try {
    return await visit(parser.sheet!.cssRules, policy.fileLayers)
  } finally {
    parser.remove()
  }
}
