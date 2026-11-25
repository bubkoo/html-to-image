import {
  readDOMMethod,
  readDOMProperty,
  readOptionalDOMProperty,
  writeDOMProperty,
} from './dom.js'
import { readDocumentProperty } from './document.js'
import type { Options } from './types.js'
import { getTask } from './task.js'
import { uuid } from './util.js'

export function cloneScrollState<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
  scrollLeft = readDOMProperty(nativeNode, 'scrollLeft'),
  scrollTop = readDOMProperty(nativeNode, 'scrollTop'),
) {
  if (!scrollLeft && !scrollTop) return
  const children = Array.from(readDOMProperty(clonedNode, 'children'))
  const hasDirectText = Array.from(
    readDOMProperty(clonedNode, 'childNodes'),
  ).some(
    (child) =>
      readDOMProperty(child, 'nodeType') === Node.TEXT_NODE &&
      readDOMProperty(child, 'textContent')?.trim(),
  )
  const hasInline = children.some((child) =>
    readDOMProperty(
      readDOMProperty(child as HTMLElement, 'style'),
      'display',
    ).startsWith('inline'),
  )
  const task = getTask(options)
  const descendants = Array.from(
    readDOMMethod(clonedNode, 'querySelectorAll')('*'),
  )
  const positioned = descendants.filter((child) =>
    ['fixed', 'absolute'].includes(
      readOptionalDOMProperty(
        readDOMProperty(child as HTMLElement, 'style'),
        'position',
      ),
    ),
  ) as HTMLElement[]
  const fixed = positioned.filter(
    (child) =>
      readDOMProperty(readDOMProperty(child, 'style'), 'position') === 'fixed',
  ) as HTMLElement[]
  const original = task?.getCloneSource(clonedNode) || nativeNode
  const hasSticky = descendants.some(
    (child) =>
      readOptionalDOMProperty(
        readDOMProperty(child as HTMLElement, 'style'),
        'position',
      ) === 'sticky',
  )
  const shiftMargins = (element: HTMLElement, left: number, top: number) => {
    const style = readDOMProperty(element, 'style')
    const margins = [
      ['margin-left', -left],
      ['margin-right', left],
      ['margin-top', -top],
      ['margin-bottom', top],
    ] as const
    margins.forEach(([property, delta]) => {
      if (!delta) return
      const value = readDOMMethod(style, 'getPropertyValue')(property) || '0px'
      readDOMMethod(style, 'setProperty')(
        property,
        `calc(${value} ${delta < 0 ? '-' : '+'} ${Math.abs(delta)}px)`,
        'important',
      )
    })
  }
  const shiftPositioned = (element: HTMLElement) => {
    const source = task?.getCloneSource(element) as HTMLElement | undefined
    if (readOptionalDOMProperty(source, 'offsetParent') !== original) return
    // Use the source browser's containing block, rather than guessing from a
    // subset of CSS properties. Insets do not create another containing block
    // for nested fixed descendants, as an added transform would.
    const style = readDOMProperty(element, 'style')
    const shift = (start: string, end: string, amount: number) => {
      if (!amount) return
      const value = readDOMMethod(style, 'getPropertyValue')(start)
      const opposite = readDOMMethod(style, 'getPropertyValue')(end)
      if (value && value !== 'auto') {
        readDOMMethod(style, 'setProperty')(
          start,
          `calc(${value} - ${amount}px)`,
          'important',
        )
        readDOMMethod(style, 'setProperty')(end, 'auto', 'important')
      } else if (opposite && opposite !== 'auto') {
        readDOMMethod(style, 'setProperty')(
          end,
          `calc(${opposite} + ${amount}px)`,
          'important',
        )
      }
    }
    shift('left', 'right', scrollLeft)
    shift('top', 'bottom', scrollTop)
  }
  if (
    task &&
    positioned.length &&
    !hasDirectText &&
    ['flex', 'inline-flex'].includes(
      readDOMProperty(readDOMProperty(clonedNode, 'style'), 'display'),
    ) &&
    readDOMProperty(readDOMProperty(clonedNode, 'style'), 'writingMode') ===
      'horizontal-tb' &&
    !hasSticky &&
    children.every((child) => {
      const style = readDOMProperty(child as HTMLElement, 'style')
      return (
        readDOMProperty(style, 'display') !== 'contents' &&
        (!scrollLeft ||
          (readDOMProperty(style, 'marginLeft') !== 'auto' &&
            readDOMProperty(style, 'marginRight') !== 'auto')) &&
        (!scrollTop ||
          (readDOMProperty(style, 'marginTop') !== 'auto' &&
            readDOMProperty(style, 'marginBottom') !== 'auto'))
      )
    })
  ) {
    // Opposite margins translate each flex item on both axes without changing
    // its outer size, flex lines or containing blocks. Unlike block margins,
    // flex-item margins cannot collapse. Added transforms would re-anchor
    // positioned descendants of ordinary wrappers.
    children.forEach((child) => {
      const style = readDOMProperty(child as HTMLElement, 'style')
      if (['fixed', 'absolute'].includes(readDOMProperty(style, 'position')))
        return
      shiftMargins(child as HTMLElement, scrollLeft, scrollTop)
    })
    positioned.forEach(shiftPositioned)
    writeDOMProperty(readDOMProperty(clonedNode, 'style'), 'overflow', 'hidden')
    return
  }
  const canShiftBlockX =
    !scrollLeft ||
    (!hasDirectText &&
      !hasInline &&
      !hasSticky &&
      children.every((child) => {
        const style = readDOMProperty(child as HTMLElement, 'style')
        // Pseudo cloning appends stylesheet nodes with no inline box styles.
        // They do not participate in the source content flow.
        if (
          readDOMProperty(child, 'tagName') === 'STYLE' &&
          !readDOMProperty(style, 'display')
        )
          return true
        return (
          ['fixed', 'absolute'].includes(readDOMProperty(style, 'position')) ||
          (['block', 'flow-root', 'flex', 'grid', 'table', 'none'].includes(
            readDOMProperty(style, 'display'),
          ) &&
            (!readDOMProperty(style, 'cssFloat') ||
              readDOMProperty(style, 'cssFloat') === 'none') &&
            readDOMProperty(style, 'marginLeft') !== 'auto' &&
            readDOMProperty(style, 'marginRight') !== 'auto')
        )
      }))
  const hasExternalAbsolute = positioned.some((element) => {
    if (
      readDOMProperty(readDOMProperty(element, 'style'), 'position') !==
      'absolute'
    )
      return false
    const source = task?.getCloneSource(element) as HTMLElement | undefined
    const anchor = readOptionalDOMProperty(source, 'offsetParent')
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
    readDOMProperty(readDOMProperty(clonedNode, 'style'), 'display') ===
      'block' &&
    readDOMProperty(readDOMProperty(clonedNode, 'style'), 'writingMode') ===
      'horizontal-tb'
  ) {
    const view =
      readDocumentProperty(
        readDOMProperty(original, 'ownerDocument'),
        'defaultView',
      ) || window
    const before = readDOMMethod(view, 'getComputedStyle')(original, '::before')
    const after = scrollLeft
      ? readDOMMethod(view, 'getComputedStyle')(original, '::after')
      : undefined
    const empty = (style: CSSStyleDeclaration) =>
      !readDOMProperty(style, 'content') ||
      readDOMProperty(style, 'content') === 'none' ||
      readDOMProperty(style, 'content') === 'normal' ||
      readDOMProperty(style, 'display') === 'none'
    const supported = (style: CSSStyleDeclaration) =>
      empty(style) ||
      (['block', 'flow-root', 'flex', 'grid'].includes(
        readDOMProperty(style, 'display'),
      ) &&
        (!scrollLeft ||
          (readDOMProperty(style, 'marginLeft') !== 'auto' &&
            readDOMProperty(style, 'marginRight') !== 'auto')))
    if (supported(before) && (!after || supported(after))) {
      let beforeDeclarations = ''
      if (scrollTop) {
        const margin =
          readDOMProperty(before, 'marginTop') === 'auto'
            ? '0px'
            : readDOMProperty(before, 'marginTop') || '0px'
        // The nonzero box prevents collapse with a following negative margin.
        // Its height plus margin still totals -scrollTop.
        beforeDeclarations = empty(before)
          ? `all:initial!important;content:""!important;display:block!important;height:1px!important;margin:${-scrollTop - 1}px 0 0!important;overflow:hidden!important;`
          : `margin-top:calc(${margin} - ${scrollTop}px)!important;`
      }
      const pseudoX = (style: CSSStyleDeclaration) =>
        scrollLeft && !empty(style)
          ? `margin-left:calc(${readDOMProperty(style, 'marginLeft') || '0px'} - ${scrollLeft}px)!important;margin-right:calc(${readDOMProperty(style, 'marginRight') || '0px'} + ${scrollLeft}px)!important;`
          : ''
      beforeDeclarations += pseudoX(before)
      const afterDeclarations = after ? pseudoX(after) : ''
      if (beforeDeclarations || afterDeclarations) {
        const className = uuid()
        readDOMMethod(
          readDOMProperty(clonedNode, 'classList'),
          'add',
        )(className)
        if (beforeDeclarations)
          task.addClonedStyle(`.${className}::before { ${beforeDeclarations} }`)
        if (afterDeclarations)
          task.addClonedStyle(`.${className}::after { ${afterDeclarations} }`)
      }
      if (scrollLeft)
        children.forEach((child) => {
          const element = child as HTMLElement
          if (
            !['fixed', 'absolute'].includes(
              readDOMProperty(readDOMProperty(element, 'style'), 'position'),
            )
          )
            shiftMargins(element, scrollLeft, 0)
        })
      positioned.forEach(shiftPositioned)
      writeDOMProperty(
        readDOMProperty(clonedNode, 'style'),
        'overflow',
        'hidden',
      )
      return
    }
  }
  // Moving every child with a transform prevents sticky positioning from
  // using the scrollport. In a block scroller, shifting the first in-flow
  // child's margin moves the flow while leaving sticky layout to the browser.
  if (
    scrollLeft === 0 &&
    scrollTop > 0 &&
    readDOMProperty(readDOMProperty(clonedNode, 'style'), 'display') ===
      'block' &&
    !hasDirectText &&
    children.some(
      (child) =>
        readDOMProperty(
          readDOMProperty(child as HTMLElement, 'style'),
          'position',
        ) === 'sticky',
    ) &&
    children.every((child) => {
      const childStyle = readDOMProperty(child as HTMLElement, 'style')
      const display = readDOMProperty(childStyle, 'display')
      const position = readDOMProperty(childStyle, 'position')
      return (
        !display.startsWith('inline') &&
        display !== 'contents' &&
        position !== 'absolute'
      )
    })
  ) {
    const firstFlowChild = children.find((child) => {
      const style = readDOMProperty(child as HTMLElement, 'style')
      return (
        readDOMProperty(style, 'display') !== 'none' &&
        readDOMProperty(style, 'position') !== 'fixed'
      )
    }) as HTMLElement | undefined
    const margin =
      (firstFlowChild &&
        readDOMProperty(
          readDOMProperty(firstFlowChild, 'style'),
          'marginTop',
        )) ||
      '0px'
    if (firstFlowChild && margin !== 'auto') {
      writeDOMProperty(
        readDOMProperty(firstFlowChild, 'style'),
        'marginTop',
        `calc(${margin} - ${scrollTop}px)`,
      )
      fixed.forEach(shiftPositioned)
      writeDOMProperty(
        readDOMProperty(clonedNode, 'style'),
        'overflow',
        'hidden',
      )
      return
    }
  }
  const isSupportedSticky = (child: Element, index: number) => {
    const style = readDOMProperty(child as HTMLElement, 'style')
    return (
      index === 0 &&
      scrollLeft === 0 &&
      readDOMProperty(style, 'position') === 'sticky' &&
      parseFloat(readDOMProperty(style, 'top')) === 0 &&
      (!readDOMProperty(style, 'bottom') ||
        readDOMProperty(style, 'bottom') === 'auto')
    )
  }
  const hasUnsupportedPosition = children.some((child, index) => {
    const style = readDOMProperty(child as HTMLElement, 'style')
    return (
      (readDOMProperty(style, 'position') === 'sticky' &&
        !isSupportedSticky(child, index)) ||
      readDOMProperty(style, 'display') === 'inline'
    )
  })
  if (hasDirectText || hasUnsupportedPosition) return
  const x = -scrollLeft
  const y = -scrollTop
  children.forEach((child, index) => {
    const element = child as HTMLElement
    if (
      readDOMProperty(readDOMProperty(element, 'style'), 'position') === 'fixed'
    ) {
      shiftPositioned(element)
      // Translated siblings create stacking contexts above an auto-z fixed child.
      if (
        !readDOMProperty(readDOMProperty(element, 'style'), 'zIndex') ||
        readDOMProperty(readDOMProperty(element, 'style'), 'zIndex') === 'auto'
      ) {
        writeDOMProperty(readDOMProperty(element, 'style'), 'zIndex', '1')
      }
      return
    }
    if (isSupportedSticky(child, index)) {
      // Transformed siblings become stacking contexts; keep the sticky header
      // above the normal-flow content as it appears in the live scroller.
      if (
        !readDOMProperty(readDOMProperty(element, 'style'), 'zIndex') ||
        readDOMProperty(readDOMProperty(element, 'style'), 'zIndex') === 'auto'
      ) {
        writeDOMProperty(readDOMProperty(element, 'style'), 'zIndex', '1')
      }
      return
    }
    const transform = readDOMProperty(
      readDOMProperty(element, 'style'),
      'transform',
    )
    writeDOMProperty(
      readDOMProperty(element, 'style'),
      'transform',
      `translate(${x}px, ${y}px) ${
        transform && transform !== 'none' ? transform : ''
      }`.trim(),
    )
  })
  // SVG foreignObject serialization loses the live scroll offset. Preserve
  // the source viewport by clipping the shifted copy instead.
  writeDOMProperty(readDOMProperty(clonedNode, 'style'), 'overflow', 'hidden')
}
