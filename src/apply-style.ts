import { readDOMProperty, writeDOMProperty } from './dom.js'
import type { Options } from './types.js'

export function applyStyle<T extends HTMLElement>(
  node: T,
  options: Options,
): T {
  const style = readDOMProperty(node, 'style')

  if (options.backgroundColor) {
    writeDOMProperty(style, 'backgroundColor', options.backgroundColor)
  }

  if (options.width != null) {
    writeDOMProperty(style, 'width', `${options.width}px`)
  }

  if (options.height != null) {
    writeDOMProperty(style, 'height', `${options.height}px`)
  }

  const manual = options.style
  if (manual != null) {
    Object.keys(manual).forEach((key: any) => {
      writeDOMProperty(style, key, manual[key] as string)
    })
  }

  return node
}
