import type { Options } from './types'
import { toArray } from './util'
import { fontToDataUrl } from './dataurl'
import { fetchResource } from './fetch'
import { shouldEmbed, embedResources } from './embed-resources'

interface Metadata {
  url: string
  cssText: string
}

const PROPERTY_FONT_FAMILY = 'font-family'

async function fetchCSS(url: string, options: Options) {
  const response = await fetchResource(url, undefined, options)
  return { url, cssText: response.asString() }
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

    const { dataUrl } = await fontToDataUrl(url, undefined, options)
    cssText = cssText.replace(loc, dataUrl)
    return [loc, dataUrl]
  })

  return Promise.all(loadFonts).then(() => cssText)
}

function parseCSS(source: string) {
  if (source == null) {
    return []
  }

  const result: string[] = []
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi
  // strip out comments
  let cssText = source.replace(commentsRegex, '')

  // eslint-disable-next-line prefer-regex-literals
  const keyframesRegex = new RegExp(
    '((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})',
    'gi',
  )

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const matches = keyframesRegex.exec(cssText)
    if (matches === null) {
      break
    }
    result.push(matches[0])
  }
  cssText = cssText.replace(keyframesRegex, '')

  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi
  // to match css & media queries together
  const combinedCSSRegex =
    '((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]' +
    '*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})'
  // unified regex
  const unifiedRegex = new RegExp(combinedCSSRegex, 'gi')

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let matches = importRegex.exec(cssText)
    if (matches === null) {
      matches = unifiedRegex.exec(cssText)
      if (matches === null) {
        break
      } else {
        importRegex.lastIndex = unifiedRegex.lastIndex
      }
    } else {
      unifiedRegex.lastIndex = importRegex.lastIndex
    }
    result.push(matches[0])
  }

  return result
}

async function getCSSRules(
  styleSheets: CSSStyleSheet[],
  options: Options,
): Promise<CSSStyleRule[]> {
  const ret: CSSStyleRule[] = []
  const deferreds: Promise<number | void>[] = []

  // First loop inlines imports
  styleSheets.forEach((sheet) => {
    if ('cssRules' in sheet) {
      try {
        toArray<CSSRule>(sheet.cssRules || []).forEach((item, index) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            let importIndex = index + 1
            const url = (item as CSSImportRule).href
            const deferred = fetchCSS(url, options)
              .then((metadata) => embedFonts(metadata, options))
              .then((cssText) =>
                parseCSS(cssText).forEach((rule) => {
                  try {
                    sheet.insertRule(
                      rule,
                      rule.startsWith('@import')
                        ? (importIndex += 1)
                        : sheet.cssRules.length,
                    )
                  } catch (error) {
                    console.error('Error inserting rule from remote css', {
                      rule,
                      error,
                    })
                  }
                }),
              )
              .catch((e) => {
                console.error('Error loading remote css', e.toString())
              })

            deferreds.push(deferred)
          }
        })
      } catch (e) {
        const inline =
          styleSheets.find((a) => a.href == null) || document.styleSheets[0]
        if (sheet.href != null) {
          deferreds.push(
            fetchCSS(sheet.href, options)
              .then((metadata) => embedFonts(metadata, options))
              .then((cssText) =>
                parseCSS(cssText).forEach((rule) => {
                  inline.insertRule(rule, inline.cssRules.length)
                }),
              )
              .catch((err: unknown) => {
                console.error('Error loading remote stylesheet', err)
              }),
          )
        }
        console.error('Error inlining remote css file', e)
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
    .filter(
      (rule) =>
        rule.type === CSSRule.FONT_FACE_RULE ||
        rule.constructor.name === CSSFontFaceRule.name ||
        rule instanceof CSSFontFaceRule,
    )
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

function normalizeFontFamily(font: string) {
  return font.trim().replace(/["']/g, '')
}

function getUsedFonts(node: HTMLElement) {
  const fonts = new Set<string>()
  function traverse(node: HTMLElement) {
    const fontFamily =
      node.style.getPropertyValue(PROPERTY_FONT_FAMILY) ||
      window.getComputedStyle(node).getPropertyValue(PROPERTY_FONT_FAMILY) ||
      node.style.fontFamily
    fontFamily.split(',').forEach((font) => {
      fonts.add(normalizeFontFamily(font))
    })

    Array.from(node.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        traverse(child)
      }
    })
  }
  traverse(node)
  return fonts
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<string> {
  const rules = await parseWebFontRules(node, options)
  const usedFonts = getUsedFonts(node)
  const cssTexts = await Promise.all(
    rules
      .filter((rule) =>
        usedFonts.has(
          normalizeFontFamily(
            rule.style.getPropertyValue(PROPERTY_FONT_FAMILY),
          ),
        ),
      )
      .map((rule) => {
        const baseUrl = rule.parentStyleSheet
          ? rule.parentStyleSheet.href
          : null
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
