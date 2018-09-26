import { toArray, uuid } from './utils'

export type PseudoType = ':before' | ':after'

function formatCssText(style: CSSStyleDeclaration): string {
  const content = style.getPropertyValue('content')
  return `${style.cssText} content: ${content};`
}

function formatCssProperties(style: CSSStyleDeclaration): string {
  return toArray<string>(style).map((name) => {
    const value = style.getPropertyValue(name)
    const priority = style.getPropertyPriority(name)

    return `${name}: ${value}${priority ? ' !important' : ''};`
  }).join(' ')
}

function getPseudoElementStyle(
  className: string,
  pseudo: PseudoType,
  style: CSSStyleDeclaration,
): Text {
  const selector = `.${className}:${pseudo}`
  const cssText = style.cssText ? formatCssText(style) : formatCssProperties(style)

  return document.createTextNode(`${selector}{${cssText}}`)
}

function clonePseudoElement(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
  pseudo: PseudoType,
) {
  const style = window.getComputedStyle(nativeNode, pseudo)
  const content = style.getPropertyValue('content')

  if (content === '' || content === 'none') {
    return
  }

  const className = uuid()
  const styleElement = document.createElement('style')
  styleElement.appendChild(getPseudoElementStyle(className, pseudo, style))
  clonedNode.className = `${clonedNode.className} ${className}`
  clonedNode.appendChild(styleElement)
}

export default function clonePseudoElements(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
) {
  [
    ':before',
    ':after',
  ].forEach((pseudo: PseudoType) => clonePseudoElement(nativeNode, clonedNode, pseudo))
}
