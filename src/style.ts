import type { Options } from './types'
import { getStyleProperties, isInstanceOfElement, traverse } from './util'

const SKIPPED_STYLE_PROPS = new Set([
  '-webkit-text-fill-color',
  '-webkit-text-stroke',
  '-webkit-text-stroke-color',
  '-webkit-text-stroke-width',
])

export function applyStyle<T extends HTMLElement>(
  node: T,
  options: Options,
): T {
  if (options.width) {
    node.style.width = `${options.width}px`
  }

  if (options.height) {
    node.style.height = `${options.height}px`
  }

  const manual = options.style
  if (manual != null) {
    Object.keys(manual).forEach((key: any) => {
      node.style[key] = manual[key] as string
    })
  }

  return node
}

export function inlineCSSStyle<T extends HTMLElement>(
  clonedNode: T,
  options: Options,
) {
  const styleProps = getStyleProperties(options)

  traverse(clonedNode, (node) => {
    if (isChildOfSvg(node)) {
      return
    }

    const computedStyles = window.getComputedStyle(node)
    const isParentGridOrFlex =
      node.parentElement &&
      isFlexOrGridDisplay(window.getComputedStyle(node.parentElement).display)
    const isIframe = isInstanceOfElement(node, HTMLIFrameElement)
    const nodeStyles = new Map<string, { value: string; priority: string }>()

    styleProps.forEach((name) => {
      if (SKIPPED_STYLE_PROPS.has(name)) {
        return
      }

      if ((name === 'width' || name === 'inline-size') && isParentGridOrFlex) {
        return
      }

      let value = computedStyles.getPropertyValue(name)
      if (name === 'font-kerning') {
        value = 'normal'
      }

      if (isIframe && name === 'display' && value === 'inline') {
        value = 'block'
      }

      if (name === 'd' && node.getAttribute('d')) {
        value = `path(${node.getAttribute('d')})`
      }

      nodeStyles.set(name, {
        value,
        priority: computedStyles.getPropertyPriority(name),
      })
    })

    nodeStyles.forEach(({ value, priority }, key) => {
      node.style.setProperty(key, value, priority)
    })
  })
}

function isChildOfSvg(node: Element) {
  const closestSvg = node.closest('svg')

  return closestSvg != null && closestSvg !== node
}

function isFlexOrGridDisplay(display: string) {
  return display.includes('flex') || display.includes('grid')
}
