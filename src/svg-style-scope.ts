import { readDocumentMethod, readDocumentProperty } from './document.js'
import { uuid } from './util.js'
import {
  rewriteSVGStyleURLs,
  type SVGImportPolicy,
  type SVGLayerPolicy,
} from './svg-style-imports.js'

const installedFontCSS = new WeakMap<Document, Set<string>>()

export interface SVGStylePolicy extends SVGImportPolicy {
  file: boolean
  page: boolean
  whole: boolean
  fragment?: 'file' | 'page'
}

export async function detectSVGFragmentPolicy(
  document: Document,
  check: () => void,
): Promise<'file' | 'page'> {
  const view = readDocumentProperty(document, 'defaultView')
  if (!view || view.innerWidth < 16 || view.innerHeight < 11)
    throw new Error('SVG fragment scope probe needs a larger active viewport')
  const ns = 'http://www.w3.org/2000/svg'
  const id = uuid()
  const svg = readDocumentMethod(document, 'createElementNS')(ns, 'svg')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.style.cssText =
    'position:absolute!important;left:0!important;top:0!important;width:20px!important;height:20px!important'
  svg.innerHTML = `<defs><clipPath id="${id}"><rect width="12" height="20"/></clipPath></defs>`
  const xml = `<svg xmlns="${ns}"><defs><clipPath id="${id}"><rect width="6" height="20"/></clipPath></defs><g id="probe"><rect width="20" height="20" fill="green" clip-path="url(#${id})"/></g><g id="flat"><rect width="20" height="20" fill="green"/></g></svg>`
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
  const use = readDocumentMethod(document, 'createElementNS')(ns, 'use')
  use.setAttribute('href', url + '#probe')
  const control = readDocumentMethod(document, 'createElementNS')(ns, 'use')
  control.setAttribute('href', url + '#flat')
  svg.append(use, control)
  try {
    readDocumentProperty(document, 'documentElement').append(svg)
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      check()
      use.style.removeProperty('display')
      control.style.display = 'none'
      const ready = use.getBBox().width === 20
      const inside =
        readDocumentMethod(document, 'elementFromPoint')(2, 10) === use
      const outside =
        readDocumentMethod(document, 'elementFromPoint')(15, 10) !== use
      const page =
        readDocumentMethod(document, 'elementFromPoint')(8, 10) === use
      use.style.display = 'none'
      control.style.removeProperty('display')
      const flat =
        control.getBBox().width === 20 &&
        readDocumentMethod(document, 'elementFromPoint')(15, 10) === control
      if (ready && inside && outside && flat) return page ? 'page' : 'file'
      // Readiness includes applied clipping, not only loaded use geometry.
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    check()
    throw new Error('SVG fragment scope clipping controls did not become ready')
  } finally {
    use.removeAttribute('href')
    control.removeAttribute('href')
    svg.remove()
    URL.revokeObjectURL(url)
  }
}

