import { readDOMMethod, readDOMProperty } from './dom.js'
import { readDocumentProperty } from './document.js'

interface Facts {
  block: boolean
  inFlow: boolean
  boundary: boolean
  pseudo: boolean
  whiteSpace: string
  marginTop: number
  marginBottom: number
  topEdges: boolean
  bottomEdges: boolean
  throughHeight: boolean
  item: boolean
}

// Keys are weak: a plan may cross the clone await, but never owns source nodes.
export interface RootLayoutPlan {
  readonly margins: WeakMap<Element, { top?: boolean; bottom?: boolean }>
  readonly independentRoot: boolean
}

/**
 * Record the source's leading adjoining-margin chain before clone callbacks.
 * This is deliberately limited to ordinary horizontal block flow. It is not a
 * layout engine: unknown formatting boundaries stop the child walk, while the
 * copied inline root margin baseline is reset before user transforms. Retained
 * author important rules may still win; this does not override their cascade.
 */
export function prepareRootLayout(source: HTMLElement): RootLayoutPlan {
  const margins = new WeakMap<Element, { top?: boolean; bottom?: boolean }>()
  const cache = new WeakMap<Element, Facts>()
  const empty = new WeakMap<Element, boolean>()
  const sourceDocument = readDOMProperty(source, 'ownerDocument')
  const view = readDocumentProperty(sourceDocument, 'defaultView') || window
  const computed = (node: Element, pseudo?: string) =>
    readDOMMethod(view, 'getComputedStyle')(node, pseudo)
  const facts = (node: Element): Facts => {
    const saved = cache.get(node)
    if (saved) return saved
    const style = computed(node)
    const value = (name: string) =>
      readDOMMethod(style, 'getPropertyValue')(name)
    const zero = (name: string) => parseFloat(value(name)) === 0
    const display = value('display')
    const position = value('position')
    let parent = readDOMProperty(node, 'parentElement')
    let parentDisplay = ''
    while (parent) {
      parentDisplay = readDOMMethod(
        computed(parent),
        'getPropertyValue',
      )('display')
      if (parentDisplay !== 'contents') break
      parent = readDOMProperty(parent, 'parentElement')
    }
    const item = /^(inline-)?(flex|grid)$/.test(parentDisplay)
    const pseudoContent = (selector: string) =>
      readDOMMethod(computed(node, selector), 'getPropertyValue')('content')
    const ownChildren =
      readDOMProperty(node, 'namespaceURI') ===
        'http://www.w3.org/1999/xhtml' &&
      !readDOMProperty(node, 'shadowRoot') &&
      readDOMProperty(node, 'localName') !== 'slot'
    const result: Facts = {
      block:
        ownChildren &&
        display === 'block' &&
        value('writing-mode') === 'horizontal-tb' &&
        value('clear') === 'none',
      inFlow:
        display !== 'none' &&
        value('float') === 'none' &&
        !/^(absolute|fixed)$/.test(position),
      boundary:
        item ||
        // HTML's anonymous fieldset/button content and rendered legend have
        // formatting boundaries which computed display alone does not expose.
        /^(fieldset|legend|button|img|canvas|video|iframe|embed|object|input|select|textarea)$/.test(
          readDOMProperty(node, 'localName'),
        ) ||
        /flex|grid|flow-root|inline-block|table/.test(display) ||
        value('float') !== 'none' ||
        /^(absolute|fixed)$/.test(position) ||
        value('overflow-x') !== 'visible' ||
        value('overflow-y') !== 'visible' ||
        value('contain') !== 'none' ||
        !['', 'normal'].includes(value('container-type')) ||
        !['', 'visible'].includes(value('content-visibility')) ||
        !['', 'auto'].includes(value('column-count')) ||
        !['', 'auto'].includes(value('column-width')) ||
        !['', 'none'].includes(value('column-span')),
      pseudo: [pseudoContent('::before'), pseudoContent('::after')].some(
        (content) => content !== 'none' && content !== 'normal',
      ),
      whiteSpace: value('white-space'),
      marginTop: parseFloat(value('margin-top')),
      marginBottom: parseFloat(value('margin-bottom')),
      topEdges: zero('border-top-width') && zero('padding-top'),
      bottomEdges: zero('border-bottom-width') && zero('padding-bottom'),
      throughHeight:
        zero('min-height') && (value('height') === 'auto' || zero('height')),
      item,
    }
    cache.set(node, result)
    return result
  }
  const textBarrier = (node: Node, parent: Facts) => {
    if (readDOMProperty(node, 'nodeType') !== Node.TEXT_NODE) return false
    const text = readDOMProperty(node, 'textContent') || ''
    return text.trim() !== '' || (text !== '' && parent.whiteSpace !== 'normal')
  }
  const through = (node: Element): boolean => {
    const pending = [{ node, visited: false }]
    while (pending.length) {
      const frame = pending.pop()!
      if (empty.has(frame.node)) continue
      const f = facts(frame.node)
      if (
        !f.block ||
        f.boundary ||
        f.pseudo ||
        !f.topEdges ||
        !f.bottomEdges ||
        !f.throughHeight
      ) {
        empty.set(frame.node, false)
        continue
      }
      const children = readDOMProperty(frame.node, 'childNodes')
      if (!frame.visited) pending.push({ node: frame.node, visited: true })
      let result = true
      for (let i = 0; i < readDOMProperty(children, 'length'); i += 1) {
        const child = readDOMProperty(children, i)
        if (textBarrier(child, f)) {
          result = false
          break
        }
        if (readDOMProperty(child, 'nodeType') !== Node.ELEMENT_NODE) continue
        const element = child as Element
        if (!facts(element).inFlow) continue
        if (frame.visited) result = result && empty.get(element) === true
        else pending.push({ node: element, visited: false })
      }
      if (frame.visited || !result) empty.set(frame.node, result)
    }
    return empty.get(node) === true
  }
  const connect = (node: Element, edge: 'top' | 'bottom') => {
    const f = facts(node)
    const margin = edge === 'top' ? f.marginTop : f.marginBottom
    // Do not invent a child margin when a selected-style clone omits a source
    // zero. Its eventual UA/layout defaults are outside this source proof.
    if (Number.isFinite(margin) && margin !== 0)
      margins.set(node, { ...margins.get(node), [edge]: true })
  }
  const scan = (sourceRoot: Element) => {
    const pending = [sourceRoot]
    while (pending.length) {
      const node = pending.pop()!
      const f = facts(node)
      if (!f.block || f.boundary || f.pseudo || !f.topEdges) continue
      const children = readDOMProperty(node, 'childNodes')
      for (let i = 0; i < readDOMProperty(children, 'length'); i += 1) {
        const child = readDOMProperty(children, i)
        if (textBarrier(child, f)) break
        if (readDOMProperty(child, 'nodeType') !== Node.ELEMENT_NODE) continue
        const element = child as Element
        const childFacts = facts(element)
        if (!childFacts.inFlow) continue
        if (!childFacts.block) break
        connect(element, 'top')
        pending.push(element)
        if (!through(element)) break
        connect(element, 'bottom')
      }
    }
  }
  const root = facts(source)
  if (source !== readDocumentProperty(sourceDocument, 'documentElement'))
    scan(source)
  return { margins, independentRoot: root.item && root.block }
}

