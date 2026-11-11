import type { CaptureTask } from './task.js'
import { uuid } from './util.js'

const emptyPseudo = (style: CSSStyleDeclaration) =>
  !style.content ||
  style.content === 'none' ||
  style.content === 'normal' ||
  style.display === 'none'

export function cloneNativeScroll(
  original: HTMLElement,
  clone: HTMLElement,
  task: CaptureTask,
  x: number,
  y: number,
) {
  const { style } = clone
  const descendants = Array.from(clone.querySelectorAll('*')) as HTMLElement[]
  const containsPositionedBox =
    (style.position && style.position !== 'static') ||
    (style.transform && style.transform !== 'none') ||
    descendants.some(
      (child) =>
        (task.getCloneSource(child) as HTMLElement | undefined)
          ?.offsetParent === original,
    )
  const view = original.ownerDocument.defaultView || window
  const before = view.getComputedStyle(original, '::before')
  const after = containsPositionedBox
    ? view.getComputedStyle(original, '::after')
    : undefined
  const pseudo = emptyPseudo(before)
    ? 'before'
    : after && emptyPseudo(after)
      ? 'after'
      : undefined
  if (
    !pseudo ||
    (!containsPositionedBox &&
      (!['block', 'flow-root'].includes(style.display) ||
        style.writingMode !== 'horizontal-tb' ||
        y < 0))
  )
    return false

  // Snapping affects positioning, not paint. Retire competing source targets
  // in the frozen copy, including pseudo targets, while leaving the source
  // and the container's own alignment in its parent unchanged.
  descendants.forEach((child) => {
    const source = task.getCloneSource(child)
    if (!source || !child.style) return
    const align = task.getInheritedStyleValue(source, 'scroll-snap-align')
    if (align && align !== 'none')
      child.style.setProperty('scroll-snap-align', 'none', 'important')
    if (!Array.from(child.children).some((node) => node.tagName === 'STYLE'))
      return
    const sourceView = source.ownerDocument.defaultView || window
    ;['before', 'after'].forEach((name) => {
      const value = sourceView.getComputedStyle(source, `::${name}`)
      if (!emptyPseudo(value) && value.scrollSnapAlign !== 'none') {
        const id = uuid()
        child.classList.add(id)
        task.addClonedStyle(
          `.${id}::${name}{scroll-snap-align:none!important;}`,
        )
      }
    })
  })

  const id = uuid()
  clone.classList.add(id)
  const number = (name: string) =>
    parseFloat(task.getInheritedStyleValue(original, name)) || 0
  let declarations: string
  if (containsPositionedBox) {
    // An absolute target is safe only inside a source containing block. Its
    // percentage dimensions describe the native scrollport without adding a
    // flex/grid item or rounding a fractional CSS viewport to clientHeight.
    declarations = `position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;margin:0!important;scroll-margin-left:${-x}px!important;scroll-margin-right:${x}px!important;scroll-margin-top:${-y}px!important;scroll-margin-bottom:${y}px!important;`
  } else {
    // A float with zero outer width/height leaves the normal flow untouched.
    // Its margins cannot collapse, and its border box never extends above
    // the scrollport. A negative top margin can shift SVG text painting in
    // WebKit even while its DOM layout rectangles report the correct offset.
    const left = number('padding-left')
    const right = number('padding-right')
    const top = number('padding-top')
    declarations = `display:block!important;float:left!important;width:100%!important;height:1px!important;margin:0 -100% -1px 0!important;overflow:hidden!important;scroll-margin-left:${left - x}px!important;scroll-margin-right:${x + right}px!important;scroll-margin-top:${top - y}px!important;scroll-margin-bottom:${y + original.clientHeight - top - 1}px!important;`
  }
  task.addClonedStyle(
    `.${id}::${pseudo}{all:initial!important;content:""!important;scroll-snap-align:start start!important;${declarations}}`,
  )
  style.setProperty('scroll-snap-type', 'both mandatory', 'important')
  style.setProperty('scroll-padding', '0px', 'important')
  style.setProperty('scroll-behavior', 'auto', 'important')
  return true
}
