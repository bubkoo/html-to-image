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
  const descendants = Array.from(clonedNode.querySelectorAll('*'))
  const fixed = descendants.filter(
    (child) => (child as HTMLElement).style?.position === 'fixed',
  ) as HTMLElement[]
  const original = task?.getCloneSource(clonedNode) || nativeNode
  const shiftPositioned = (element: HTMLElement) => {
    const source = task?.getCloneSource(element) as HTMLElement | undefined
    if (source?.offsetParent !== original) return
    // Use the source browser's containing block, rather than guessing from a
    // subset of CSS properties. Insets do not create another containing block
    // for nested fixed descendants, as an added transform would.
    const { style } = element
    const shift = (start: string, end: string, amount: number) => {
      if (!amount) return
      const value = style.getPropertyValue(start)
      const opposite = style.getPropertyValue(end)
      if (value && value !== 'auto') {
        style.setProperty(start, `calc(${value} - ${amount}px)`, 'important')
        style.setProperty(end, 'auto', 'important')
      } else if (opposite && opposite !== 'auto') {
        style.setProperty(end, `calc(${opposite} + ${amount}px)`, 'important')
      }
    }
    shift('left', 'right', scrollLeft)
    shift('top', 'bottom', scrollTop)
  }
  if (
    fixed.length &&
    !hasDirectText &&
    scrollLeft !== 0 &&
    scrollTop === 0 &&
    ['flex', 'inline-flex'].includes(clonedNode.style.display) &&
    ['row', 'row-reverse'].includes(clonedNode.style.flexDirection) &&
    clonedNode.style.flexWrap === 'nowrap' &&
    clonedNode.style.writingMode === 'horizontal-tb' &&
    !descendants.some(
      (child) => (child as HTMLElement).style?.position === 'sticky',
    ) &&
    children.every((child) => {
      const style = (child as HTMLElement).style
      return (
        style.display !== 'contents' &&
        style.marginLeft !== 'auto' &&
        style.marginRight !== 'auto'
      )
    })
  ) {
    // Opposite margins translate each flex item without changing its outer
    // size or creating a containing block for positioned descendants. An
    // added transform would re-anchor fixed children of ordinary wrappers.
    children.forEach((child) => {
      const { style } = child as HTMLElement
      if (['fixed', 'absolute'].includes(style.position)) return
      style.setProperty(
        'margin-left',
        `calc(${style.marginLeft || '0px'} - ${scrollLeft}px)`,
        'important',
      )
      style.setProperty(
        'margin-right',
        `calc(${style.marginRight || '0px'} + ${scrollLeft}px)`,
        'important',
      )
    })
    descendants.forEach((child) => {
      const element = child as HTMLElement
      if (['fixed', 'absolute'].includes(element.style?.position)) {
        shiftPositioned(element)
      }
    })
    clonedNode.style.overflow = 'hidden'
    return
  }
  if (
    task &&
    (hasDirectText || hasInline || fixed.length) &&
    scrollLeft === 0 &&
    scrollTop > 0 &&
    clonedNode.style.display === 'block' &&
    clonedNode.style.writingMode === 'horizontal-tb' &&
    !descendants.some(
      (child) => (child as HTMLElement).style?.position === 'absolute',
    )
  ) {
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
      fixed.forEach(shiftPositioned)
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
      fixed.forEach(shiftPositioned)
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
      shiftPositioned(element)
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
