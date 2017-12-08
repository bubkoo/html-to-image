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

export function parseWebFontRules(clonedNode) {
  return new Promise((resolve, reject) => {
    if (!clonedNode.ownerDocument) {
      reject(new Error('Provided element is not within a Document'))
    }
    resolve(toArray(clonedNode.ownerDocument.styleSheets))
  })
    .then(getCssRules)
    .then(getWebFontRules)
}

export default function embedWebFonts(clonedNode, options) {
  return parseWebFontRules(clonedNode)
    .then(rules => Promise.all(rules.map((rule) => {
      const baseUrl = (rule.parentStyleSheet || {}).href
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
