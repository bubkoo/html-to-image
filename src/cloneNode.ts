import { createImage, toArray, svgToDataURL } from './utils'
import clonePseudoElements from './clonePseudoElements'

function cloneSingleNode(nativeNode: HTMLCanvasElement | SVGElement | HTMLElement)
  : Promise<HTMLElement> {
  if (nativeNode instanceof HTMLCanvasElement) {
    return createImage(nativeNode.toDataURL())
  }

  if (nativeNode.tagName && nativeNode.tagName.toLowerCase() === 'svg') {
    return Promise.resolve(nativeNode as SVGElement)
      .then(svg => svgToDataURL(svg))
      .then(createImage)
  }

  return Promise.resolve(nativeNode.cloneNode(false) as HTMLElement)
}

function cloneChildren(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
  filter?: Function,
): Promise<HTMLElement> {
  const children = toArray<HTMLElement>(nativeNode.childNodes)
  if (children.length === 0) {
    return Promise.resolve(clonedNode)
  }

  // clone children in order
  return children.reduce((done, child) => done
    .then(() => cloneNode(child, filter))
    .then((clonedChild: HTMLElement | null) => {
      if (clonedChild) {
        clonedNode.appendChild(clonedChild)
      }
    }),                  Promise.resolve())
    .then(() => clonedNode)
}

function cloneCssStyle(
  nativeNode: HTMLElement,
  clonedNode: HTMLElement,
) {
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

function decorate(
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

export default function cloneNode(
  domNode: HTMLElement,
  filter?: Function,
  isRoot?: boolean,
): Promise<HTMLElement | null> {
  if (!isRoot && filter && !filter(domNode)) {
    return Promise.resolve(null)
  }

  return Promise.resolve(domNode)
    .then(cloneSingleNode)
    .then(clonedNode => cloneChildren(domNode, clonedNode, filter))
    .then(clonedNode => decorate(domNode, clonedNode))
}
