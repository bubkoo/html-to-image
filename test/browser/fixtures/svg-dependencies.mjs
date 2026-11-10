const namespace = 'http://www.w3.org/2000/svg'
const directory = '/test/browser/fixtures/svg-dependencies/'

export async function checkSVGDependencies({ createRenderer }) {
  const root = document.createElement('div')
  root.style.cssText = 'display:flex;width:40px;height:20px'
  const uses = []
  for (let index = 0; index < 2; index += 1) {
    const svg = document.createElementNS(namespace, 'svg')
    svg.setAttribute('width', '20')
    svg.setAttribute('height', '20')
    const use = document.createElementNS(namespace, 'use')
    use.setAttribute('width', '20')
    use.setAttribute('height', '20')
    svg.append(use)
    root.append(svg)
    uses.push(use)
  }
  document.body.append(root)
  const requests = []
  const renderer = createRenderer({
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }) => {
        requests.push(url)
      },
    },
  })
  const select = (left, right) => {
    uses[0].setAttribute('href', directory + 'root.svg#' + left)
    uses[1].setAttribute('href', directory + right)
  }
  const pixel = (image, x) => {
    const offset = 4 * (10 * image.width + x)
    return Array.from(image.data.slice(offset, offset + 4)).join(',')
  }
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const parse = (dataURL) =>
    new DOMParser().parseFromString(
      decodeURIComponent(dataURL.slice(dataURL.indexOf(',') + 1)),
      'image/svg+xml',
    )
  const nativeBlue = async () => {
    const svg = document.createElementNS(namespace, 'svg')
    svg.setAttribute('width', '40')
    svg.setAttribute('height', '20')
    svg.innerHTML =
      '<defs><linearGradient id="native-palette"><stop stop-color="blue"/></linearGradient><linearGradient id="native-paint" href="#native-palette"/><symbol id="native-icon" viewBox="0 0 20 20"><rect width="20" height="20" fill="url(#native-paint)"/></symbol></defs><use href="#native-icon" x="20" width="20" height="20"/>'
    const image = new Image()
    image.src =
      'data:image/svg+xml,' +
      encodeURIComponent(new XMLSerializer().serializeToString(svg))
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 40
    canvas.height = 20
    canvas.getContext('2d').drawImage(image, 0, 0)
    return pixel(canvas.getContext('2d').getImageData(0, 0, 40, 20), 30)
  }
  try {
    const blue = await nativeBlue()
    select('icon', 'alternate.svg#icon')
    let source = root.outerHTML
    const capture = await renderer.capture(root)
    assert(root.outerHTML === source, 'Source reference tree changed')
    uses[0].setAttribute('href', directory + 'root.svg#cross')
    let image = await capture.toImageData()
    assert(
      pixel(image, 10) === '0,128,0,255',
      'Nested paint/clip/mask/filter pixel ' + pixel(image, 10),
    )
    assert(pixel(image, 16) === '0,0,0,0', 'Clipped region ' + pixel(image, 16))
    assert(
      pixel(image, 30) === blue,
      'Cross-document ID collision ' + pixel(image, 30) + ' native=' + blue,
    )
    assert(
      requests.length === 2 && new Set(requests).size === 2,
      'Repeated document requests ' + requests,
    )
    const xml = parse(await capture.toSvg())
    const ids = Array.from(xml.querySelectorAll('[id]'), (node) => node.id)
    assert(ids.length === new Set(ids).size, 'Imported IDs collided')
    image = await capture.toImageData()
    assert(
      pixel(image, 10) === '0,128,0,255',
      'Frozen output followed source edits',
    )
    capture.dispose()

    requests.length = 0
    select('image', 'root.svg#cross')
    source = root.outerHTML
    image = await renderer.toImageData(root)
    assert(
      pixel(image, 10) === '0,128,0,255',
      'Relative image pixel ' + pixel(image, 10),
    )
    assert(
      pixel(image, 30) === blue,
      'Cross-file use pixel ' + pixel(image, 30) + ' native=' + blue,
    )
    assert(
      requests.includes(
        new URL(directory + 'assets/tile.svg', location.href).href,
      ),
      'Image base URL lost: ' + requests,
    )
    assert(
      requests.length === 3 && new Set(requests).size === 3,
      'Cross-file requests ' + requests,
    )
    assert(root.outerHTML === source, 'Source image references changed')

    requests.length = 0
    select('filter-image', 'root.svg#filter-image')
    image = await renderer.toImageData(root)
    assert(
      pixel(image, 10) === '0,128,0,255' && pixel(image, 30) === '0,128,0,255',
      'Filter image dependency lost pixels',
    )
    assert(
      requests.length === 2 && new Set(requests).size === 2,
      'Filter image requests ' + requests,
    )

    requests.length = 0
    uses.forEach((use) =>
      use.setAttribute('href', directory + 'assets/tile.svg'),
    )
    image = await renderer.toImageData(root)
    assert(
      pixel(image, 10) === '0,128,0,255' && pixel(image, 30) === '0,128,0,255',
      'Whole-document reference lost pixels',
    )
    assert(requests.length === 1, 'Whole-document resource refetched')

    requests.length = 0
    const emptyImage = document.createElementNS(namespace, 'image')
    emptyImage.setAttribute('width', '20')
    emptyImage.setAttribute('height', '20')
    emptyImage.setAttribute('href', '')
    emptyImage.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="' +
            namespace +
            '" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>',
        ),
    )
    uses[1].replaceWith(emptyImage)
    uses[0].setAttribute('href', '')
    image = await renderer.toImageData(root)
    assert(
      pixel(image, 30) === '0,0,0,0',
      'Empty modern image reference activated legacy href',
    )
    emptyImage.removeAttribute('href')
    emptyImage.removeAttributeNS('http://www.w3.org/1999/xlink', 'href')
    image = await renderer.toImageData(root)
    assert(
      pixel(image, 30) === '0,0,0,0' && requests.length === 0,
      'Missing image reference fetched a document',
    )
    emptyImage.replaceWith(uses[1])

    const hidden = document.createElementNS(namespace, 'svg')
    hidden.setAttribute('width', '0')
    hidden.setAttribute('height', '0')
    hidden.innerHTML =
      '<defs><symbol id="dependency-filtered" viewBox="0 0 20 20"><rect width="20" height="20" fill="green"/></symbol></defs>'
    root.prepend(hidden)
    uses[0].setAttribute('href', '#dependency-filtered')
    uses[1].setAttribute('href', '')
    image = await renderer.toImageData(root, { exclude: ['defs'] })
    assert(
      pixel(image, 10) === '0,0,0,0' && requests.length === 0,
      'Excluded definitions were restored',
    )
    hidden.remove()

    requests.length = 0
    select('child', 'root.svg#outer')
    const overlap = await renderer.capture(root)
    image = await overlap.toImageData()
    assert(
      pixel(image, 10) === '0,128,0,255' && pixel(image, 30) === '0,128,0,255',
      'Overlapping definitions lost pixels',
    )
    const overlapXML = parse(await overlap.toSvg())
    const overlapIDs = Array.from(
      overlapXML.querySelectorAll('[id]'),
      (node) => node.id,
    )
    assert(
      overlapIDs.length === new Set(overlapIDs).size,
      'Overlapping definition IDs duplicated',
    )
    assert(
      requests.length === 1,
      'Overlapping definitions refetched the same document',
    )
    overlap.dispose()

    select('cycle', 'root.svg#cycle')
    const cycleXML = parse(await renderer.toSvg(root))
    assert(
      cycleXML.querySelectorAll('linearGradient').length === 2,
      'Dependency cycle duplicated definitions',
    )
    return {
      nested: true,
      collision: true,
      relativeImage: true,
      filterImage: true,
      wholeDocument: true,
      emptyReference: true,
      excluded: true,
      crossFile: true,
      overlap: true,
      cycle: true,
      frozen: true,
      sourceUnchanged: true,
    }
  } finally {
    renderer.dispose()
    root.remove()
  }
}
