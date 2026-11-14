import { uuid } from './util.js'

export interface SVGStylePolicy {
  file: boolean
  page: boolean
  whole: boolean
}

function pageStyleText(
  document: Document,
  unavailable: (url: string, error: unknown) => void,
) {
  const resolve = (text: string, base: string) =>
    text.replace(
      /url\(\s*(['"]?)([^'"()]+?)\1\s*\)/g,
      (match, quote, value: string) => {
        try {
          return `url("${new URL(value, base).href}")`
        } catch {
          return match
        }
      },
    )
  const active = new Set<CSSStyleSheet>()
  const read = (sheet: CSSStyleSheet): string => {
    if (sheet.disabled) return ''
    if (active.has(sheet)) return ''
    const base = sheet.href || document.baseURI
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch (error) {
      unavailable(base, error)
      return ''
    }
    active.add(sheet)
    let text: string
    try {
      text = Array.from(rules, (rule) => {
        if (rule.type === CSSRule.IMPORT_RULE) {
          const imported = rule as CSSImportRule & {
            layerName?: string | null
            supportsText?: string | null
          }
          if (!imported.styleSheet) {
            unavailable(
              imported.href,
              new Error('Native page stylesheet import is not readable'),
            )
            return ''
          }
          let value = read(imported.styleSheet)
          if (imported.layerName != null)
            value = `@layer ${imported.layerName}{${value}}`
          if (imported.supportsText)
            value = `@supports (${imported.supportsText}){${value}}`
          const media = imported.media.mediaText
          return media && media !== 'all' ? `@media ${media}{${value}}` : value
        }
        return resolve(rule.cssText, base)
      }).join('\n')
    } finally {
      active.delete(sheet)
    }
    const media = sheet.media.mediaText
    return media && media !== 'all' ? `@media ${media}{${text}}` : text
  }
  return [
    ...Array.from(document.styleSheets),
    ...Array.from(document.adoptedStyleSheets || []),
  ]
    .map(read)
    .join('\n')
}

export function snapshotSVGPageStyles(
  document: Document,
  report: (url: string, error: unknown) => void,
): () => string {
  const warnings: { url: string; error: unknown }[] = []
  let reported = false
  try {
    const text = pageStyleText(document, (url, error) =>
      warnings.push({ url, error }),
    )
    return () => {
      if (!reported) {
        reported = true
        warnings.forEach(({ url, error }) => report(url, error))
      }
      return text
    }
  } catch (error) {
    return () => {
      throw error
    }
  }
}

export function svgStyleContextKey(host: Element) {
  const properties = new Map<string, string>()
  for (
    let parent: Element | null = host;
    parent;
    parent = parent.parentElement
  ) {
    const style = (parent as HTMLElement).style
    if (!style) continue
    Array.from(style).forEach((name) => {
      if (name.startsWith('--') && !properties.has(name))
        properties.set(name, style.getPropertyValue(name))
    })
  }
  return JSON.stringify([
    (host as HTMLElement).style.cssText,
    Array.from(host.attributes)
      .filter(
        (attribute) =>
          !['id', 'class', 'href', 'style'].includes(attribute.localName),
      )
      .map((attribute) => [
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      ]),
    Array.from(properties).sort(([a], [b]) => a.localeCompare(b)),
  ])
}

export async function detectSVGStylePolicy(
  document: Document,
  check: () => void,
): Promise<SVGStylePolicy> {
  const widths: number[] = []
  for (let index = 0; index < 4; index++) {
    check()
    const name = uuid()
    const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="10" viewBox="0 0 21 10"><style>.${name}{display:${index === 0 ? 'none' : 'block'}}</style><g id="probe"><rect class="${name}" width="10" height="10"/><rect x="20" width="1" height="1"/></g></svg>`
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    const style = document.createElement('style')
    if (index === 1) style.textContent = `.${name}{display:none!important}`
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.cssText =
      'position:absolute!important;left:-9999px!important;visibility:hidden!important;display:block!important'
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    use.setAttribute('href', index === 3 ? url : url + '#probe')
    svg.append(use)
    const control = use.cloneNode(false) as SVGUseElement
    control.setAttribute('href', url + '#probe')
    if (index === 3) svg.append(control)
    try {
      document.documentElement.append(style, svg)
      let width = 0
      for (let attempt = 0; attempt < 32; attempt++) {
        check()
        width = use.getBBox().width
        if (index === 3 ? control.getBBox().width === 21 : width > 0) break
        // Resource readiness, not an animation-frame or fixed paint delay.
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
      if (
        width !== 1 &&
        width !== 21 &&
        !(index === 3 && width === 0 && control.getBBox().width === 21)
      )
        throw new Error('External SVG style probe did not become ready')
      widths.push(width)
    } finally {
      style.remove()
      svg.remove()
      URL.revokeObjectURL(url)
    }
  }
  if (widths[2] !== 21)
    throw new Error('External SVG style probe control was not visible')
  return {
    file: widths[0] === 1,
    page: widths[1] === 1,
    whole: widths[3] === 21,
  }
}

// Style evaluation must not activate fetched SVG content in the caller's page.
// Keep its attributes intact for selectors, but deny automatic loads and scripts.
export function createSVGStyleEnvironment(
  source: Document,
  signal?: AbortSignal,
) {
  const width = source.defaultView?.innerWidth || 1024
  const height = source.defaultView?.innerHeight || 768
  const fonts: FontFace[] = []
  source.fonts?.forEach((font) => {
    if (font.status === 'loaded') fonts.push(font)
  })
  let frame: HTMLIFrameElement | undefined
  let pending: Promise<Document> | undefined
  let cancel: (() => void) | undefined
  const dispose = () => {
    cancel?.()
    frame?.remove()
    frame = undefined
  }
  return {
    dispose,
    getDocument(): Promise<Document> {
      if (!pending) {
        pending = new Promise<Document>((resolve, reject) => {
          frame = document.createElement('iframe')
          const ownFrame = frame
          ownFrame.setAttribute('sandbox', 'allow-same-origin')
          ownFrame.setAttribute('aria-hidden', 'true')
          ownFrame.style.cssText = `position:fixed!important;left:-99999px!important;top:0!important;width:${width}px!important;height:${height}px!important;opacity:0!important;border:0!important;pointer-events:none!important`
          const finish = (error?: unknown, result?: Document) => {
            clearTimeout(timer)
            signal?.removeEventListener('abort', abort)
            ownFrame.onload = null
            cancel = undefined
            if (error) {
              ownFrame.remove()
              reject(error)
            } else resolve(result!)
          }
          const abort = () =>
            finish(
              signal?.reason ||
                new DOMException('Capture aborted', 'AbortError'),
            )
          const timer = setTimeout(
            () =>
              finish(new Error('SVG style environment did not become ready')),
            5000,
          )
          cancel = abort
          ownFrame.onload = () => {
            try {
              const result = ownFrame.contentDocument
              if (!result?.querySelector('meta[data-svg-style-policy]')) return
              const fontSet = result.fonts as FontFaceSet & {
                add(font: FontFace): FontFaceSet
              }
              fonts.forEach((font) => fontSet.add(font))
              finish(undefined, result)
            } catch (error) {
              finish(error)
            }
          }
          signal?.addEventListener('abort', abort, { once: true })
          if (signal?.aborted) {
            abort()
            return
          }
          ownFrame.srcdoc = `<!doctype html><meta data-svg-style-policy http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;overflow:hidden}</style><body></body>`
          document.documentElement.append(ownFrame)
        })
      }
      return pending
    },
  }
}

export function freezeSVGFragmentStyles(
  original: Element,
  copy: Element,
  styleRoot: Document | DocumentFragment | Element,
  host: Element,
  document: Document,
  policy: SVGStylePolicy,
  resolveURLs: (text: string, style: Element) => string,
  pageStyles: () => string,
) {
  const view = (document.defaultView || window) as Window & typeof globalThis
  const container = document.createElement('div')
  const ownStyle = (host as HTMLElement).style
  Array.from(host.attributes).forEach((attribute) =>
    container.style.setProperty(
      attribute.localName,
      attribute.value,
      'important',
    ),
  )
  Array.from(ownStyle).forEach((name) =>
    container.style.setProperty(
      name,
      ownStyle.getPropertyValue(name),
      'important',
    ),
  )
  for (let parent = host.parentElement; parent; parent = parent.parentElement) {
    const style = (parent as HTMLElement).style
    if (!style) continue
    Array.from(style).forEach((name) => {
      if (name.startsWith('--') && !container.style.getPropertyValue(name))
        container.style.setProperty(
          name,
          style.getPropertyValue(name),
          'important',
        )
    })
  }
  container.style.setProperty('position', 'absolute', 'important')
  container.style.setProperty('left', '-9999px', 'important')
  container.style.setProperty('opacity', '0', 'important')
  const shadow = container.attachShadow({ mode: 'open' })
  if (policy.file || policy.page) {
    const sheet = new view.CSSStyleSheet()
    sheet.replaceSync(
      policy.page
        ? pageStyles()
        : Array.from(styleRoot.querySelectorAll('style'))
            .filter(
              (style) =>
                !style.getAttribute('type') ||
                style.getAttribute('type')!.trim().toLowerCase() === 'text/css',
            )
            .map((style) => {
              const text = resolveURLs(style.textContent || '', style)
              const media = style.getAttribute('media')
              return media && media !== 'all'
                ? `@media ${media}{${text}}`
                : text
            })
            .join('\n'),
    )
    shadow.adoptedStyleSheets = [sheet]
  }
  const fragment = document.importNode(original, true)
  const neutralizeStyles = (root: Element) =>
    root.querySelectorAll('style').forEach((node) => {
      if (node.textContent)
        node.textContent = '/* stylesheet evaluated in the native scope */'
    })
  fragment.querySelectorAll('style').forEach((node) => node.remove())
  shadow.append(fragment)
  document.documentElement.append(container)
  try {
    const sources = [fragment, ...Array.from(fragment.querySelectorAll('*'))]
    const targets = [copy, ...Array.from(copy.querySelectorAll('*'))].filter(
      (node) => node.localName !== 'style',
    )
    sources.forEach((source, index) => {
      const style = view.getComputedStyle(source)
      const target = targets[index] as HTMLElement
      Array.from(style).forEach((name) =>
        target.style.setProperty(
          name,
          style.getPropertyValue(name),
          'important',
        ),
      )
    })
    neutralizeStyles(copy)
  } finally {
    container.remove()
  }
}
