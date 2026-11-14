export async function checkSVGUseCycle(api) {
  const namespace = 'http://www.w3.org/2000/svg'
  const a = 'https://svg-cycle.example.test/a.svg'
  const b = 'https://svg-cycle.example.test/b.svg'
  const assets = {
    [a]:
      '<svg xmlns="' +
      namespace +
      '"><symbol id="icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="green"/><use href="./b.svg#icon" width="20" height="20"/></symbol></svg>',
    [b]:
      '<svg xmlns="' +
      namespace +
      '"><symbol id="icon" viewBox="0 0 20 20"><use href="./a.svg#icon" width="20" height="20"/></symbol></svg>',
  }
  const source = document.implementation.createHTMLDocument()
  const root = source.createElement('div')
  root.id = 'cycle-source'
  root.innerHTML =
    '<svg xmlns="' +
    namespace +
    '" width="20" height="20"><defs><linearGradient id="cycle-local-paint"><stop stop-color="green"/></linearGradient></defs><rect width="20" height="20" fill="url(#cycle-local-paint)"/><use href="' +
    a +
    '#icon" width="20" height="20" fill="green"/></svg>'
  const before = root.outerHTML
  const requests = []
  const renderer = api.createRenderer({
    width: 20,
    height: 20,
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }) => {
        requests.push(url)
        if (!assets[url]) throw new Error('Unexpected cycle resource: ' + url)
        return new Blob([assets[url]], { type: 'image/svg+xml' })
      },
    },
  })
  try {
    const svg = await renderer.toSvg(root)
    const xml = new DOMParser().parseFromString(
      decodeURIComponent(svg.slice(svg.indexOf(',') + 1)),
      'image/svg+xml',
    )
    if (xml.querySelector('parsererror'))
      throw new Error('Invalid cyclic SVG output')
    const symbols = xml.querySelectorAll('symbol')
    const ids = Array.from(xml.querySelectorAll('[id]'), (node) => node.id)
    const references = Array.from(xml.querySelectorAll('use'), (node) =>
      node.getAttribute('href'),
    )
    if (symbols.length !== 2 || ids.length !== new Set(ids).size)
      throw new Error('Cyclic contexts duplicated definitions')
    if (
      references.length !== 3 ||
      references.some(
        (value) =>
          !value?.startsWith('#') ||
          !ids.includes(decodeURIComponent(value.slice(1))),
      )
    )
      throw new Error('Cyclic references were not closed')
    if (!xml.querySelector('#cycle-local-paint'))
      throw new Error('Detached source paint scope was lost')
    if (requests.length !== 2 || new Set(requests).size !== 2)
      throw new Error('Cyclic resources were fetched repeatedly')
    if (root.outerHTML !== before)
      throw new Error('Cyclic capture changed source')
    return {
      symbols: 2,
      requests: 2,
      closedReferences: true,
      sourceUnchanged: true,
    }
  } finally {
    renderer.dispose()
  }
}
