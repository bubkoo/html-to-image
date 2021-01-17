import { clonePseudoElements } from './clonePseudoElements'
import { createImage, toArray } from './util'

async function cloneSingleNode(
  node: HTMLCanvasElement | SVGElement | HTMLElement,
): Promise<HTMLElement> {
  if (node instanceof HTMLCanvasElement) {
    const dataURL = node.toDataURL()
    if (dataURL === 'data:,') {
      return Promise.resolve(node.cloneNode(false) as HTMLElement)
    }

    return createImage(dataURL)
  }

  // if (node.tagName && node.tagName.toLowerCase() === 'svg') {
  //   return Promise.resolve(node as SVGElement)
  //     .then((svg) => svgToDataURL(svg))
  //     .then(createImage)
  // }

  return Promise.resolve(node.cloneNode(false) as HTMLElement)
}

const isSlotElement = (node: Node): node is HTMLSlotElement =>
  (node as Element).tagName === 'SLOT'

const getEffectiveChildren = (node: HTMLElement): HTMLElement[] => {
  const children = node.shadowRoot
    ? toArray<HTMLElement>(node.shadowRoot.childNodes)
    : toArray<HTMLElement>(node.childNodes)
  for (let i = 0; i < children.length; i = i + 1) {
    const child = children[i]
    if (isSlotElement(child)) {
      const assignedNodes = child.assignedNodes() as HTMLElement[]
      if (assignedNodes.length > 0) {
        // replace the slot element with its assigned nodes, and then process them immediately
        children.splice(i, 1, ...assignedNodes)
        i -= 1
      }
    }
  }

  return children
}

async function cloneChildren(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
  filter?: Function,
): Promise<HTMLElement> {
  const children = getEffectiveChildren(nativeNode)
  if (children.length === 0) {
    return Promise.resolve(clonedNode)
  }
  return children
    .reduce(
      (done, child) =>
        done
          .then(() => cloneNode(child, filter))
          .then((clonedChild: HTMLElement | null) => {
            if (clonedChild) {
              clonedNode.appendChild(clonedChild)
            }
          }),
      Promise.resolve(),
    )
    .then(() => clonedNode)
}

async function decorate(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
): Promise<HTMLElement> {
  if (!(clonedNode instanceof Element)) {
    return clonedNode
  }

  return Promise.resolve()
    .then(() => cloneCssStyle(nativeNode, clonedNode))
    .then(() => clonePseudoElements(nativeNode, clonedNode))
    .then(() => cloneInputValue(nativeNode, clonedNode))
    .then(() => clonedNode)
}

function cloneCssStyle(nativeNode: HTMLElement, clonedNode: HTMLElement) {
  const source = window.getComputedStyle(nativeNode)
  const target = clonedNode.style

  if (source.cssText) {
    target.cssText = source.cssText
  } else {
    toArray<string>(source).forEach((name) => {
      target.setProperty(
        name,
        source.getPropertyValue(name),
        source.getPropertyPriority(name),
      )
    })
  }
}

function cloneInputValue(nativeNode: HTMLElement, clonedNode: HTMLElement) {
  if (nativeNode instanceof HTMLTextAreaElement) {
    clonedNode.innerHTML = nativeNode.value
  }

  if (nativeNode instanceof HTMLInputElement) {
    clonedNode.setAttribute('value', nativeNode.value)
  }
}

export async function cloneNode(
  nativeNode: HTMLElement,
  filter?: Function,
  isRoot?: boolean,
): Promise<HTMLElement | null> {
  if (!isRoot && filter && !filter(nativeNode)) {
    return Promise.resolve(null)
  }

  return Promise.resolve(nativeNode)
    .then(cloneSingleNode)
    .then((clonedNode) => cloneChildren(nativeNode, clonedNode, filter))
    .then((clonedNode) => decorate(nativeNode, clonedNode))
}
