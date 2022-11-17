import { fetchWithTimeout, resolveUrl, toArray } from './util'
import { Options } from './options'
import { shouldEmbed, embedResources } from './embedResources'

interface Metadata {
  url: string
  styleSheet: Promise<CSSStyleSheet>
}

const cssFetchCache: {
  [href: string]: Promise<void | Metadata>
} = {}

function fetchCSS(url: string, window: Window): Promise<void | Metadata> {
  const cache = cssFetchCache[url]
  if (cache != null) {
    return cache
  }

  const deferred = fetchWithTimeout(window, url).then((res) => ({
    url,
    styleSheet: res.blob().then((blob) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(blob)
      }).then((cssText) => {
        const stylesheet = new CSSStyleSheet()
        return stylesheet.replace(cssText)
      })
    }),
  }))

  cssFetchCache[url] = deferred

  return deferred
}

function selectorsCompletelyAppliesToStyleRule(
  selectors: string[],
  rule: CSSRule,
): boolean {
  if (rule.type === CSSRule.STYLE_RULE) {
    const styleRule = rule as CSSStyleRule
    const styleRuleSelectors = styleRule.selectorText.split(',')

    return styleRuleSelectors.every((ruleSelector) => {
      return selectors.some((selector) => ruleSelector.includes(selector))
    })
  }

  return false
}

function dropRulesInMediaRuleAffectedBySelector(
  selectors: string[],
  rules: CSSRule[],
): CSSRule[] {
  rules
    .filter((r) => r.type === CSSRule.MEDIA_RULE)
    .forEach((rule) => {
      const mediaRule = rule as CSSMediaRule
      const mediaRuleRules = toArray<CSSRule>(mediaRule.cssRules)
      const rulesToDrop = new Array<number>()
      mediaRuleRules.forEach((r, index) => {
        if (r != null && selectorsCompletelyAppliesToStyleRule(selectors, r)) {
          rulesToDrop.push(index)
        }
      })

      rulesToDrop.reverse().forEach((ruleIndex) => {
        mediaRule.deleteRule(ruleIndex)
      })
    })

  return rules
}

function dropStyleRulesAffectedBySelector(
  selectors: string[],
  rules: CSSRule[],
): CSSRule[] {
  return rules.filter(
    (r) => r != null && !selectorsCompletelyAppliesToStyleRule(selectors, r),
  )
}

async function embedFonts(
  meta: Metadata,
  { skipCSSRuleBySelectors, skipURLs }: Options,
  document: Document,
  window: Window,
): Promise<string> {
  const styleSheet = await meta.styleSheet
  let styleSheetRules = toArray<CSSRule>(styleSheet.cssRules)

  if (skipCSSRuleBySelectors) {
    // filter style rules
    styleSheetRules = dropStyleRulesAffectedBySelector(
      skipCSSRuleBySelectors,
      styleSheetRules,
    )

    // filter media rules
    styleSheetRules = dropRulesInMediaRuleAffectedBySelector(
      skipCSSRuleBySelectors,
      styleSheetRules,
    )
  }

  let cssText = styleSheetRules.map((r) => r.cssText).join('\n')
  const regexUrl = /url\(["']?([^"')]+)["']?\)/g
  const fontLocs = cssText.match(/url\([^)]+\)/g) || []
  const loadFonts = fontLocs.map((loc: string) => {
    const url = loc.replace(regexUrl, '$1')

    if (skipURLs && skipURLs.includes(url)) {
      return Promise.resolve(null)
    }

    let urlToFetch = resolveUrl(url, meta.url, document, window)

    if (!urlToFetch.startsWith('https://')) {
      urlToFetch = new URL(urlToFetch, meta.url).href
    }

    // eslint-disable-next-line promise/no-nesting
    return fetchWithTimeout(window, urlToFetch)
      .then((res) => res.blob())
      .then((blob) => {
        return new Promise<[string, string | ArrayBuffer | null]>(
          (resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              // Side Effect
              cssText = cssText.replace(loc, `url(${reader.result})`)
              resolve([loc, reader.result])
            }
            reader.onerror = () => {
              console.warn(`filereader error ${urlToFetch}`)
              reject()
            }
            reader.readAsDataURL(blob)
          },
        )
      })
      .catch((reason) => {
        console.warn(`Failed to load font ${urlToFetch} `, reason)
        return Promise.resolve(null)
      })
  })

  return Promise.allSettled(loadFonts).then((value) => cssText)
}

