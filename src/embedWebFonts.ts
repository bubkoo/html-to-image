import { resolveUrl, toArray } from './util'
import { Options } from './options'
import { shouldEmbed, embedResources } from './embedResources'

interface Metadata {
  url: string
  cssText: Promise<string>
}

const cssFetchCache: {
  [href: string]: Promise<void | Metadata>
} = {}

function fetchCSS(url: string, window: Window): Promise<void | Metadata> {
  const cache = cssFetchCache[url]
  if (cache != null) {
    return cache
  }

  const deferred = window.fetch(url).then((res) => ({
    url,
    cssText: res.text(),
  }))

  cssFetchCache[url] = deferred

  return deferred
}

async function embedFonts(
  meta: Metadata,
  document: Document,
  window: Window,
): Promise<string> {
  // const raw = await meta.cssText
  // let cssText = raw
  // const regexUrl = /url\(["']?([^"')]+)["']?\)/g
  // const fontLocs = cssText.match(/url\([^)]+\)/g) || []

  // const loadFonts = fontLocs.map(async (loc: string, index: number) => {
  //   try {
  //     let url = loc.replace(regexUrl, '$1')

  //     if (!url.startsWith('https://')) {
  //       url = new URL(url, meta.url).href
  //     }

  //     console.warn(` iteration ${index} location: ${url}`)

  //     // eslint-disable-next-line promise/no-nesting
  //     const fetchData = await window.fetch(url)

  //     console.warn(`fetched ${url}`)

  //     const blob = await fetchData.blob()

  //     console.warn(`fetched blob ${url}`)

  //     return await (new Promise<void>((resolve, reject) => {
  //       const reader = new FileReader()
  //       reader.onloadend = () => {
  //         console.warn(`filereader loadend ${url}`)
  //         // Side Effect
  //         cssText = cssText.replace(loc, `url(${reader.result})`)
  //         resolve()
  //       }

  //       reader.onerror = () => {
  //         console.warn(`filereader error ${url}`)
  //         reject()
  //       }

  //       reader.readAsDataURL(blob)
  //     })
  //   } catch (e) {
  //     console.warn('error loading font location', e)
  //     return Promise.resolve()
  //   }
  // })

  // // eslint-disable-next-line promise/no-nesting
  // await Promise.all(loadFonts)

  // loadFonts.map((p) => console.warn('log', p))

  // return cssText

  return meta.cssText.then((raw: string) => {
    let cssText = raw
    const regexUrl = /url\(["']?([^"')]+)["']?\)/g
    const fontLocs = cssText.match(/url\([^)]+\)/g) || []
    // const fontLocs5 = [fontLocs[4]]
    const loadFonts = fontLocs.map((loc: string, index: number) => {
      const url = loc.replace(regexUrl, '$1')

      let urlToFetch = resolveUrl(url, meta.url, document, window)

      if (!urlToFetch.startsWith('https://')) {
        urlToFetch = new URL(urlToFetch, meta.url).href
      }

      console.warn(` iteration ${index} location: ${urlToFetch}`)

      // eslint-disable-next-line promise/no-nesting
      return window
        .fetch(urlToFetch)
        .then((res) => {
          console.warn(`fetched ${urlToFetch}`)
          return res.blob()
        })
        .then((blob) => {
          console.warn(`fetched blob for ${urlToFetch}`)
          return new Promise<[string, string | ArrayBuffer | null]>(
            (resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                console.warn(`filereader loadend ${urlToFetch}`)
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

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      window.setTimeout(() => {
        console.warn('Timed out')
        resolve('timeout')
      }, 1000)
    })

    // eslint-disable-next-line promise/no-nesting
    return Promise.race([Promise.all(loadFonts), timeoutPromise]).then(
      (value) => {
        if (value === 'timeout') {
          console.warn('Race timeout')
        }
        console.warn('Returning cssText')
        return cssText
      },
    )
  })
}

function parseCSS(source: string) {
  if (source == null) {
    return []
  }

  const result: string[] = []
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi
  // strip out comments
  let cssText = source.replace(commentsRegex, '')

  // strip out newlines
  cssText = (cssText as any).replaceAll('\n', '')

  // replace tabular spaces
  cssText = (cssText as any).replaceAll('\t', ' ')

  // strip out excessive spaces
  cssText = (cssText as any).replaceAll(/\s\s+/gi, ' ')

  const keyframesRegex = new RegExp(
    /@(-moz-|-webkit-|-ms-)*keyframes\s(\S)+(\s?){(\s?\d%\s?{[-\w:\w+();\s]+}\s?\d+%\s?{[\w:\w();-\s]+)+}}/,
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
  document: Document,
  window: Window,
): Promise<CSSStyleRule[]> {
  const ret: CSSStyleRule[] = []
  const deferreds: Promise<number | void>[] = []

  // First loop inlines imports
  styleSheets.forEach((sheet) => {
    if ('cssRules' in sheet) {
      try {
        toArray<CSSRule>(sheet.cssRules).forEach(
          (item: CSSRule, index: number) => {
            if (item.type === CSSRule.IMPORT_RULE) {
              let importIndex = index + 1
              const url = (item as CSSImportRule).href
              const urlToFetch = resolveUrl(url, sheet.href, document, window)
              const deferred = fetchCSS(urlToFetch, window)
                .then((metadata) =>
                  metadata ? embedFonts(metadata, document, window) : '',
                )
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
          deferreds.push(
            fetchCSS(sheet.href, window)
              .then((metadata) =>
                metadata ? embedFonts(metadata, document, window) : '',
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
          toArray<CSSStyleRule>(sheet.cssRules).forEach(
            (item: CSSStyleRule) => {
              ret.push(item)
            },
          )
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

function getWebFontRules(cssRules: CSSStyleRule[]): CSSStyleRule[] {
  return cssRules
    .filter((rule) => rule.type === CSSRule.FONT_FACE_RULE)
    .filter((rule) => shouldEmbed(rule.style.getPropertyValue('src')))
}

async function parseWebFontRules<T extends HTMLElement>(
  node: T,
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
      getCSSRules(styleSheets, document, window),
    )
    .then(getWebFontRules)
}

export async function getWebFontCSS<T extends HTMLElement>(
  node: T,
  options: Options,
  document: Document,
  window: Window,
): Promise<string> {
  return parseWebFontRules(node, document, window)
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