export function normalizeRootLayout(
  plan: RootLayoutPlan,
  source: Element,
  clone: HTMLElement,
  isRoot?: boolean,
) {
  const style = readDOMProperty(clone, 'style')
  if (!style) return
  const set = (property: string, value: string) =>
    readDOMMethod(style, 'setProperty')(property, value)
  const edges = plan.margins.get(source)
  if (edges) {
    const value = (name: string) =>
      readDOMMethod(style, 'getPropertyValue')(name)
    const priority = (name: string) =>
      readDOMMethod(style, 'getPropertyPriority')(name)
    const preserved: { property: string; value: string; priority: string }[] =
      []
    let ambiguous = false
    ;(['top', 'bottom'] as const).forEach((edge) => {
      if (edges[edge]) return
      const physical = `margin-${edge}`
      const logical = `margin-block-${edge === 'top' ? 'start' : 'end'}`
      const physicalValue = value(physical)
      const logicalValue = value(logical)
      if (
        physicalValue &&
        logicalValue &&
        (physicalValue !== logicalValue ||
          priority(physical) !== priority(logical))
      ) {
        // A selected-style clone can retain conflicting authored aliases.
        // Leave that child alone instead of guessing its inline cascade.
        ambiguous = true
        return
      }
      const property = physicalValue ? physical : logical
      if (value(property))
        preserved.push({
          property: physical,
          value: value(property),
          priority: priority(property),
        })
    })
    if (!ambiguous) {
      // Remove both ends of this axis. A surviving end can make CSSOM
      // serialize a later hook's new start into an earlier logical shorthand,
      // before the physical margin zero, changing that hook's visible result.
      readDOMMethod(style, 'removeProperty')('margin-block-start')
      readDOMMethod(style, 'removeProperty')('margin-block-end')
      preserved.forEach((item) =>
        readDOMMethod(style, 'setProperty')(
          item.property,
          item.value,
          item.priority,
        ),
      )
      if (edges.top) set('margin-top', '0px')
      if (edges.bottom) set('margin-bottom', '0px')
    }
  }
  if (isRoot) {
    // These are baseline external margins. User style and clone hooks run
    // afterwards and may deliberately introduce new margins or transforms.
    const logical = ['block-start', 'block-end', 'inline-start', 'inline-end']
    logical.forEach((edge) =>
      readDOMMethod(style, 'removeProperty')(`margin-${edge}`),
    )
    set('margin', '0px')
    // A source block flex/grid item has an independent FC even though its
    // computed display is block. Detaching it must not introduce new collapse.
    if (plan.independentRoot) set('display', 'flow-root')
  }
}
