import { readNativeSVGFixturePolicy } from './svg-native-styles.mjs'
const ns = 'http://www.w3.org/2000/svg'
const difference = (a, b) =>
  a.data.reduce((n, value, i) => n + (value !== b.data[i]), 0)
const png = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d').putImageData(image, 0, 0)
  return canvas.toDataURL().split(',')[1]
}
export async function checkSVGResponseURLs(api, cacheBust, readNative, record) {
  const policy = await readNativeSVGFixturePolicy()
  const id = crypto.randomUUID(),
    base = '/test/browser/svg-response-url/' + id + '/'
  const root = document.createElement('div')
  root.id = 'svg-response-' + id
  root.style.cssText = 'display:flex;width:100px;height:20px;background:white'
  const uses = []
  ;['assets/sprite.svg', 'entry.svg', 'chain.svg'].forEach((path) => {
    const svg = document.createElementNS(ns, 'svg'),
      use = document.createElementNS(ns, 'use')
    svg.setAttribute('width', '20')
    svg.setAttribute('height', '20')
    svg.style.flex = 'none'
    use.setAttribute('href', base + path + '#icon')
    use.setAttribute('width', '20')
    use.setAttribute('height', '20')
    svg.append(use)
    root.append(svg)
    uses.push(use)
  })
  ;['green', 'yellow'].forEach((color) => {
    const control = document.createElement('div')
    control.style.cssText = `flex:none;width:20px;height:20px;background:${color}`
    root.append(control)
  })
  document.body.append(root)
  const requests = [],
    renderer = api.createRenderer({
      pixelRatio: 1,
      skipFonts: true,
      cacheBust,
      resources: {
        resolve: (request) => {
          requests.push(request)
        },
      },
    })
  let capture
  try {
    const deadline = performance.now() + 5000
    while (
      uses.some((use) => use.getBBox().width !== 20) &&
      performance.now() < deadline
    )
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    if (uses.some((use) => use.getBBox().width !== 20))
      throw new Error('Native redirect positive control did not load')
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const source = root.outerHTML,
      before = readNative ? await readNative(root.id) : undefined
    const expected = new ImageData(100, 20)
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 100; x++)
        expected.data.set(
          x < 60
            ? policy.file
              ? [0, 128, 0, 255]
              : [128, 0, 128, 255]
            : x < 80
              ? [0, 128, 0, 255]
              : [255, 255, 0, 255],
          4 * (y * 100 + x),
        )
    capture = await renderer.capture(root)
    const actual = await capture.toImageData(),
      after = readNative ? await readNative(root.id) : undefined
    const sourceUnchanged =
      source === root.outerHTML && (!before || difference(before, after) === 0)
    const nativeDifferentChannels = before ? difference(before, actual) : null
    const referenceDifferentChannels = before
      ? difference(before, expected)
      : null
    const actualDifferentChannels = difference(expected, actual)
    await record?.({
      kind: 'svg-response-urls-' + cacheBust,
      policy,
      requests,
      sourceUnchanged,
      sourceBefore: source,
      sourceAfter: root.outerHTML,
      nativeDifferentChannels,
      referenceDifferentChannels,
      actualDifferentChannels,
      native: before && png(before),
      capture: png(actual),
      authored: png(expected),
      diagnostics: capture.diagnostics,
    })
    if (!sourceUnchanged) throw new Error('Redirect capture changed its source')
    if (referenceDifferentChannels)
      throw new Error(
        'Independent redirect reference differs from native: ' +
          referenceDifferentChannels,
      )
    if (actualDifferentChannels)
      throw new Error(
        'Redirect CSS output differs in ' +
          actualDifferentChannels +
          ' channels',
      )
    return { sourceUnchanged, fullPixelMatch: true, requests }
  } finally {
    capture?.dispose()
    renderer.dispose()
    root.remove()
  }
}
