import type { Options } from '../types'
import { isInstanceOfElement, toArray } from '../util'
import { cloneCanvasElement } from './canvas'
import { cloneCSSText } from './css'
import { cloneIFrameElement } from './iframe'
import { cloneInputValue } from './input'
import { clonePseudoElements } from './pseudo'
import { cloneSelectValue } from './select'
import { cloneSvgElement } from './svg'
import type { ClonableElement } from './types'
import { cloneVideoElement } from './video'

export async function cloneNode<T extends ClonableElement>(
  node: T,
  options: Options,
): Promise<T | null> {
  const filter = getFilterResult(node, options)
  if (filter === 'remove') {
    return null
  }

  let clonedNode: ClonableElement
  if (filter === 'unwrap') {
    clonedNode = document.createElement('div')
  } else {
    clonedNode = await cloneSingleNode(node, options)
  }

  clonedNode = await cloneChildren(node, clonedNode, options)
  return decorate(node, clonedNode, options) as T
}

async function cloneSingleNode<T extends ClonableElement>(
  node: T,
  options: Options,
): Promise<ClonableElement> {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement(node)
  }
  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement(node, options)
  }
  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options, cloneNode)
  }
  if (isSvgElement(node)) {
    return cloneSvgElement(node, options)
  }

  return node.cloneNode() as T
}

async function cloneChildren(
  nativeNode: ClonableElement,
  clonedNode: ClonableElement,
  options: Options,
) {
  if (isSvgElement(nativeNode)) {
    return clonedNode
  }
  if (isInstanceOfElement(nativeNode, HTMLVideoElement)) {
    return clonedNode
  }

  let children: Node[]
  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    children = toArray<Node>(nativeNode.assignedNodes())
  } else if (
    isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
    nativeNode.contentDocument?.body
  ) {
    children = toArray<Node>(nativeNode.contentDocument.body.childNodes)
  } else {
    children = toArray<Node>(
      ((nativeNode as HTMLElement).shadowRoot ?? nativeNode).childNodes,
    )
  }

  if (children.length === 0) {
    return clonedNode
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const child of children) {
    if (!isClonableElement(child)) {
      clonedNode.appendChild(child.cloneNode(true))
      continue
    }

    // eslint-disable-next-line no-await-in-loop
    const clonedChild = await cloneNode(child, options)
    if (clonedChild) {
      clonedNode.appendChild(clonedChild)
    }
  }

  return clonedNode
}

function decorate(
  nativeNode: ClonableElement,
  clonedNode: ClonableElement,
  options: Options,
) {
  cloneCSSText(nativeNode, clonedNode)
  clonePseudoElements(nativeNode, clonedNode, options)

  if (
    isInstanceOfElement(nativeNode, HTMLElement) &&
    isInstanceOfElement(clonedNode, HTMLElement)
  ) {
    cloneInputValue(nativeNode, clonedNode)
    cloneSelectValue(nativeNode, clonedNode)
  }

  return clonedNode
}

function isClonableElement(node: Node): node is ClonableElement {
  return isInstanceOfElement(node, HTMLElement) || isSvgElement(node)
}

function isSlotElement(node: Element): node is HTMLSlotElement {
  return node.tagName != null && node.tagName.toUpperCase() === 'SLOT'
}

function isSvgElement(node: Node): node is SVGElement {
  return isInstanceOfElement(node, SVGElement)
}

function getFilterResult(node: ClonableElement, options: Options) {
  return options.filter?.(node as HTMLElement) ?? 'keep'
}
