import { toArray, isDataUrl, toDataURL, getMimeType } from './utils'
import embedResources from './embedResources'


function embedBackground(clonedNode, options) {
  const background = clonedNode.style.getPropertyValue('background')
  if (!background) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(background)
    .then(cssString => embedResources(cssString, null, options))
    .then((cssString) => {
      clonedNode.style.setProperty(
        'background',
        cssString,
        clonedNode.style.getPropertyPriority('background'),
      )

      return clonedNode
    })
}

function embedImageNode(clonedNode, options) {
  if (!(clonedNode instanceof HTMLImageElement) || isDataUrl(clonedNode.src)) {
    return Promise.resolve(clonedNode)
  }

  return Promise.resolve(clonedNode.src)
    .then(url => embedResources(url, null, options))
    .then(data => toDataURL(data, getMimeType(clonedNode.src)))
    .then(dataURL => new Promise(((resolve, reject) => {
      clonedNode.onload = resolve
      clonedNode.onerror = reject
      clonedNode.src = dataURL
    })))
    .then(() => clonedNode)
}

function embedChildren(clonedNode, options) {
  const children = toArray(clonedNode.childNodes)
  const deferreds = children.map(child => embedImages(child, options)) // eslint-disable-line

  return Promise.all(deferreds).then(() => clonedNode)
}

export default function embedImages(clonedNode, options) {
  const resolved = Promise.resolve(clonedNode)

  if (!(clonedNode instanceof Element)) {
    return resolved
  }

  return resolved
    .then(node => embedBackground(node, options))
    .then(node => embedImageNode(node, options))
    .then(node => embedChildren(node, options))
}
