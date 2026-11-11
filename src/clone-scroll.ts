import type { Options } from './types.js'
import { getTask } from './task.js'
import { uuid } from './util.js'

export function cloneScrollState<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  scrollLeft = nativeNode.scrollLeft,
  scrollTop = nativeNode.scrollTop,
) {
  if (!scrollLeft && !scrollTop) return
  const children = Array.from(clonedNode.children)
  const hasDirectText = Array.from(clonedNode.childNodes).some(
    (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
  )
  const hasInline = children.some((child) =>
    (child as HTMLElement).style.display.startsWith('inline'),
  )
  const task = getTask(options)
  if (
    task &&
    (hasDirectText || hasInline) &&
    scrollLeft === 0 &&
    scrollTop > 0 &&
    clonedNode.style.display === 'block' &&
    clonedNode.style.writingMode === 'horizontal-tb' &&
    !Array.from(clonedNode.querySelectorAll('*')).some(
      (child) => (child as HTMLElement).style?.position === 'absolute',
    )
  ) {
    const original = task.getCloneSource(clonedNode) || nativeNode
    const before = (
      original.ownerDocument.defaultView || window
    ).getComputedStyle(original, '::before')
    const empty =
      !before.content ||
      before.content === 'none' ||
      before.content === 'normal' ||
      before.display === 'none'
    if (
      empty ||
      ['block', 'flow-root', 'flex', 'grid'].includes(before.display)
    ) {
      const className = uuid()
      clonedNode.classList.add(className)
      const margin =
        before.marginTop === 'auto' ? '0px' : before.marginTop || '0px'
      // A nonzero box prevents its top margin collapsing with a following
      // negative margin. Its height plus margin still totals -scrollTop.
      const declarations = empty
        ? `all:initial!important;content:""!important;display:block!important;height:1px!important;margin:${-scrollTop - 1}px 0 0!important;overflow:hidden!important;`
        : `margin-top:calc(${margin} - ${scrollTop}px)!important;`
      task.addClonedStyle(`.${className}::before { ${declarations} }`)
      // A fixed child whose containing block is this transformed scroller
      // scrolls with that block, while viewport-fixed children stay anchored.
      if (clonedNode.style.transform && clonedNode.style.transform !== 'none') {
        children.forEach((child) => {
          const style = (child as HTMLElement).style
          if (style.position === 'fixed') {
            const transform = style.transform
            style.transform =
              `translate(0px, ${-scrollTop}px) ${transform && transform !== 'none' ? transform : ''}`.trim()
          }
        })
      }
      clonedNode.style.overflow = 'hidden'
      return
    }
  }
  // Moving every child with a transform prevents sticky positioning from
  // using the scrollport. In a block scroller, shifting the first in-flow
  // child's margin moves the flow while leaving sticky layout to the browser.
  if (
    scrollLeft === 0 &&
    scrollTop > 0 &&
    clonedNode.style.display === 'block' &&
    !hasDirectText &&
    children.some(
      (child) => (child as HTMLElement).style.position === 'sticky',
    ) &&
    children.every((child) => {
      const { display, position } = (child as HTMLElement).style
      return (
        !display.startsWith('inline') &&
        display !== 'contents' &&
        position !== 'absolute'
      )
    })
  ) {
    const firstFlowChild = children.find((child) => {
      const style = (child as HTMLElement).style
      return style.display !== 'none' && style.position !== 'fixed'
    }) as HTMLElement | undefined
    const margin = firstFlowChild?.style.marginTop || '0px'
    if (firstFlowChild && margin !== 'auto') {
      firstFlowChild.style.marginTop = `calc(${margin} - ${scrollTop}px)`
      clonedNode.style.overflow = 'hidden'
      return
    }
  }
  const isSupportedSticky = (child: Element, index: number) => {
    const style = (child as HTMLElement).style
    return (
      index === 0 &&
      scrollLeft === 0 &&
      style.position === 'sticky' &&
      parseFloat(style.top) === 0 &&
      (!style.bottom || style.bottom === 'auto')
    )
  }
  const hasUnsupportedPosition = children.some((child, index) => {
    const style = (child as HTMLElement).style
    return (
      (style.position === 'sticky' && !isSupportedSticky(child, index)) ||
      style.display === 'inline'
    )
  })
  if (hasDirectText || hasUnsupportedPosition) return
  const x = -scrollLeft
  const y = -scrollTop
  children.forEach((child, index) => {
    const element = child as HTMLElement
    if (element.style.position === 'fixed') {
      // Translated siblings create stacking contexts above an auto-z fixed child.
      if (!element.style.zIndex || element.style.zIndex === 'auto') {
        element.style.zIndex = '1'
      }
      return
    }
    if (isSupportedSticky(child, index)) {
      // Transformed siblings become stacking contexts; keep the sticky header
      // above the normal-flow content as it appears in the live scroller.
      if (!element.style.zIndex || element.style.zIndex === 'auto') {
        element.style.zIndex = '1'
      }
      return
    }
    const transform = element.style.transform
    element.style.transform = `translate(${x}px, ${y}px) ${
      transform && transform !== 'none' ? transform : ''
    }`.trim()
  })
  // SVG foreignObject serialization loses the live scroll offset. Preserve
  // the source viewport by clipping the shifted copy instead.
  clonedNode.style.overflow = 'hidden'
}
