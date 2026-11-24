import { readDocumentProperty } from './document.js'
export type SVGLayerPolicy = 'none' | 'flat' | 'ordered'

export interface SVGImportPolicy {
  dataImports: boolean
  fileLayers: SVGLayerPolicy
  importLayers: SVGLayerPolicy
}

export function rewriteSVGStyleURLs(
  text: string,
  resolve: (value: string) => string | undefined,
) {
  // Quoted data URLs can contain literal url(...) text. Visit CSS tokens rather
  // than rewriting such text inside strings or comments as another resource.
  text = text.split('\u0000').join('\ufffd')
  let result = ''
  let start = 0
  const quotedEnd = (index: number) => {
    const quote = text[index++]
    let closed = false
    while (index < text.length) {
      if (text[index] === '\\')
        index += text[index + 1] === '\r' && text[index + 2] === '\n' ? 3 : 2
      else if (/[\r\n\f]/.test(text[index])) break
      else if (text[index++] === quote) {
        closed = true
        break
      }
    }
    return { end: Math.min(index, text.length), closed }
  }
  for (let index = 0; index < text.length;) {
    if (text.slice(index, index + 2) === '/*') {
      const end = text.indexOf('*/', index + 2)
      index = end < 0 ? text.length : end + 2
    } else if (text[index] === '"' || text[index] === "'") {
      index = quotedEnd(index).end
    } else if (
      text.slice(index, index + 4).toLowerCase() === 'url(' &&
      (index === 0 || !/[\w\\\u0080-\uffff-]/.test(text[index - 1]))
    ) {
      let cursor = index + 4
      while (/[ \t\r\n\f]/.test(text[cursor] || '') && cursor < text.length)
        cursor++
      const quoted = text[cursor] === '"' || text[cursor] === "'"
      const valueStart = cursor + (quoted ? 1 : 0)
      let valueEnd: number
      let valid = true
      if (quoted) {
        const end = quotedEnd(cursor)
        cursor = end.end
        valid = end.closed
        valueEnd = cursor - 1
        while (/[ \t\r\n\f]/.test(text[cursor] || '') && cursor < text.length)
          cursor++
      } else {
        while (cursor < text.length && text[cursor] !== ')') {
          const char = text[cursor]
          if (char === '\\') {
            const escape =
              /^\\(?:[0-9a-f]{1,6}(?:\r\n|[ \t\r\n\f])?|[^\r\n\f])/i.exec(
                text.slice(cursor),
              )
            if (!escape) valid = false
            cursor += escape?.[0].length || 1
          } else if (/[ \t\r\n\f]/.test(char)) {
            while (
              /[ \t\r\n\f]/.test(text[cursor] || '') &&
              cursor < text.length
            )
              cursor++
            if (text[cursor] !== ')') valid = false
          } else {
            if (
              /["'(]/.test(char) ||
              char.charCodeAt(0) < 0x20 ||
              char.charCodeAt(0) === 0x7f
            )
              valid = false
            cursor++
          }
        }
        valueEnd = cursor
      }
      if (!valid && text[cursor] === ')') {
        index = cursor + 1
        continue
      }
      if (text[cursor] === ')' && valid) {
        const raw = quoted
          ? text.slice(valueStart, valueEnd)
          : text
              .slice(valueStart, valueEnd)
              .replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '')
        const value = raw.replace(
          /\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|(\r\n|[\r\n\f])|([\s\S]))/gi,
          (match, hex, newline, char) => {
            if (hex) {
              const point = parseInt(hex, 16)
              return String.fromCodePoint(
                !point ||
                  point > 0x10ffff ||
                  (point >= 0xd800 && point <= 0xdfff)
                  ? 0xfffd
                  : point,
              )
            }
            return newline ? '' : char
          },
        )
        const replacement = resolve(value)
        if (replacement !== undefined) {
          result +=
            text.slice(start, index) + `url(${JSON.stringify(replacement)})`
          start = cursor + 1
        }
        index = cursor + 1
      } else index++
    } else index++
  }
  return result + text.slice(start)
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
  const parserDocument = readDocumentProperty(
    document,
    'implementation',
  ).createHTMLDocument()
  const view = readDocumentProperty(document, 'defaultView') || window
  const active = new Set<string>()
  const parse = (css: string) => {
    const style = Reflect.apply(
      readDocumentProperty(parserDocument, 'createElement'),
      parserDocument,
      ['style'],
    ) as HTMLStyleElement
    style.textContent = css
    readDocumentProperty(parserDocument, 'head').append(style)
    return style
  }
  const resolveURLs = (css: string, base: string) =>
    rewriteSVGStyleURLs(css, (value) => {
      if (value.startsWith('#')) return undefined
      try {
        return new URL(value, base).href
      } catch {
        // Imported data CSS has an opaque base. Keep an unresolvable URL
        // invalid instead of giving it the measurement document's HTTP base.
        return 'about:invalid'
      }
    })
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
