const namespace = 'http://www.w3.org/2000/svg'
const resource = '/test/browser/fixtures/transform-symbol.svg'
let sequence = 0
export const transformedSVGModes = [
  'onClone',
  'plugin',
  'async',
  'retarget',
  'local',
  'filtered',
  'resolver-error',
  'remove',
  'remove-plugin',
  'iframe-remove',
  'local-callback-error',
]

const appendUse = (root, href) => {
  const svg = root.ownerDocument.createElementNS(namespace, 'svg')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.style.display = 'block'
  const use = root.ownerDocument.createElementNS(namespace, 'use')
  use.setAttribute('href', href)
  use.setAttribute('width', '20')
  use.setAttribute('height', '20')
  svg.append(use)
  root.append(svg)
  return use
}

export async function checkTransformedSVG({ createRenderer }, mode) {
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px;background:white'
  const localId = `transformed-local-${++sequence}`
  let outside
  if (mode.startsWith('local') || mode === 'filtered') {
    const definitions = document.createElementNS(namespace, 'svg')
    definitions.style.display = 'none'
    definitions.innerHTML = `<defs><symbol id="${localId}" viewBox="0 0 20 20"><rect width="20" height="20" fill="green"/></symbol></defs>`
    if (mode.startsWith('local')) {
      outside = definitions
      document.body.append(outside)
    } else root.append(definitions)
  }
  if (mode === 'retarget') appendUse(root, resource + '#red')
  if (mode === 'remove' || mode === 'remove-plugin')
    appendUse(root, resource + '#red')
  document.body.append(root)
  let frame
  if (mode === 'iframe-remove') {
    frame = document.createElement('iframe')
    frame.style.cssText = 'display:block;width:20px;height:20px;border:0'
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('SVG frame load timed out')),
        5000,
      )
      frame.onload = () => {
        clearTimeout(timer)
        resolve()
      }
    })
    frame.srcdoc = `<body style="margin:0"><svg xmlns="${namespace}" width="20" height="20"><use href="${location.origin + resource}#red" width="20" height="20"/></svg></body>`
    root.append(frame)
    try {
      await loaded
    } catch (error) {
      root.remove()
      throw error
    }
  }
  const source = root.outerHTML
  const outsideSource = outside?.outerHTML
  const frameSource = frame?.contentDocument.body.outerHTML
  const callbacks = []
  const requests = []
  let stage
  const failure = new Error('transformed SVG resolver failed')
  const transform = ({ root: copy }) => {
    if (mode.includes('remove')) {
      copy.replaceChildren()
      return
    }
    const href =
      mode.startsWith('local') || mode === 'filtered'
        ? '#' + localId
        : resource + '#green'
    if (mode === 'retarget')
      copy.querySelector('use').setAttribute('href', href)
    else appendUse(copy, href)
  }
  const options = {
    pixelRatio: 1,
    skipFonts: true,
    exclude: mode === 'filtered' ? ['#' + localId] : [],
    onCloneNode: (original) => {
      if (original.id === localId) {
        callbacks.push({ original, stage })
        if (mode === 'local-callback-error') throw failure
      }
    },
    onEvent: (event) => {
      if (event.type === 'stage') stage = event.stage
    },
    resources: {
      resolve: ({ url }) => {
        requests.push({ url, stage })
        if (mode === 'resolver-error' || mode.includes('remove')) throw failure
      },
    },
  }
  if (mode.includes('plugin'))
    options.plugins = [
      { name: 'insert-svg-reference', transformClone: transform },
    ]
  else if (mode === 'async')
    options.onClone = async (context) => {
      await Promise.resolve()
      transform(context)
    }
  else options.onClone = transform
  const renderer = createRenderer(options)
  try {
    if (mode === 'resolver-error' || mode === 'local-callback-error') {
      let caught
      try {
        await renderer.capture(root)
      } catch (error) {
        caught = error
      }
      const propagated =
        mode === 'resolver-error'
          ? caught?.cause === failure
          : caught === failure
      if (!propagated)
        throw new Error(
          'New SVG reference did not propagate the resolver error',
        )
    } else {
      const capture = await renderer.capture(root)
      const image = await capture.toImageData()
      const offset = 4 * (10 * image.width + 10)
      const color = Array.from(image.data.slice(offset, offset + 4)).join(',')
      const expected =
        mode === 'filtered' || mode.includes('remove')
          ? '255,255,255,255'
          : '0,128,0,255'
      if (color !== expected)
        throw new Error(
          `${mode} transformed SVG pixel ${color}, expected ${expected}`,
        )
      if (mode === 'local' && callbacks.length !== 1)
        throw new Error(
          `Local definition clone callback count ${callbacks.length}`,
        )
      if (mode === 'local' && callbacks[0].stage !== 'resources')
        throw new Error(
          'Imported local definition callback ran before resources',
        )
      capture.dispose()
    }
    if (requests.some((request) => request.stage !== 'resources'))
      throw new Error('SVG resource request occurred before the resource stage')
    if (mode.includes('remove') && requests.length)
      throw new Error('Removed SVG reference was requested')
    if (
      root.outerHTML !== source ||
      outside?.outerHTML !== outsideSource ||
      frame?.contentDocument.body.outerHTML !== frameSource
    )
      throw new Error('Source SVG or external local definition changed')
    return true
  } finally {
    renderer.dispose()
    root.remove()
    outside?.remove()
  }
}