function parseCSS(source: string): string[] {
  if (source == null) {
    return []
  }

  const result: string[] = []

  // strip out comments
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi
  let cssText = (source as any).replaceAll(commentsRegex, '')

  // strip out newlines and carriage returns
  cssText = (cssText as any).replaceAll(/[\r\n]/g, '')

  // replace tabular spaces
  cssText = (cssText as any).replaceAll('\t', ' ')

  // strip out excessive spaces
  cssText = (cssText as any).replaceAll(/\s\s+/gi, ' ')

  const keyframesRegex = new RegExp(
    /@(-moz-|-webkit-|-ms-)*keyframes\s(\S)+(\s?){(\s?\d%\s?{[-\w:\w+();\s]+}\s?\d+%\s?{[\w:\w();-\s]+)+}\s?}/,
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
  cssText = (cssText as any).replaceAll(keyframesRegex, '')

  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi
  // to match css & media queries together
  const combinedCSSRegex =
    /((\s*?(?:\/\*[\s\S]*?\*\/)?\s*?@media[\s\S]*?){([\s\S]*?)}\s*?})|(([\s\S]*?){([\s\S]*?)})/
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
  document: Document,
  window: Window,
): Promise<CSSRule[]> {
  const ret: CSSRule[] = []
  const deferreds: Promise<number | void>[] = []

  // First loop inlines imports
  styleSheets.forEach((sheet) => {
    if ('cssRules' in sheet) {
      try {
        toArray<CSSRule>(sheet.cssRules).forEach(
          (item: CSSRule, index: number) => {
            if (item.type === CSSRule.IMPORT_RULE) {
              const importCSSRule = <CSSImportRule>item
              let importIndex = index + 1
              const url = (item as CSSImportRule).href
              const urlToFetch = resolveUrl(url, sheet.href, document, window)
              const deferred = Promise.resolve({
                url: urlToFetch,
                styleSheet: Promise.resolve(importCSSRule.styleSheet),
              })
                .then((metadata) => {
                  return metadata
                    ? embedFonts(metadata, options, document, window)
                    : ''
                })
                .then((cssText) =>
                  parseCSS(cssText).forEach((rule) => {
                    const trimmedRule = rule.trim()
                    try {
                      sheet.insertRule(
                        trimmedRule,
                        trimmedRule.startsWith('@import')
                          ? (importIndex += 1)
                          : sheet.cssRules.length,
                      )
                    } catch (error) {
                      console.error('Error inserting rule from remote css', {
                        trimmedRule,
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
          },
        )
      } catch (e) {
        const inline =
          styleSheets.find((a) => a.href == null) || document.styleSheets[0]
        if (sheet.href != null) {
          const url = sheet.href
          const urlToFetch = resolveUrl(url, sheet.href, document, window)
          deferreds.push(
            fetchCSS(urlToFetch, window)
              .then((metadata) =>
                metadata ? embedFonts(metadata, options, document, window) : '',
              )
              .then((cssText) =>
                parseCSS(cssText).forEach((rule) => {
                  inline.insertRule(rule, sheet.cssRules.length)
                }),
              )
              .catch((err) => {
                console.error('Error loading remote stylesheet', err.toString())
              }),
          )
        }
        console.error('Error inlining remote css file', e.toString())
      }
    }
  })

  return Promise.all(deferreds).then(() => {
    // Second loop parses rules
    styleSheets.forEach((sheet) => {
      if ('cssRules' in sheet) {
        try {
          let styleSheetRules = toArray<CSSRule>(sheet.cssRules)
          if (options.skipCSSRuleBySelectors) {
            // filter style rules
            styleSheetRules = dropStyleRulesAffectedBySelector(
              options.skipCSSRuleBySelectors,
              styleSheetRules,
            )

            // filter media rules
            styleSheetRules = dropRulesInMediaRuleAffectedBySelector(
              options.skipCSSRuleBySelectors,
              styleSheetRules,
            )
          }

          styleSheetRules.forEach((item: CSSRule) => {
            ret.push(item)
          })
        } catch (e) {
          console.error(
            `Error while reading CSS rules from ${sheet.href}`,
            e.toString(),
          )
        }
      }
    })

    return ret
  })
}

function getWebFontRules(cssRules: CSSRule[]): CSSRule[] {
  return cssRules
    .filter((rule) => rule.type === CSSRule.FONT_FACE_RULE)
    .filter((rule) => {
      const fontRule = rule as CSSFontFaceRule
      return shouldEmbed(fontRule.style.getPropertyValue('src'))
    })
}

async function parseWebFontRules<T extends HTMLElement>(
  node: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<CSSRule[]> {
  return new Promise((resolve, reject) => {
    if (node.ownerDocument == null) {
      reject(new Error('Provided element is not within a Document'))
    }
    resolve(toArray(node.ownerDocument.styleSheets))
  })
    .then((styleSheets: CSSStyleSheet[]) =>
      getCSSRules(styleSheets, options, document, window),
    )
    .then(getWebFontRules)
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<string> {
  return parseWebFontRules(node, options, document, window)
    .then((rules) =>
      Promise.all(
        rules.map((rule) => {
          const baseUrl = rule.parentStyleSheet
            ? rule.parentStyleSheet.href
            : null
          return embedResources(
            rule.cssText,
            baseUrl,
            options,
            document,
            window,
          )
        }),
      ),
    )
    .then((cssTexts) => cssTexts.join('\n'))
}

export async function embedWebFonts(
  clonedNode: HTMLElement,
  options: Options,
  document: Document,
  window: Window,
): Promise<HTMLElement> {
  return (
    options.fontEmbedCSS != null
      ? Promise.resolve(options.fontEmbedCSS)
      : getWebFontCSS(clonedNode, options, document, window)
  ).then((cssText) => {
    const styleNode = document.createElement('style')
    const sytleContent = document.createTextNode(cssText)

    styleNode.appendChild(sytleContent)

    if (clonedNode.firstChild) {
      clonedNode.insertBefore(styleNode, clonedNode.firstChild)
    } else {
      clonedNode.appendChild(styleNode)
    }

    return clonedNode
  })
}
