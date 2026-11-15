import { readNativeSVGFixturePolicy } from './svg-native-styles.mjs'
const ns = 'http://www.w3.org/2000/svg'
const names = [
  'attribute-page',
  'attribute-missing',
  'inline-page',
  'inline-missing',
  'inner-page',
  'inner-missing',
]
export const svgFragmentPaintCases = names.flatMap((name) => [
  { name, paint: 'gradient', shadow: false },
  { name, paint: 'pattern', shadow: false },
  { name, paint: 'pattern', shadow: true },
])
let policy
async function readPolicy() {
  const base = await readNativeSVGFixturePolicy(),
    svg = document.createElementNS(ns, 'svg')
  if (document.getElementById('svg-fragment-scope-clip'))
    throw new Error('Fragment fixture ID collision')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.style.cssText = 'position:fixed;left:0;top:0;opacity:0;z-index:2147483647'
  svg.innerHTML =
    '<defs><clipPath id="svg-fragment-scope-clip"><rect width="12" height="20"/></clipPath></defs>'
  const use = document.createElementNS(ns, 'use')
  use.setAttribute(
    'href',
    '/test/browser/fixtures/svg-fragment-policy.svg#probe',
  )
  svg.append(use)
  document.body.append(svg)
  try {
    const deadline = performance.now() + 5000
    while (performance.now() < deadline) {
      if (
        use.getBBox().width === 20 &&
        document.elementFromPoint(2, 10) === use &&
        document.elementFromPoint(15, 10) !== use
      )
        return {
          ...base,
          fragmentPage: document.elementFromPoint(8, 10) === use,
        }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    throw new Error(
      'Independent HTTP fragment-scope clipping controls did not become ready',
    )
  } finally {
    svg.remove()
  }
}
export function getSVGFragmentFixturePolicy() {
  policy ||= readPolicy()
  return policy
}
const difference = (a, b) =>
  a.data.reduce((n, v, i) => n + (v !== b.data[i]), 0)
const png = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d').putImageData(image, 0, 0)
  return canvas.toDataURL().split(',')[1]
}
function paintDefinition(paint, id, color) {
  return paint === 'gradient'
    ? `<linearGradient id="${id}"><stop stop-color="${color}"/></linearGradient>`
    : `<pattern id="${id}" patternUnits="userSpaceOnUse" width="20" height="20"><rect width="20" height="20" fill="${color}"/></pattern>`
}
async function authoredImage(paint, present, color, stroke) {
  const xml = `<svg xmlns="${ns}" width="60" height="20" viewBox="0 0 60 20"><defs>${present ? paintDefinition(paint, 'authored-paint', color) : ''}</defs><rect width="20" height="20" fill="url(#authored-paint) purple"${stroke ? ' stroke="blue" stroke-width="2"' : ''}/><rect x="20" width="20" height="20" fill="blue"/><rect x="40" width="20" height="20" fill="yellow"/></svg>`
  const image = new Image()
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 60
  canvas.height = 20
  canvas.getContext('2d').drawImage(image, 0, 0)
  return { image: canvas.getContext('2d').getImageData(0, 0, 60, 20), xml }
}
export async function checkSVGFragmentPaint(api, mode, readNative, record) {
  const { name, paint, shadow } = mode
  const policy = await getSVGFragmentFixturePolicy(),
    kind = name.split('-')[0],
    present = name.endsWith('-page')
  const paintID = kind === 'inner' ? 'fragment-inner-paint' : 'fragment-paint'
  const root = document.createElement('div')
  root.id = 'svg-fragment-' + Math.random().toString(36).slice(2)
  root.style.cssText = 'display:flex;width:60px;height:20px;background:white'
  const definitions = document.createElementNS(ns, 'svg')
  definitions.setAttribute('width', '0')
  definitions.setAttribute('height', '0')
  definitions.style.cssText = 'position:absolute;overflow:hidden'
  if (present)
    definitions.innerHTML =
      '<defs>' + paintDefinition(paint, paintID, 'blue') + '</defs>'
  const svg = document.createElementNS(ns, 'svg'),
    use = document.createElementNS(ns, 'use')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.style.flex = 'none'
  use.setAttribute(
    'href',
    '/test/browser/fixtures/svg-fragment-' +
      (paint === 'gradient' ? 'paint' : 'pattern') +
      '.svg#' +
      kind,
  )
  use.setAttribute('width', '20')
  use.setAttribute('height', '20')
  svg.append(use)
  root.append(svg)
  ;['blue', 'yellow'].forEach((color) => {
    const control = document.createElement('div')
    control.style.cssText = `flex:none;width:20px;height:20px;background:${color}`
    root.append(control)
  })
  const host = document.createElement('div'),
    globalDefinitions = definitions.cloneNode(false)
  if (shadow) {
    const scope = host.attachShadow({ mode: 'open' })
    scope.append(definitions, root)
    globalDefinitions.innerHTML =
      '<defs>' + paintDefinition(paint, paintID, 'red') + '</defs>'
    document.body.append(host, globalDefinitions)
  } else document.body.append(definitions, root)
  const requests = [],
    renderer = api.createRenderer({
      pixelRatio: 1,
      skipFonts: true,
      resources: {
        resolve: (request) => {
          requests.push(request)
        },
      },
    })
  let capture
  try {
    const deadline = performance.now() + 5000
    while (use.getBBox().width !== 20 && performance.now() < deadline)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    if (use.getBBox().width !== 20)
      throw new Error('Native fragment-paint positive control did not load')
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const markup = () =>
      root.outerHTML +
      definitions.outerHTML +
      (shadow ? globalDefinitions.outerHTML : '')
    const source = markup(),
      before = readNative ? await readNative(root.id) : undefined,
      ideal = new ImageData(60, 20)
    const actualDefinition = !policy.fragmentPage || present
    const color = policy.fragmentPage
      ? present
        ? [0, 0, 255, 255]
        : [128, 0, 128, 255]
      : [0, 128, 0, 255]
    const stroke = kind === 'attribute' && policy.file
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 60; x++)
        ideal.data.set(
          x < 20
            ? stroke && (x === 0 || x === 19 || y === 0 || y === 19)
              ? [0, 0, 255, 255]
              : color
            : x < 40
              ? [0, 0, 255, 255]
              : [255, 255, 0, 255],
          4 * (y * 60 + x),
        )
    const authored = await authoredImage(
      paint,
      actualDefinition,
      policy.fragmentPage ? 'blue' : 'green',
      stroke,
    )
    capture = await renderer.capture(root)
    const actual = await capture.toImageData(),
      after = readNative ? await readNative(root.id) : undefined
    const sourceUnchanged =
      source === markup() && (!before || difference(before, after) === 0)
    const nativeDifferentChannels = before ? difference(before, actual) : null
    const referenceDifferentChannels = before ? difference(before, ideal) : null
    const actualDifferentChannels = difference(authored.image, actual),
      imageBoundaryChannels = difference(ideal, authored.image)
    await record?.({
      kind: 'svg-fragment-' + paint + '-' + (shadow ? 'shadow-' : '') + name,
      mode,
      policy,
      sourceUnchanged,
      sourceBefore: source,
      sourceAfter: markup(),
      nativeDifferentChannels,
      referenceDifferentChannels,
      actualDifferentChannels,
      imageBoundaryChannels,
      authoredSVG: authored.xml,
      ideal: png(ideal),
      requests,
      diagnostics: capture.diagnostics,
      native: before && png(before),
      capture: png(actual),
      authored: png(authored.image),
    })
    if (!sourceUnchanged)
      throw new Error('Fragment capture changed the source or page definition')
    if (referenceDifferentChannels)
      throw new Error(
        'Independent fragment semantic reference differs from native: ' +
          referenceDifferentChannels,
      )
    if (paint === 'pattern' && imageBoundaryChannels)
      throw new Error(
        'Solid pattern image differs from native reference: ' +
          imageBoundaryChannels,
      )
    if (actualDifferentChannels)
      throw new Error(
        name +
          ' output differs from independent SVG image in ' +
          actualDifferentChannels +
          ' channels',
      )
    return {
      sourceUnchanged,
      imagePixelMatch: true,
      nativePixelMatch: before ? nativeDifferentChannels === 0 : null,
      nativeSourceMatchesReference: before
        ? referenceDifferentChannels === 0
        : null,
      imageBoundaryChannels,
      requests,
    }
  } finally {
    capture?.dispose()
    renderer.dispose()
    root.remove()
    definitions.remove()
    host.remove()
    globalDefinitions.remove()
  }
}
