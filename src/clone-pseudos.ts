import { readDOMMethod, readDOMProperty, writeDOMProperty } from './dom.js'
import { readDocumentMethod, readDocumentProperty } from './document.js'
import { uuid, getStyleProperties } from './util.js'

type Pseudo = ':before' | ':after'

function formatCSSText(style: CSSStyleDeclaration) {
  const content = readDOMMethod(style, 'getPropertyValue')('content')
  return `${readDOMProperty(style, 'cssText')} content: '${content.replace(/'|"/g, '')}';`
}

function formatCSSProperties(
  style: CSSStyleDeclaration,
  selected?: readonly string[],
) {
  return getStyleProperties(style, selected)
    .map((name) => {
      const value = readDOMMethod(style, 'getPropertyValue')(name)
      const priority = readDOMMethod(style, 'getPropertyPriority')(name)

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
    readDOMProperty(style, 'cssText') && selected == null
      ? formatCSSText(style)
      : formatCSSProperties(style, selected)

  return readDocumentMethod(
    document,
    'createTextNode',
  )(`${selector}{${cssText}}`)
}

function clonePseudoElement<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  pseudo: Pseudo,
  selected?: readonly string[],
) {
  const style = readDOMMethod(
    readDocumentProperty(
      readDOMProperty(nativeNode, 'ownerDocument'),
      'defaultView',
    ) || window,
    'getComputedStyle',
  )(nativeNode, pseudo)
  const content = readDOMMethod(style, 'getPropertyValue')('content')
  if (content === '' || content === 'none') {
    return
  }

  const className = uuid()
  try {
    writeDOMProperty(
      clonedNode,
      'className',
      `${readDOMProperty(clonedNode, 'className')} ${className}`,
    )
  } catch (err) {
    return
  }

  const styleElement = readDocumentMethod(document, 'createElement')('style')
  readDOMMethod(
    styleElement,
    'appendChild',
  )(getPseudoElementStyle(className, pseudo, style, selected))
  readDOMMethod(clonedNode, 'appendChild')(styleElement)
}

export function clonePseudoElements<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  selected?: readonly string[],
) {
  clonePseudoElement(nativeNode, clonedNode, ':before', selected)
  clonePseudoElement(nativeNode, clonedNode, ':after', selected)
}