function pageStyleText(
  document: Document,
  unavailable: (url: string, error: unknown) => void,
) {
  const resolve = (text: string, base: string) =>
    rewriteSVGStyleURLs(text, (value) => {
      try {
        return new URL(value, base).href
      } catch {
        return undefined
      }
    })
  const active = new Set<CSSStyleSheet>()
  const read = (sheet: CSSStyleSheet): string => {
    if (sheet.disabled) return ''
    if (active.has(sheet)) return ''
    const base = sheet.href || readDocumentProperty(document, 'baseURI')
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
    ...Array.from(readDocumentProperty(document, 'styleSheets')),
    ...Array.from(readDocumentProperty(document, 'adoptedStyleSheets') || []),
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
  reportImportError?: (error: unknown) => void,
  reportFragmentError?: (error: unknown) => void,
): Promise<SVGStylePolicy> {
  const widths: number[] = []
  for (let index = 0; index < 4; index++) {
    check()
    const name = uuid()
    const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="10" viewBox="0 0 21 10"><style>.${name}{display:${index === 0 ? 'none' : 'block'}}</style><g id="probe"><rect class="${name}" width="10" height="10"/><rect x="20" width="1" height="1"/></g></svg>`
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    const style = readDocumentMethod(document, 'createElement')('style')
    if (index === 1) style.textContent = `.${name}{display:none!important}`
    const svg = readDocumentMethod(document, 'createElementNS')(
      'http://www.w3.org/2000/svg',
      'svg',
    )
    svg.style.cssText =
      'position:absolute!important;left:-9999px!important;visibility:hidden!important;display:block!important'
    const use = readDocumentMethod(document, 'createElementNS')(
      'http://www.w3.org/2000/svg',
      'use',
    )
    use.setAttribute('href', index === 3 ? url : url + '#probe')
    svg.append(use)
    const control = use.cloneNode(false) as SVGUseElement
    control.setAttribute('href', url + '#probe')
    if (index === 3) svg.append(control)
    try {
      readDocumentProperty(document, 'documentElement').append(style, svg)
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
  let fragment: SVGStylePolicy['fragment']
  try {
    fragment = await detectSVGFragmentPolicy(document, check)
  } catch (error) {
    check()
    reportFragmentError?.(error)
  }
  let imports: SVGImportPolicy = {
    dataImports: false,
    fileLayers: 'ordered',
    importLayers: 'ordered',
  }
  if (widths[0] === 1) {
    try {
      imports = await detectSVGImportPolicy(document, check)
    } catch (error) {
      check()
      reportImportError?.(error)
    }
  }
  return {
    file: widths[0] === 1,
    page: widths[1] === 1,
    whole: widths[3] === 21,
    fragment,
    ...imports,
  }
}

async function detectSVGImportPolicy(
  document: Document,
  check: () => void,
): Promise<SVGImportPolicy> {
  const name = uuid()
  const data = (css: string) => 'data:text/css,' + encodeURIComponent(css)
  const css = `@import url("${data(`.${name}-plain{display:none!important}`)}");@import url("${data(`.${name}-import-marker,.${name}-import-priority{display:none!important}`)}") layer(probe);@layer inlineprobe{.${name}-inline-marker,.${name}-inline-priority{display:none!important}}.${name}-inline-priority,.${name}-import-priority{display:block!important}`
  const ids = [
    'plain',
    'inline-marker',
    'inline-priority',
    'import-marker',
    'import-priority',
    'control',
  ]
  const groups = ids
    .map(
      (id) =>
        `<g id="${id}"><rect class="${name}-${id}" width="20" height="10"/><rect x="20" width="1" height="1"/></g>`,
    )
    .join('')
  const url = URL.createObjectURL(
    new Blob(
      [
        `<svg xmlns="http://www.w3.org/2000/svg"><style>${css}</style>${groups}</svg>`,
      ],
      { type: 'image/svg+xml' },
    ),
  )
  const svg = readDocumentMethod(document, 'createElementNS')(
    'http://www.w3.org/2000/svg',
    'svg',
  )
  svg.style.cssText =
    'position:absolute!important;left:-9999px!important;opacity:0!important;display:block!important'
  let loaded = false
  const uses = ids.map((id) => {
    const use = readDocumentMethod(document, 'createElementNS')(
      'http://www.w3.org/2000/svg',
      'use',
    )
    use.setAttribute('href', url + '#' + id)
    svg.append(use)
    return use
  })
  const ready = () => {
    loaded = true
  }
  uses[0].addEventListener('load', ready)
  try {
    readDocumentProperty(document, 'documentElement').append(svg)
    const deadline = Date.now() + 5000
    let values: number[] = []
    let measured = false
    while (Date.now() < deadline) {
      check()
      values = uses.map((use) => use.getBBox().width)
      const valid =
        values[5] === 21 && values.every((value) => value === 1 || value === 21)
      // Positive effects prove that both imports are ready even if a use load
      // notification is missing. A load notification alone may precede layout.
      if (valid && (loaded || (values[0] === 1 && values[3] === 1))) {
        measured = true
        break
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    check()
    if (!measured)
      throw new Error(
        'Native SVG data-import probe did not become ready (load=' +
          loaded +
          '; widths=' +
          values.join(',') +
          ')',
      )
    const mode = (marker: number, priority: number): SVGLayerPolicy =>
      marker === 21 ? 'none' : priority === 1 ? 'ordered' : 'flat'
    return {
      dataImports: values[0] === 1,
      fileLayers: mode(values[1], values[2]),
      importLayers: mode(values[3], values[4]),
    }
  } finally {
    uses[0].removeEventListener('load', ready)
    svg.remove()
    URL.revokeObjectURL(url)
  }
}

// Style evaluation must not activate fetched SVG content in the caller's page.
// Keep its attributes intact for selectors, but deny automatic loads and scripts.
export function createSVGStyleEnvironment(
  source: Document,
  signal?: AbortSignal,
) {
  const width = readDocumentProperty(source, 'defaultView')?.innerWidth || 1024
  const height = readDocumentProperty(source, 'defaultView')?.innerHeight || 768
  const fonts: FontFace[] = []
  readDocumentProperty(source, 'fonts')?.forEach((font) => {
    if (font.status === 'loaded') fonts.push(font)
  })
  let frame: HTMLIFrameElement | undefined
  let pending: Promise<Document> | undefined
  let cancel: (() => void) | undefined
  let resourcesLocked = false
  let disposed = false
  const lockResources = (document: Document) => {
    if (resourcesLocked) return
    const policy = Reflect.apply(
      readDocumentProperty(document, 'createElement'),
      document,
      ['meta'],
    ) as HTMLMetaElement
    policy.httpEquiv = 'Content-Security-Policy'
    policy.content = "img-src 'none'; style-src 'unsafe-inline'"
    readDocumentProperty(document, 'head').append(policy)
    resourcesLocked = true
  }
  const dispose = () => {
    disposed = true
    signal?.removeEventListener('abort', dispose)
    cancel?.()
    frame?.remove()
    frame = undefined
    pending = undefined
    // Loaded FontFace wrappers can retain their source document after disposal.
    fonts.length = 0
  }
  signal?.addEventListener('abort', dispose, { once: true })
  return {
    dispose,
    async measurePolicy(
      check: () => void,
      reportImportError?: (error: unknown) => void,
      reportFragmentError?: (error: unknown) => void,
    ): Promise<SVGStylePolicy> {
      const document = await this.getDocument(true)
      try {
        return await detectSVGStylePolicy(
          document,
          check,
          reportImportError,
          reportFragmentError,
        )
      } finally {
        lockResources(document)
      }
    },
    getDocument(trustedProbe = false): Promise<Document> {
      if (disposed)
        return Promise.reject(
          signal?.reason ||
            new Error('SVG style environment has been disposed'),
        )
      if (!pending) {
        pending = new Promise<Document>((resolve, reject) => {
          frame = readDocumentMethod(document, 'createElement')('iframe')
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
              if (
                !result ||
                !readDocumentMethod(
                  result,
                  'querySelector',
                )('meta[data-svg-style-policy]')
              )
                return
              const fontSet = readDocumentProperty(
                result,
                'fonts',
              ) as FontFaceSet & {
                add(font: FontFace): FontFaceSet
              }
              fonts.forEach((font) => {
                try {
                  fontSet.add(font)
                } catch (error) {
                  // Some engines keep CSS-connected faces in their owner document.
                  // Their resource embedding remains with the existing font pipeline.
                  if (
                    (error as DOMException | null)?.name !==
                    'InvalidModificationError'
                  )
                    throw error
                }
              })
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
          ownFrame.srcdoc = `<!doctype html><meta data-svg-style-policy http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline' data:; img-src blob:; font-src data:; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;overflow:hidden}</style><body></body>`
          readDocumentProperty(document, 'documentElement').append(ownFrame)
        })
      }
      return trustedProbe
        ? pending
        : pending.then((document) => {
            lockResources(document)
            return document
          })
    },
  }
}

