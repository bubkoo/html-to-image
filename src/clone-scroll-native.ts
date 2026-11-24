import {
  readDOMMethod,
  readDOMProperty,
  readOptionalDOMProperty,
} from './dom.js'
import type { CaptureTask } from './task.js'
import { uuid } from './util.js'

const emptyPseudo = (style: CSSStyleDeclaration) =>
  !readDOMProperty(style, 'content') ||
  readDOMProperty(style, 'content') === 'none' ||
  readDOMProperty(style, 'content') === 'normal' ||
  readDOMProperty(style, 'display') === 'none'

export function cloneNativeScroll(
  original: HTMLElement,
  clone: HTMLElement,
  task: CaptureTask,
  x: number,
  y: number,
) {
  const style = readDOMProperty(clone, 'style')
  const descendants = Array.from(
    readDOMMethod(clone, 'querySelectorAll')('*'),
  ) as HTMLElement[]
  const containsPositionedBox =
    (readDOMProperty(style, 'position') &&
      readDOMProperty(style, 'position') !== 'static') ||
    (readDOMProperty(style, 'transform') &&
      readDOMProperty(style, 'transform') !== 'none') ||
    descendants.some(
      (child) =>
        readOptionalDOMProperty(
          task.getCloneSource(child) as HTMLElement | undefined,
          'offsetParent',
        ) === original,
    )
  const view =
    readDOMProperty(
      readDOMProperty(original, 'ownerDocument'),
      'defaultView',
    ) || window
  const before = readDOMMethod(view, 'getComputedStyle')(original, '::before')
  const after = containsPositionedBox
    ? readDOMMethod(view, 'getComputedStyle')(original, '::after')
    : undefined
  const pseudo = emptyPseudo(before)
    ? 'before'
    : after && emptyPseudo(after)
      ? 'after'
      : undefined
  if (
    !pseudo ||
    (!containsPositionedBox &&
      (!['block', 'flow-root'].includes(readDOMProperty(style, 'display')) ||
        readDOMProperty(style, 'writingMode') !== 'horizontal-tb' ||
        y < 0))
  )
    return false

  // Snapping affects positioning, not paint. Retire competing source targets
  // in the frozen copy, including pseudo targets, while leaving the source
  // and the container's own alignment in its parent unchanged.
  descendants.forEach((child) => {
    const source = task.getCloneSource(child)
    if (!source || !readDOMProperty(child, 'style')) return
    const align = task.getInheritedStyleValue(source, 'scroll-snap-align')
    if (align && align !== 'none')
      readDOMMethod(readDOMProperty(child, 'style'), 'setProperty')(
        'scroll-snap-align',
        'none',
        'important',
      )
    if (
      !Array.from(readDOMProperty(child, 'children')).some(
        (node) => readDOMProperty(node, 'tagName') === 'STYLE',
      )
    )
      return
    const sourceView =
      readDOMProperty(
        readDOMProperty(source, 'ownerDocument'),
        'defaultView',
      ) || window
    ;['before', 'after'].forEach((name) => {
      const value = readDOMMethod(sourceView, 'getComputedStyle')(
        source,
        `::${name}`,
      )
      if (
        !emptyPseudo(value) &&
        readDOMProperty(value, 'scrollSnapAlign') !== 'none'
      ) {
        const id = uuid()
        readDOMMethod(readDOMProperty(child, 'classList'), 'add')(id)
        task.addClonedStyle(
          `.${id}::${name}{scroll-snap-align:none!important;}`,
        )
      }
    })
  })

  const id = uuid()
  readDOMMethod(readDOMProperty(clone, 'classList'), 'add')(id)
  const number = (name: string) =>
    parseFloat(task.getInheritedStyleValue(original, name)) || 0
  // Snap alignment includes reserved gutter space in its start edge. The
  // source scroll offset excludes that space; keep the target's snap area
  // size while translating it by the physical gutter at the logical start.
  const gutterLeft =
    readDOMProperty(original, 'clientLeft') -
    Math.round(number('border-left-width'))
  const gutterRight =
    readDOMProperty(original, 'offsetWidth') -
    readDOMProperty(original, 'clientWidth') -
    readDOMProperty(original, 'clientLeft') -
    Math.round(number('border-right-width'))
  const gutterTop =
    readDOMProperty(original, 'clientTop') -
    Math.round(number('border-top-width'))
  const gutterBottom =
    readDOMProperty(original, 'offsetHeight') -
    readDOMProperty(original, 'clientHeight') -
    readDOMProperty(original, 'clientTop') -
    Math.round(number('border-bottom-width'))
  const horizontal = readDOMProperty(style, 'writingMode') === 'horizontal-tb'
  const xFromEnd = horizontal
    ? readDOMProperty(style, 'direction') === 'rtl'
    : readDOMProperty(style, 'writingMode').endsWith('-rl')
  const yFromEnd = !horizontal && readDOMProperty(style, 'direction') === 'rtl'
  const originX = xFromEnd ? -gutterRight : gutterLeft
  const originY = yFromEnd ? -gutterBottom : gutterTop
  let declarations: string
  if (containsPositionedBox) {
    // An absolute target is safe only inside a source containing block. Its
    // percentage dimensions describe the native scrollport without adding a
    // flex/grid item or rounding a fractional CSS viewport to clientHeight.
    declarations = `position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;margin:0!important;scroll-margin-left:${originX - x}px!important;scroll-margin-right:${x - originX}px!important;scroll-margin-top:${originY - y}px!important;scroll-margin-bottom:${y - originY}px!important;`
  } else {
    // A float with zero outer width/height leaves the normal flow untouched.
    // Its margins cannot collapse, and its border box never extends above
    // the scrollport. A negative top margin can shift SVG text painting in
    // WebKit even while its DOM layout rectangles report the correct offset.
    const left = number('padding-left')
    const right = number('padding-right')
    const top = number('padding-top')
    declarations = `display:block!important;float:left!important;width:100%!important;height:1px!important;margin:0 -100% -1px 0!important;overflow:hidden!important;scroll-margin-left:${left + originX - x}px!important;scroll-margin-right:${x + right - originX}px!important;scroll-margin-top:${top - y}px!important;scroll-margin-bottom:${y + readDOMProperty(original, 'clientHeight') - top - 1}px!important;`
  }
  task.addClonedStyle(
    `.${id}::${pseudo}{all:initial!important;content:""!important;scroll-snap-align:start start!important;${declarations}}`,
  )
  readDOMMethod(style, 'setProperty')(
    'scroll-snap-type',
    'both mandatory',
    'important',
  )
  readDOMMethod(style, 'setProperty')('scroll-padding', '0px', 'important')
  readDOMMethod(style, 'setProperty')('scroll-behavior', 'auto', 'important')
  return true
}
