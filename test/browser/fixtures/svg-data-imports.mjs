import { readNativeSVGFixturePolicy } from './svg-native-styles.mjs'

const namespace = 'http://www.w3.org/2000/svg'
const directory = '/test/browser/fixtures/svg-data-imports/'
export const svgDataImportCases = [
  'basic',
  'nested',
  'media-active',
  'media-inactive',
  'supports-active',
  'supports-inactive',
  'layer',
  'layer-only',
  'layer-inline',
  'layer-inline-only',
  'wrong-mime',
  'style-type',
  'supports-header',
  'charset-header',
  'charset-rule',
  'charset-bom',
  'charset-utf16',
  'charset-invalid',
  'invalid-data',
  'paint-fragment',
  'paint-relative',
]
let sequence = 0
let importPolicy

async function readImportPolicy() {
  const native = await readNativeSVGFixturePolicy()
  if (!native.file)
    return {
      file: false,
      imports: false,
      fileLayers: 'ordered',
      importLayers: 'ordered',
    }
  const svg = document.createElementNS(namespace, 'svg')
  svg.style.cssText = 'position:absolute;left:-9999px;opacity:0'
  const use = document.createElementNS(namespace, 'use')
  let loaded = false
  use.addEventListener('load', () => {
    loaded = true
  })
  use.setAttribute('href', directory + 'policy.svg#probe')
  const control = document.createElementNS(namespace, 'use')
  control.setAttribute('href', directory + 'policy.svg#control')
  svg.append(use, control)
  const layers = [
    'inline-marker',
    'inline-priority',
    'import-marker',
    'import-priority',
  ].map((id) => {
    const node = document.createElementNS(namespace, 'use')
    node.setAttribute('href', directory + 'policy.svg#' + id)
    svg.append(node)
    return node
  })
  document.body.append(svg)
  try {
    const deadline = performance.now() + 5000
    while (
      (!loaded || control.getBBox().width !== 21) &&
      performance.now() < deadline
    )
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    const width = use.getBBox().width
    if (!loaded || control.getBBox().width !== 21 || ![1, 21].includes(width))
      throw new Error('Independent HTTP data-import fixture did not load')
    const widths = layers.map((node) => node.getBBox().width)
    if (!widths.every((value) => [1, 21].includes(value)))
      throw new Error('Layer probe did not load')
    const mode = (marker, priority) =>
      marker === 21 ? 'none' : priority === 1 ? 'ordered' : 'flat'
    return {
      file: true,
      imports: width === 1,
      fileLayers: mode(widths[0], widths[1]),
      importLayers: mode(widths[2], widths[3]),
    }
  } finally {
    svg.remove()
  }
}

const difference = (a, b) =>
  a.data.reduce((n, value, i) => n + (value !== b.data[i]), 0)
const png = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d').putImageData(image, 0, 0)
  return canvas.toDataURL().split(',')[1]
}

export function getSVGDataImportFixturePolicy() {
  importPolicy ||= readImportPolicy()
  return importPolicy
}

