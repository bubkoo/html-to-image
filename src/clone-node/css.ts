import type { ClonableElement } from './types'

export function cloneCSSText<T extends ClonableElement>(
  nativeNode: T,
  clonedNode: T,
) {
  const targetStyle = clonedNode.style
  if (!targetStyle) {
    return
  }

  const sourceStyle = window.getComputedStyle(nativeNode)
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText
    targetStyle.transformOrigin = sourceStyle.transformOrigin
  }
}
