export default function createSvgDataURL(cloned, width, height) {
  return Promise.resolve(cloned)
    .then((node) => {
      node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
      return new XMLSerializer().serializeToString(node)
    })
    // escape xhtml
    .then(str => str.replace(/#/g, '%23').replace(/\n/g, '%0A'))
    .then(xhtml => `<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject>`)
    .then(foreignObject => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${foreignObject}</svg>`)
    .then(svg => `data:image/svg+xml;charset=utf-8,${svg}`)
}
