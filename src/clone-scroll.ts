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
  const positioned = descendants.filter((child) =>
    ['fixed', 'absolute'].includes((child as HTMLElement).style?.position),
  ) as HTMLElement[]
  const fixed = positioned.filter(
    (child) => child.style.position === 'fixed',
  ) as HTMLElement[]
  const original = task?.getCloneSource(clonedNode) || nativeNode
  const hasSticky = descendants.some(
    (child) => (child as HTMLElement).style?.position === 'sticky',
  )
  const shiftMargins = (element: HTMLElement, left: number, top: number) => {
    const { style } = element
    const margins = [
      ['margin-left', -left],
      ['margin-right', left],
      ['margin-top', -top],
      ['margin-bottom', top],
    ] as const
    margins.forEach(([property, delta]) => {
      if (!delta) return
      const value = style.getPropertyValue(property) || '0px'
      style.setProperty(
        property,
        `calc(${value} ${delta < 0 ? '-' : '+'} ${Math.abs(delta)}px)`,
        'important',
      )
    })
  }
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
    task &&
    positioned.length &&
    !hasDirectText &&
    ['flex', 'inline-flex'].includes(clonedNode.style.display) &&
    clonedNode.style.writingMode === 'horizontal-tb' &&
    !hasSticky &&
    children.every((child) => {
      const style = (child as HTMLElement).style
      return (
        style.display !== 'contents' &&
        (!scrollLeft ||
          (style.marginLeft !== 'auto' && style.marginRight !== 'auto')) &&
        (!scrollTop ||
          (style.marginTop !== 'auto' && style.marginBottom !== 'auto'))
      )
    })
  ) {
    // Opposite margins translate each flex item on both axes without changing
    // its outer size, flex lines or containing blocks. Unlike block margins,
    // flex-item margins cannot collapse. Added transforms would re-anchor
    // positioned descendants of ordinary wrappers.
    children.forEach((child) => {
      const { style } = child as HTMLElement
      if (['fixed', 'absolute'].includes(style.position)) return
      shiftMargins(child as HTMLElement, scrollLeft, scrollTop)
    })
    positioned.forEach(shiftPositioned)
    clonedNode.style.overflow = 'hidden'
    return
  }
  const canShiftBlockX =
    !scrollLeft ||
    (!hasDirectText &&
      !hasInline &&
      !hasSticky &&
      children.every((child) => {
        const { style } = child as HTMLElement
        // Pseudo cloning appends stylesheet nodes with no inline box styles.
        // They do not participate in the source content flow.
        if (child.tagName === 'STYLE' && !style.display) return true
        return (
          ['fixed', 'absolute'].includes(style.position) ||
          (['block', 'flow-root', 'flex', 'grid', 'table', 'none'].includes(
            style.display,
          ) &&
            (!style.cssFloat || style.cssFloat === 'none') &&
            style.marginLeft !== 'auto' &&
            style.marginRight !== 'auto')
        )
      }))
  const hasExternalAbsolute = positioned.some((element) => {
    if (element.style.position !== 'absolute') return false
    const source = task?.getCloneSource(element) as HTMLElement | undefined
    const anchor = source?.offsetParent
    // A containing block outside the captured tree has another coordinate
    // origin. Keep its existing fallback until that origin is reconstructed.
    return !anchor || !task?.hasClonedSource(anchor)
  })
  if (
    task &&
    (hasDirectText || hasInline || positioned.length) &&
    canShiftBlockX &&
    !hasExternalAbsolute &&
    scrollTop >= 0 &&
    clonedNode.style.display === 'block' &&
    clonedNode.style.writingMode === 'horizontal-tb'
  ) {
    const view = original.ownerDocument.defaultView || window
    const before = view.getComputedStyle(original, '::before')
    const after = scrollLeft
      ? view.getComputedStyle(original, '::after')
      : undefined
    const empty = (style: CSSStyleDeclaration) =>
      !style.content ||
      style.content === 'none' ||
      style.content === 'normal' ||
      style.display === 'none'
    const supported = (style: CSSStyleDeclaration) =>
      empty(style) ||
      (['block', 'flow-root', 'flex', 'grid'].includes(style.display) &&
        (!scrollLeft ||
          (style.marginLeft !== 'auto' && style.marginRight !== 'auto')))
    if (supported(before) && (!after || supported(after))) {
      let beforeDeclarations = ''
      if (scrollTop) {
        const margin =
          before.marginTop === 'auto' ? '0px' : before.marginTop || '0px'
        // The nonzero box prevents collapse with a following negative margin.
        // Its height plus margin still totals -scrollTop.
        beforeDeclarations = empty(before)
          ? `all:initial!important;content:""!important;display:block!important;height:1px!important;margin:${-scrollTop - 1}px 0 0!important;overflow:hidden!important;`
          : `margin-top:calc(${margin} - ${scrollTop}px)!important;`
      }
      const pseudoX = (style: CSSStyleDeclaration) =>
        scrollLeft && !empty(style)
          ? `margin-left:calc(${style.marginLeft || '0px'} - ${scrollLeft}px)!important;margin-right:calc(${style.marginRight || '0px'} + ${scrollLeft}px)!important;`
          : ''
      beforeDeclarations += pseudoX(before)
      const afterDeclarations = after ? pseudoX(after) : ''
      if (beforeDeclarations || afterDeclarations) {
        const className = uuid()
        clonedNode.classList.add(className)
        if (beforeDeclarations)
          task.addClonedStyle(`.${className}::before { ${beforeDeclarations} }`)
        if (afterDeclarations)
          task.addClonedStyle(`.${className}::after { ${afterDeclarations} }`)
      }
      if (scrollLeft)
        children.forEach((child) => {
          const element = child as HTMLElement
          if (!['fixed', 'absolute'].includes(element.style.position))
            shiftMargins(element, scrollLeft, 0)
        })
      positioned.forEach(shiftPositioned)
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
