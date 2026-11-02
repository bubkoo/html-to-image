import { uuid, getStyleProperties } from './util.js'

type Pseudo = ':before' | ':after'

function formatCSSText(style: CSSStyleDeclaration) {
  const content = style.getPropertyValue('content')
  return `${style.cssText} content: '${content.replace(/'|"/g, '')}';`
}

function formatCSSProperties(
  style: CSSStyleDeclaration,
  selected?: readonly string[],
) {
  return getStyleProperties(style, selected)
    .map((name) => {
      const value = style.getPropertyValue(name)
      const priority = style.getPropertyPriority(name)

      return `${name}: ${value}${priority ? ' !important' : ''};`
    })
    .join(' ')
}

function getPseudoElementStyle(
  className: string,
  pseudo: Pseudo,
  style: CSSStyleDeclaration,
  selected?: readonly string[],
): Text {
  const selector = `.${className}:${pseudo}`
  const cssText =
    style.cssText && selected == null
      ? formatCSSText(style)
      : formatCSSProperties(style, selected)

  return document.createTextNode(`${selector}{${cssText}}`)
}

function clonePseudoElement<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  pseudo: Pseudo,
  selected?: readonly string[],
) {
  const style = (
    nativeNode.ownerDocument.defaultView || window
  ).getComputedStyle(nativeNode, pseudo)
  const content = style.getPropertyValue('content')
  if (content === '' || content === 'none') {
    return
  }

  const className = uuid()
  try {
    clonedNode.className = `${clonedNode.className} ${className}`
  } catch (err) {
    return
  }

  const styleElement = document.createElement('style')
  styleElement.appendChild(
    getPseudoElementStyle(className, pseudo, style, selected),
  )
  clonedNode.appendChild(styleElement)
}

export function clonePseudoElements<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  selected?: readonly string[],
) {
  clonePseudoElement(nativeNode, clonedNode, ':before', selected)
  clonePseudoElement(nativeNode, clonedNode, ':after', selected)
}
