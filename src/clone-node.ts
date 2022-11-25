import type { Options } from './types'
import { getMimeType } from './mimes'
import { resourceToDataURL } from './dataurl'
import { clonePseudoElements } from './clone-pseudos'
import { createImage, toArray } from './util'

async function cloneCanvasElement(canvas: HTMLCanvasElement) {
  const dataURL = canvas.toDataURL()
  if (dataURL === 'data:,') {
    return canvas.cloneNode(false) as HTMLCanvasElement
  }

  return createImage(dataURL)
}

async function cloneVideoElement(video: HTMLVideoElement, options: Options) {
  const poster = video.poster
  const contentType = getMimeType(poster)
  const dataURL = await resourceToDataURL(poster, contentType, options)
  return createImage(dataURL)
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<HTMLElement> {
  if (node instanceof HTMLCanvasElement) {
    return cloneCanvasElement(node)
  }

  if (node instanceof HTMLVideoElement && node.poster) {
    return cloneVideoElement(node, options)
  }

  return node.cloneNode(false) as T
}

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement =>
  node.tagName != null && node.tagName.toUpperCase() === 'SLOT'

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
): Promise<T> {
  const children =
    isSlotElement(nativeNode) && nativeNode.assignedNodes
      ? toArray<T>(nativeNode.assignedNodes())
      : toArray<T>((nativeNode.shadowRoot ?? nativeNode).childNodes)

  if (children.length === 0 || nativeNode instanceof HTMLVideoElement) {
    return clonedNode
  }

  await children.reduce(
    (deferred, child) =>
      deferred
        .then(() => cloneNode(child, options))
        .then((clonedChild: HTMLElement | null) => {
          if (clonedChild) {
            clonedNode.appendChild(clonedChild)
          }
        }),
    Promise.resolve(),
  )

  return clonedNode
}

/** DOM in which we can deduce the default value of properties without being polluted by the global namespace */
let shadowDom: ShadowRoot | null = null;

function cloneCSSStyle<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if(shadowDom == null) {
    let shadowContainer = document.createElement("div")
    shadowContainer.style.display = "none"
    shadowDom = shadowContainer.attachShadow({mode: "open"})
    const shadowStyle = document.createElement("style");
    shadowStyle.innerHTML = ":host{all:initial;} *{all:initial;}";
    shadowDom.appendChild(shadowStyle);
    document.body.appendChild(shadowContainer)
  }

  const targetStyle = clonedNode.style
  if (!targetStyle) {
    return
  }

  const sourceStyle = window.getComputedStyle(nativeNode)
  //targetStyle.setProperty("all", "initial",sourceStyle.getPropertyPriority("all")) // for some weird reason this is needed otherwise some styles are taken from the host page and others are not
  targetStyle.setProperty("margin", "0",sourceStyle.getPropertyPriority("margin"));
  targetStyle.setProperty("padding", "0",sourceStyle.getPropertyPriority("padding"));
  targetStyle.setProperty("box-sizing", "border-box",sourceStyle.getPropertyPriority("box-sizing"));
  const defaultElement = document.createElement(nativeNode.tagName)
  shadowDom.appendChild(defaultElement) // we need to add it to the page to get the default computed styles (otherwise it's empty)
  const defaultStyle = window.getComputedStyle(defaultElement)
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText
    targetStyle.transformOrigin = sourceStyle.transformOrigin
  } else {
    toArray<string>(sourceStyle).forEach((name) => {
      if(name.startsWith("--")) {
        // No need to add those. CSS variables will be replaced by the engine.
        return
      }
      let value = sourceStyle.getPropertyValue(name)
      const defaultValue = defaultStyle.getPropertyValue(name)
      if (name === 'font-size' && value.endsWith('px')) {
        const reducedFont =
          Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1;
        if(reducedFont >= 0) {
          value = `${reducedFont}px`
        }
      }
      if (defaultValue != value && value != "initial") {
        targetStyle.setProperty(
          name,
          value,
          sourceStyle.getPropertyPriority(name),
        )
      }
    })
  }
  shadowDom.removeChild(defaultElement)
}

function cloneInputValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (nativeNode instanceof HTMLTextAreaElement) {
    clonedNode.innerHTML = nativeNode.value
  }

  if (nativeNode instanceof HTMLInputElement) {
    clonedNode.setAttribute('value', nativeNode.value)
  }
}

function cloneSelectValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (nativeNode instanceof HTMLSelectElement) {
    const clonedSelect = clonedNode as any as HTMLSelectElement
    const selectedOption = Array.from(clonedSelect.children).find(
      (child) => nativeNode.value === child.getAttribute('value'),
    )

    if (selectedOption) {
      selectedOption.setAttribute('selected', '')
    }
  }
}

function decorate<T extends HTMLElement>(nativeNode: T, clonedNode: T): T {
  if (clonedNode instanceof Element) {
    cloneCSSStyle(nativeNode, clonedNode)
    clonePseudoElements(nativeNode, clonedNode)
    cloneInputValue(nativeNode, clonedNode)
    cloneSelectValue(nativeNode, clonedNode)
  }

  return clonedNode
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
): Promise<T | null> {
  if (!isRoot && options.filter && !options.filter(node)) {
    return null
  }

  return Promise.resolve(node)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(node, clonedNode, options))
    .then((clonedNode) => decorate(node, clonedNode))
}