export async function checkSVGDataImports(
  api,
  name,
  readNative,
  record,
  captureOptions = {},
) {
  const policy = await getSVGDataImportFixturePolicy()
  const root = document.createElement('div')
  root.id = 'svg-data-import-' + ++sequence
  root.style.cssText = 'display:flex;width:60px;height:20px;background:white'
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.style.flex = 'none'
  const use = document.createElementNS(namespace, 'use')
  use.setAttribute('href', directory + name + '.svg#icon')
  use.setAttribute('width', '20')
  use.setAttribute('height', '20')
  svg.append(use)
  root.append(svg)
  ;['blue', 'yellow'].forEach((color) => {
    const control = document.createElement('div')
    control.style.cssText = `flex:none;width:20px;height:20px;background:${color}`
    root.append(control)
  })
  document.body.append(root)
  const requests = []
  const renderer = api.createRenderer({
    pixelRatio: 1,
    skipFonts: true,
    ...captureOptions,
    resources: {
      ...captureOptions.resources,
      resolve: (request, context) => {
        const { url, kind } = request
        requests.push({ url, kind })
        return captureOptions.resources?.resolve?.(request, context)
      },
    },
  })
  let capture
  try {
    const deadline = performance.now() + 5000
    while (!use.getBBox().width && performance.now() < deadline)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    if (!use.getBBox().width)
      throw new Error('Native data-import scene did not load')
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const source = root.outerHTML
    const before = readNative ? await readNative(root.id) : undefined
    let color = [255, 0, 0, 255]
    const active = ![
      'media-inactive',
      'supports-inactive',
      'wrong-mime',
      'style-type',
      'invalid-data',
    ].includes(name)
    if (policy.imports && active) color = [0, 128, 0, 255]
    if (name === 'paint-fragment' && policy.imports) color = [0, 0, 255, 255]
    if (name === 'paint-relative' && policy.imports) color = [128, 0, 128, 255]
    if (name === 'layer')
      color = policy.file ? [0, 0, 255, 255] : [255, 0, 0, 255]
    if (name === 'layer' && policy.imports && policy.importLayers === 'ordered')
      color = [0, 128, 0, 255]
    if (name === 'layer-only')
      color =
        policy.imports && policy.importLayers !== 'none'
          ? [0, 128, 0, 255]
          : [255, 0, 0, 255]
    if (name === 'layer-inline')
      color = policy.file ? [0, 0, 255, 255] : [255, 0, 0, 255]
    if (
      name === 'layer-inline' &&
      policy.file &&
      policy.fileLayers === 'ordered'
    )
      color = [0, 128, 0, 255]
    if (name === 'layer-inline-only')
      color =
        policy.file && policy.fileLayers !== 'none'
          ? [0, 128, 0, 255]
          : [255, 0, 0, 255]
    if (name === 'supports-header')
      color = policy.file ? [0, 128, 0, 255] : [255, 0, 0, 255]
    const expected = new ImageData(60, 20)
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 60; x++)
        expected.data.set(
          x < 20 ? color : x < 40 ? [0, 0, 255, 255] : [255, 255, 0, 255],
          4 * (y * 60 + x),
        )
    capture = await renderer.capture(root)
    const actual = await capture.toImageData()
    const after = readNative ? await readNative(root.id) : undefined
    const nativeDifferentChannels = before ? difference(before, actual) : null
    const referenceDifferentChannels = before
      ? difference(before, expected)
      : null
    const actualDifferentChannels = difference(expected, actual)
    const sourceUnchanged =
      source === root.outerHTML && (!before || difference(before, after) === 0)
    if (record)
      await record({
        kind: 'svg-data-import-' + name,
        policy,
        nativeDifferentChannels,
        referenceDifferentChannels,
        actualDifferentChannels,
        sourceUnchanged,
        sourceBefore: source,
        sourceAfter: root.outerHTML,
        sourceRasterDifferentChannels: before
          ? difference(before, after)
          : null,
        diagnostics: capture.diagnostics,
        requests,
        native: before && png(before),
        capture: png(actual),
        authored: png(expected),
      })
    if (!sourceUnchanged)
      throw new Error('Capture changed the SVG import source')
    if (referenceDifferentChannels)
      throw new Error(
        'Independent import reference differs from native: ' +
          name +
          ' ' +
          referenceDifferentChannels,
      )
    if (actualDifferentChannels)
      throw new Error(
        'SVG data import ' +
          name +
          ' differs in ' +
          actualDifferentChannels +
          ' channels',
      )
    return {
      fullPixelMatch: true,
      sourceUnchanged: true,
      requests,
      diagnostics: capture.diagnostics,
    }
  } finally {
    capture?.dispose()
    renderer.dispose()
    root.remove()
  }
}
