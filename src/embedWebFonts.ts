import { toArray } from './utils'
import embedResources, { shouldEmbed } from './embedResources'

function parseCSS(source:string) {

  if (source === undefined) {
    return []
  }

  let cssText = source
  const css = []
  const cssKeyframeRegex = '((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})'
  const combinedCSSRegex = '((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]'
  + '*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})' // to match css & media queries together
  const cssCommentsRegex = new RegExp('(\\/\\*[\\s\\S]*?\\*\\/)', 'gi')

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
    arr = unified.exec(cssText)
    if (arr === null) {
      break
    }
    css.push(arr[0])
  }

  return css
}

function fetchCSS(url: string, sheet: StyleSheet): Promise<any> {
  return fetch(url).then((res: Response) => {
    return {
      url,
      cssText:res.text(),
    }
  },                     (e) => {
    console.log('ERROR FETCHING CSS: ', e.toString())
  })
}

function embedFonts(data: any): Promise<string> {
  return data.cssText.then((resolved: string) => {
    let cssText = resolved
    const fontLocations = cssText.match(/url\([^)]+\)/g) || []
    const fontLoadedPromises = fontLocations.map((location: string) => {
      let url = location.replace(/url\(([^]+)\)/g, '$1')
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

function getCssRules(styleSheets: CSSStyleSheet[]): Promise<CSSStyleRule[]> {
  const ret: CSSStyleRule[] = []
  const promises: Promise<number | void>[] = []

  // First loop inlines imports
  styleSheets.forEach((sheet) => {
    if ('cssRules' in sheet) {
      try {
        toArray<CSSRule>(sheet.cssRules).forEach((item: CSSRule) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            promises.push(fetchCSS((item as CSSImportRule).href, sheet)
              .then(embedFonts)
              .then((cssText: any) => {
                const parsed = parseCSS(cssText)
                parsed.forEach((rule:any) => {
                  sheet.insertRule(rule, sheet.cssRules.length)
                })
              })
              .catch((e) => {
                console.log('Error loading remote css', e.toString())
              }))
          }
        })
      } catch (e) {
        const inline = styleSheets.find(a => a.href === null) || document.styleSheets[0]
        if (sheet.href != null) {
          promises.push(fetchCSS(sheet.href, inline)
            .then(embedFonts)
            .then((cssText: any) => {
              const parsed = parseCSS(cssText)
              parsed.forEach((rule:any) => {
                (inline as CSSStyleSheet).insertRule(rule, sheet.cssRules.length)
              })
            })
            .catch((e) => {
              console.log('Error loading remote stylesheet', e.toString())
            }))
        }
        console.log('Error inlining remote css file', e.toString())
      }
    }
  })

  return Promise
    .all(promises)
    .then(() => {

      // Second loop parses rules
      styleSheets.forEach((sheet) => {
        if ('cssRules' in sheet) {
          try {
            toArray<CSSStyleRule>(sheet.cssRules).forEach((item: CSSStyleRule) => {
              ret.push(item)
            })
          } catch (e) {
            console.log(`Error while reading CSS rules from ${sheet.href}`, e.toString())
          }
        }
      })

      return ret
    })
}

function getWebFontRules(cssRules: CSSStyleRule[]): CSSStyleRule[] {
  return cssRules
    .filter(rule => rule.type === CSSRule.FONT_FACE_RULE)
    .filter(rule => shouldEmbed(rule.style.getPropertyValue('src')))
}

export function parseWebFontRules(clonedNode: HTMLElement): Promise<CSSRule[]> {
  return new Promise((resolve, reject) => {
    if (!clonedNode.ownerDocument) {
      reject(new Error('Provided element is not within a Document'))
    }
    resolve(toArray(clonedNode.ownerDocument!.styleSheets))
  })
    .then(getCssRules)
    .then(getWebFontRules)
}

export default function embedWebFonts(
  clonedNode: HTMLElement,
  options: Object,
): Promise<HTMLElement> {
  return parseWebFontRules(clonedNode)
    .then(rules => Promise.all(rules.map((rule) => {
      const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null
      return embedResources(rule.cssText, baseUrl, options)
    })))
    .then(cssStrings => cssStrings.join('\n'))
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
