import type { Options } from './types.js'
import { getResourceLoader } from './dataurl.js'
import { embedResources, shouldEmbed } from './embed-resources.js'
import { getTask } from './task.js'

interface FontRule {
  cssText: string
  family: string
  baseURL: string
}

function normalizeFontFamily(font: string) {
  return font.trim().replace(/["']/g, '')
}

function getUsedFonts(node: Element) {
  const fonts = new Set<string>()
  const visit = (element: Element) => {
    const view = element.ownerDocument.defaultView || window
    const inline = (element as HTMLElement).style?.getPropertyValue(
      'font-family',
    )
    const family =
      inline || view.getComputedStyle(element).getPropertyValue('font-family')
    family.split(',').forEach((font) => fonts.add(normalizeFontFamily(font)))
    Array.from(element.children).forEach(visit)
    if (element.shadowRoot)
      Array.from(element.shadowRoot.children).forEach(visit)
  }
  visit(node)
  // Pseudo styles are serialized as detached <style> nodes by the cloner.
  node.querySelectorAll('style').forEach((element) => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(element.textContent || '')
    Array.from(sheet.cssRules).forEach((rule) => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const family = (rule as CSSStyleRule).style.getPropertyValue(
          'font-family',
        )
        family
          .split(',')
          .forEach((font) => fonts.add(normalizeFontFamily(font)))
      }
    })
  })
  return fonts
}

async function collectFontRules(node: Element, options: Options) {
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
        if (shouldEmbed(style.getPropertyValue('src'))) {
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

  const sheets = new Set<CSSStyleSheet>(Array.from(ownerDocument.styleSheets))
  Array.from(ownerDocument.adoptedStyleSheets || []).forEach((sheet) =>
    sheets.add(sheet),
  )
  // Source shadow roots are flattened by the cloner; gather their font rules too.
  const collectShadowSheets = (element: Element) => {
    const shadow = element.shadowRoot
    if (shadow) {
      Array.from(shadow.adoptedStyleSheets || []).forEach((sheet) =>
        sheets.add(sheet),
      )
      shadow.querySelectorAll('style,link').forEach((element) => {
        const sheet = (element as HTMLStyleElement).sheet
        if (sheet) sheets.add(sheet)
      })
      Array.from(shadow.children).forEach(collectShadowSheets)
    }
    Array.from(element.children).forEach(collectShadowSheets)
  }
  collectShadowSheets(node)
  const collected = Array.from(sheets)
  for (let i = 0; i < collected.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await visitSheet(collected[i], ownerDocument.baseURI)
  }
  return rules
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
  styleSource: Element = node,
): Promise<string> {
  if (!node.ownerDocument)
    throw new Error('Provided element is not within a Document')
  const usedFonts = getUsedFonts(node)
  const rules = await collectFontRules(styleSource, options)
  const cssTexts = await Promise.all(
    rules
      .filter((rule) => usedFonts.has(rule.family))
      .map((rule) =>
        embedResources(rule.cssText, rule.baseURL, options, 'font'),
      ),
  )
  return cssTexts.join('\n')
}

export async function embedWebFonts<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
  styleSource: Element = clonedNode,
) {
  const cssText =
    options.fontEmbedCSS != null
      ? options.fontEmbedCSS
      : options.skipFonts
      ? null
      : await getWebFontCSS(clonedNode, options, styleSource)
  if (cssText) {
    const style = clonedNode.ownerDocument.createElement('style')
    style.textContent = cssText
    clonedNode.insertBefore(style, clonedNode.firstChild)
  }
}
