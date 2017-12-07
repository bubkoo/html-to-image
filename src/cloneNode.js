import { createImage, toArray, uuid } from './utils'


function cloneSingleNode(node) {
  return node instanceof HTMLCanvasElement
    ? createImage(node.toDataURL())
    : node.cloneNode(false)
}

function cloneChildrenInOrder(parent, children, filter) {
  return children.reduce((done, child) => done
    .then(() => cloneNode(child, filter)) // eslint-disable-line
    .then((cloned) => {
      if (cloned) parent.appendChild(cloned)
    }), Promise.resolve())
}

function cloneChildren(node, cloned, filter) {
  const children = node.childNodes
  if (children.length === 0) {
    return Promise.resolve(cloned)
  }

  return cloneChildrenInOrder(cloned, toArray(children), filter).then(() => cloned)
}

function cloneStyle(original, cloned) {
  const source = window.getComputedStyle(original)
  const target = cloned.style

  if (source.cssText) {
    target.cssText = source.cssText
  } else {
    toArray(source).forEach((name) => {
      target.setProperty(
        name,
        source.getPropertyValue(name),
        source.getPropertyPriority(name),
      )
    })
  }
}


// handle pseudo elements
// ----
function formatCssText(style) {
  const content = style.getPropertyValue('content')
  return `${style.cssText} content: ${content};`
}

function formatCssProperties(style) {
  return toArray(style).map((name) => {
    const value = style.getPropertyValue(name)
    const priority = style.getPropertyPriority(name)

    return `${name}: ${value}${priority ? ' !important' : ''};`
  }).join(' ')
}

function getPseudoElementStyle(className, pseudo, style) {
  const selector = `.${className}:${pseudo}`
  const cssText = style.cssText ? formatCssText(style) : formatCssProperties(style)

  return document.createTextNode(`${selector}{${cssText}}`)
}

function clonePseudoElement(original, cloned, pseudo) {
  const style = window.getComputedStyle(original, pseudo)
  const content = style.getPropertyValue('content')

  if (content === '' || content === 'none') {
    return
  }

  const className = uuid()
  const styleElement = document.createElement('style')

  styleElement.appendChild(getPseudoElementStyle(className, pseudo, style))

  cloned.className = `${cloned.className} ${className}`
  cloned.appendChild(styleElement)
}

function clonePseudoElements(original, cloned) {
  [':before', ':after'].forEach(pseudo => clonePseudoElement(original, cloned, pseudo))
}


// handle input elements
function fixInputValue(original, cloned) {
  if (original instanceof HTMLTextAreaElement) {
    cloned.innerHTML = original.value
  }

  if (original instanceof HTMLInputElement) {
    cloned.setAttribute('value', original.value)
  }
}

function fixSvg(cloned) {
  if (!(cloned instanceof SVGElement)) {
    return
  }

  cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  if (!(cloned instanceof SVGRectElement)) {
    return
  }

  ['width', 'height'].forEach((attr) => {
    const value = cloned.getAttribute(attr)
    if (!value) {
      return
    }

    cloned.style.setProperty(attr, value)
  })
}

function decorate(original, cloned) {
  if (!(cloned instanceof Element)) {
    return cloned
  }

  return Promise.resolve()
    .then(() => cloneStyle(original, cloned))
    .then(() => clonePseudoElements(original, cloned))
    .then(() => fixInputValue(original, cloned))
    .then(() => fixSvg(cloned))
    .then(() => cloned)
}


export default function cloneNode(node, filter, isRoot) {
  if (!isRoot && filter && !filter(node)) {
    return Promise.resolve()
  }

  return Promise.resolve(node)
    .then(cloneSingleNode)
    .then(cloned => cloneChildren(node, cloned, filter))
    .then(cloned => decorate(node, cloned))
}
