import { toArray } from './utils'
import embedResources, { shouldEmbed } from './embedResources'

function getCssRules(styleSheets) {
  return styleSheets.reduce((memo, sheet) => {
    try {
      if (sheet.cssRules) {
        memo.push(...toArray(sheet.cssRules))
      }
    } catch (e) {
      // eslint-disable-next-line
      console.log(`Error while reading CSS rules from ${sheet.href}`, e.toString())
    }

    return memo
  }, [])
}

function getWebFontRules(cssRules) {
  return cssRules
    .filter(rule => rule.type === CSSRule.FONT_FACE_RULE)
    .filter(rule => shouldEmbed(rule.style.getPropertyValue('src')))
}

export function parseWebFontRules() {
  return Promise.resolve(toArray(document.styleSheets))
    .then(getCssRules)
    .then(getWebFontRules)
}

export default function embedWebFonts(clonedNode, options) {
  return parseWebFontRules()
    .then(rules => Promise.all(rules.map((rule) => {
      const baseUrl = (rule.parentStyleSheet || {}).href
      return embedResources(rule.cssText, baseUrl, options)
    })))
    .then(cssStrings => cssStrings.join('\n'))
    .then((cssString) => {
      const styleNode = document.createElement('style')

      styleNode.appendChild(document.createTextNode(cssString))
      clonedNode.appendChild(styleNode)

      return clonedNode
    })
}