export async function freezeSVGFragmentStyles(
  original: Element,
  copy: Element,
  styleRoot: Document | DocumentFragment | Element,
  host: Element,
  document: Document,
  policy: SVGStylePolicy,
  resolveURLs: (text: string, style: Element) => string,
  pageStyles: () => string,
  prepareFonts: (families: readonly string[]) => Promise<string>,
  reportFontError: (error: unknown) => void,
  prepareFileStyle: (text: string) => Promise<string>,
) {
  const view = (readDocumentProperty(document, 'defaultView') ||
    window) as Window & typeof globalThis
  const container = readDocumentMethod(document, 'createElement')('div')
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
    let css = policy.page
      ? pageStyles()
      : Array.from(readDocumentMethod(styleRoot, 'querySelectorAll')('style'))
          .filter(
            (style) =>
              !style.getAttribute('type') ||
              style.getAttribute('type')!.trim().toLowerCase() === 'text/css',
          )
          .map((style) => {
            const text = resolveURLs(style.textContent || '', style)
            const media = style.getAttribute('media')
            return media && media !== 'all' ? `@media ${media}{${text}}` : text
          })
          .join('\n')
    if (!policy.page) css = await prepareFileStyle(css)
    sheet.replaceSync(css)
    const removeFontFaces = (parent: CSSStyleSheet | CSSGroupingRule) => {
      for (let index = parent.cssRules.length - 1; index >= 0; index--) {
        const rule = parent.cssRules[index]
        if (rule.type === CSSRule.FONT_FACE_RULE) parent.deleteRule(index)
        else if ('cssRules' in rule) removeFontFaces(rule as CSSGroupingRule)
      }
    }
    removeFontFaces(sheet)
    shadow.adoptedStyleSheets = [sheet]
  }
  let fragment = readDocumentMethod(document, 'importNode')(original, true)
  const neutralizeStyles = (root: Element) =>
    root.querySelectorAll('style').forEach((node) => {
      if (node.textContent)
        node.textContent = '/* stylesheet evaluated in the native scope */'
    })
  fragment.querySelectorAll('style').forEach((node) => node.remove())
  shadow.append(fragment)
  readDocumentProperty(document, 'documentElement').append(container)
  try {
    let sources = [fragment, ...Array.from(fragment.querySelectorAll('*'))]
    const targets = [copy, ...Array.from(copy.querySelectorAll('*'))].filter(
      (node) => node.localName !== 'style',
    )
    const fontCSS = await prepareFonts(
      sources.map((source) => view.getComputedStyle(source).fontFamily),
    )
    if (fontCSS) {
      let installed = installedFontCSS.get(document)
      if (!installed) {
        installed = new Set()
        installedFontCSS.set(document, installed)
      }
      if (!installed.has(fontCSS)) {
        const fonts = readDocumentMethod(document, 'createElement')('style')
        fonts.textContent = fontCSS
        readDocumentProperty(document, 'head').append(fonts)
        installed.add(fontCSS)
      }
      const requested = new Set(
        sources.map((source) => {
          const style = view.getComputedStyle(source)
          return style.font || `${style.fontSize} ${style.fontFamily}`
        }),
      )
      await Promise.all(
        Array.from(requested, (font) =>
          readDocumentProperty(document, 'fonts')
            .load(font)
            .catch(reportFontError),
        ),
      )
      // A non-rendering symbol can retain fallback metrics computed before its
      // face loaded. Evaluate a fresh tree only after those faces are ready.
      const ready = fragment.cloneNode(true) as Element
      fragment.replaceWith(ready)
      fragment = ready
      sources = [fragment, ...Array.from(fragment.querySelectorAll('*'))]
    }
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
