import { toArray } from './util'
import { Options } from './index'
import { shouldEmbed, embedResources } from './embedResources'

const cssFetchPromiseStore: {
  [href: string]: Promise<void | {
    url: string
    cssText: Promise<string>
  }>
} = {}

export async function parseWebFontRules(
  clonedNode: HTMLElement,
): Promise<CSSRule[]> {
  return new Promise((resolve, reject) => {
    if (!clonedNode.ownerDocument) {
      reject(new Error('Provided element is not within a Document'))
    }
    resolve(toArray(clonedNode.ownerDocument!.styleSheets))
  })
    .then(getCssRules)
    .then(getWebFontRules)
}

export async function embedWebFonts(
  clonedNode: HTMLElement,
  options: Options,
): Promise<HTMLElement> {
  return parseWebFontRules(clonedNode)
    .then((rules) =>
      Promise.all(
        rules.map((rule) => {
          const baseUrl = rule.parentStyleSheet
            ? rule.parentStyleSheet.href
            : null
          return embedResources(rule.cssText, baseUrl, options)
        }),
      ),
    )
    .then((cssStrings) => cssStrings.join('\n'))
    .then((cssString) => {
      const styleNode = document.createElement('style')
      const sytleContent = document.createTextNode(cssString)

      styleNode.appendChild(sytleContent)

      if (clonedNode.firstChild) {
        clonedNode.insertBefore(styleNode, clonedNode.firstChild)
      } else {
        clonedNode.appendChild(styleNode)
      }

      return clonedNode
    })
}

export async function getCssRules(
  styleSheets: CSSStyleSheet[],
): Promise<CSSStyleRule[]> {
  const ret: CSSStyleRule[] = []
  const promises: Promise<number | void>[] = []

  // First loop inlines imports
  styleSheets.forEach((sheet) => {
    if ('cssRules' in sheet) {
      try {
        toArray<CSSRule>(sheet.cssRules).forEach((item: CSSRule) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            promises.push(
              fetchCSS((item as CSSImportRule).href, sheet)
                .then(embedFonts)
                .then((cssText: any) => {
                  const parsed = parseCSS(cssText)
                  parsed.forEach((rule: any) => {
                    sheet.insertRule(rule, sheet.cssRules.length)
                  })
                })
                .catch((e) => {
                  console.log('Error loading remote css', e.toString())
                }),
            )
          }
        })
      } catch (e) {
        const inline =
          styleSheets.find((a) => a.href === null) || document.styleSheets[0]
        if (sheet.href != null) {
          promises.push(
            fetchCSS(sheet.href, inline)
              .then(embedFonts)
              .then((cssText: any) => {
                const parsed = parseCSS(cssText)
                parsed.forEach((rule: any) => {
                  ;(inline as CSSStyleSheet).insertRule(
                    rule,
                    sheet.cssRules.length,
                  )
                })
              })
              .catch((e) => {
                console.log('Error loading remote stylesheet', e.toString())
              }),
          )
        }
        console.log('Error inlining remote css file', e.toString())
      }
    }
  })

  return Promise.all(promises).then(() => {
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
          console.log(
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

function parseCSS(source: string) {
  if (source === undefined) {
    return []
  }

  let cssText = source
  const css = []
  const cssKeyframeRegex = '((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})'
  const combinedCSSRegex =
    '((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]' +
    '*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})' // to match css & media queries together
  const cssCommentsRegex = /(\/\*[\s\S]*?\*\/)/gi
  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi

  // strip out comments
  cssText = cssText.replace(cssCommentsRegex, '')

  const keyframesRegex = new RegExp(cssKeyframeRegex, 'gi')
  let arr
  while (true) {
    arr = keyframesRegex.exec(cssText)
    if (arr === null) {
      break
    }
    css.push(arr[0])
  }
  cssText = cssText.replace(keyframesRegex, '')

  // unified regex
  const unified = new RegExp(combinedCSSRegex, 'gi')
  while (true) {
    arr = importRegex.exec(cssText)

    if (arr === null) {
      arr = unified.exec(cssText)
      if (arr === null) {
        break
      } else {
        importRegex.lastIndex = unified.lastIndex
      }
    } else {
      unified.lastIndex = importRegex.lastIndex
    }
    css.push(arr[0])
  }

  return css
}

function fetchCSS(url: string, sheet: StyleSheet): Promise<any> {
  if (cssFetchPromiseStore[url]) {
    return cssFetchPromiseStore[url]
  }

  const promise = fetch(url).then(
    (res: Response) => {
      return {
        url,
        cssText: res.text(),
      }
    },
    (e) => {
      console.log('ERROR FETCHING CSS: ', e.toString())
    },
  )

  cssFetchPromiseStore[url] = promise

  return promise
}

async function embedFonts(data: any): Promise<string> {
  return data.cssText.then((resolved: string) => {
    let cssText = resolved
    const regexUrlFind = /url\(["']?([^"')]+)["']?\)/g
    const fontLocations = cssText.match(/url\([^)]+\)/g) || []
    const fontLoadedPromises = fontLocations.map((location: string) => {
      let url = location.replace(regexUrlFind, '$1')
      if (!url.startsWith('https://')) {
        const source = data.url
        url = new URL(url, source).href
      }
      return new Promise((resolve, reject) => {
        fetch(url)
          .then((res: Response) => res.blob())
          .then((blob) => {
            const reader = new FileReader()
            reader.addEventListener('load', (res: Event) => {
              // Side Effect
              cssText = cssText.replace(location, `url(${reader.result})`)
              resolve([location, reader.result])
            })
            reader.readAsDataURL(blob)
          })
          .catch(reject)
      })
    })
    return Promise.all(fontLoadedPromises).then(() => cssText)
  })
}
