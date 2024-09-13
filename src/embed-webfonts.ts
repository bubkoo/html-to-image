import type { Options } from './types'
import { toArray } from './util'
import { fetchAsDataURL } from './dataurl'
import { shouldEmbed, embedResources } from './embed-resources'

interface Metadata {
  url: string
  cssText: string
}

const cssFetchCache: { [href: string]: Metadata } = {}

async function fetchCSS(url: string) {
  let cache = cssFetchCache[url]
  if (cache != null) {
    return cache
  }

  const res = await fetch(url)
  const cssText = await res.text()
  cache = { url, cssText }

  cssFetchCache[url] = cache

  return cache
}

async function embedFonts(data: Metadata, options: Options): Promise<string> {
  let cssText = data.cssText
  const regexUrl = /url\(["']?([^"')]+)["']?\)/g
  const fontLocs = cssText.match(/url\([^)]+\)/g) || []
  const loadFonts = fontLocs.map(async (loc: string) => {
    let url = loc.replace(regexUrl, '$1')
    if (!url.startsWith('https://')) {
      url = new URL(url, data.url).href
    }

    return fetchAsDataURL<[string, string]>(
      url,
      options.fetchRequestInit,
      ({ result }) => {
        cssText = cssText.replace(loc, `url(${result})`)
        return [loc, result]
      },
    )
  })

  return Promise.all(loadFonts).then(() => cssText)
}

function parseCSS(source: string): Promise<CSSStyleSheet> {
  const styles = new CSSStyleSheet()
  return styles.replace(source || '')
}

async function getCSSRules(
  styleSheets: CSSStyleSheet[],
  options: Options,
): Promise<CSSStyleRule[]> {
  const ret: CSSStyleRule[] = []
  const deferreds: Promise<number | void>[] = []

  // First loop inlines imports
  styleSheets.forEach((sheet, sheetIdx) => {
    if ('cssRules' in sheet) {
      try {
        toArray<CSSRule>(sheet.cssRules || []).forEach((item, index) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            let importIndex = index + 1
            const url = (item as CSSImportRule).href
            const deferred = fetchCSS(url)
              .then((metadata) => embedFonts(metadata, options))
              .then((cssText) => parseCSS(cssText))
              .then((importedSheet) => {
                toArray<CSSRule>(importedSheet.cssRules)
                  .map((rule) => rule.cssText)
                  .forEach((ruleText) => {
                    try {
                      sheet.insertRule(
                        ruleText,
                        ruleText.startsWith('@import')
                          ? (importIndex += 1)
                          : sheet.cssRules.length,
                      )
                    } catch (error) {
                      console.error('Error inserting rule from remote css', {
                        ruleText,
                        error,
                      })
                    }
                  })
              })
              .catch((e) => {
                console.error('Error loading remote css', e.toString())
              })
            deferreds.push(deferred)
          }
        })
      } catch (e) {
        if (sheet.href != null) {
          deferreds.push(
            fetchCSS(sheet.href)
              .then((metadata) => embedFonts(metadata, options))
              .then((cssText) => parseCSS(cssText))
              .then((importedSheet) => {
                styleSheets[sheetIdx] = importedSheet
              })
              .catch((err: unknown) => {
                console.error('Error loading remote stylesheet', err)
              }),
          )
        } else {
          console.error('Cannot inline remote CSS', e)
        }
      }
    }
  })

  return Promise.all(deferreds).then(() => {
    // Second loop parses rules
    styleSheets.forEach((sheet) => {
      if ('cssRules' in sheet) {
        try {
          toArray<CSSStyleRule>(sheet.cssRules || []).forEach((item) => {
            ret.push(item)
          })
        } catch (e) {
          console.error(`Error while reading CSS rules from ${sheet.href}`, e)
        }
      }
    })

    return ret
  })
}

function getWebFontRules(cssRules: CSSStyleRule[]): CSSStyleRule[] {
  return cssRules
    .filter((rule) => rule.type === CSSRule.FONT_FACE_RULE)
    .filter((rule) => shouldEmbed(rule.style.getPropertyValue('src')))
}

async function parseWebFontRules<T extends HTMLElement>(
  node: T,
  options: Options,
) {
  if (node.ownerDocument == null) {
    throw new Error('Provided element is not within a Document')
  }

  const styleSheets = toArray<CSSStyleSheet>(node.ownerDocument.styleSheets)
  const cssRules = await getCSSRules(styleSheets, options)

  return getWebFontRules(cssRules)
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<string> {
  const rules = await parseWebFontRules(node, options)
  const cssTexts = await Promise.all(
    rules.map((rule) => {
      const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null
      return embedResources(rule.cssText, baseUrl, options)
    }),
  )

  return cssTexts.join('\n')
}

export async function embedWebFonts<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  const cssText =
    options.fontEmbedCSS != null
      ? options.fontEmbedCSS
      : options.skipFonts
      ? null
      : await getWebFontCSS(clonedNode, options)

  if (cssText) {
    const styleNode = document.createElement('style')
    const sytleContent = document.createTextNode(cssText)

    styleNode.appendChild(sytleContent)

    if (clonedNode.firstChild) {
      clonedNode.insertBefore(styleNode, clonedNode.firstChild)
    } else {
      clonedNode.appendChild(styleNode)
    }
  }
}
