import { uuid, toArray } from './util'

namespace Pseudo {
  export type Type = ':before' | ':after'

  export function clonePseudoElement(
    nativeNode: HTMLElement,
    clonedNode: HTMLElement,
    pseudo: Type,
  ) {
    const style = window.getComputedStyle(nativeNode, pseudo)
    const content = style.getPropertyValue('content')
    if (content === '' || content === 'none') {
      return
    }

    const className = uuid()

    // fix: Cannot assign to read only property 'className' of object '#<…
    try {
      clonedNode.className = `${clonedNode.className} ${className}`
    } catch (err) {
      return
    }

    const styleElement = document.createElement('style')
    styleElement.appendChild(getPseudoElementStyle(className, pseudo, style))
    clonedNode.appendChild(styleElement)
  }

  function getPseudoElementStyle(
    className: string,
    pseudo: Type,
    style: CSSStyleDeclaration,
  ): Text {
    const selector = `.${className}:${pseudo}`
    const cssText = style.cssText
      ? formatCssText(style)
      : formatCssProperties(style)

    return document.createTextNode(`${selector}{${cssText}}`)
  }

  function formatCssText(style: CSSStyleDeclaration) {
    const content = style.getPropertyValue('content')
    return `${style.cssText} content: '${content.replace(/'|"/g, '')}';`
  }

  function formatCssProperties(style: CSSStyleDeclaration) {
    return toArray<string>(style)
      .map((name) => {
        const value = style.getPropertyValue(name)
        const priority = style.getPropertyPriority(name)

        return `${name}: ${value}${priority ? ' !important' : ''};`
      })
      .join(' ')
  }
}

export function clonePseudoElements(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
) {
  const pseudos = [':before', ':after']
  pseudos.forEach((pseudo: Pseudo.Type) =>
    Pseudo.clonePseudoElement(nativeNode, clonedNode, pseudo),
  )
}
