import { Options } from './index'

export function applyStyleWithOptions(
  clonedNode: HTMLElement,
  options: Options,
): HTMLElement {
  const { style } = clonedNode

  if (options.backgroundColor) {
    style.backgroundColor = options.backgroundColor
  }

  if (options.width) {
    style.width = `${options.width}px`
  }

  if (options.height) {
    style.height = `${options.height}px`
  }

  const manual = options.style
  if (manual != null) {
    Object.keys(manual).forEach((key) => {
      // @ts-expect-error
      style[key] = manual[key]
    })
  }

  return clonedNode
}
