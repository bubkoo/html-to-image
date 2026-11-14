const namespace = 'http://www.w3.org/2000/svg'
const family = 'SVG Unit Metrics'
const fontURL = '/test/browser/fixtures/font-metrics.ttf'
let sequence = 0

const png = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d').putImageData(image, 0, 0)
  return canvas.toDataURL().split(',')[1]
}
const difference = (a, b) =>
  a.data.reduce((count, value, index) => count + (value !== b.data[index]), 0)

export async function checkSVGFontUnits(
  api,
  mode = 'loaded',
  readNative,
  record,
  captureOptions = {},
) {
  const sheet = document.createElement('style')
  sheet.textContent = `@font-face{font-family:"${family}";src:url("${fontURL}")}`
  document.head.append(sheet)
  const faces = await document.fonts.load(`20px "${family}"`, 'A')
  if (faces.length !== 1 || faces[0].status !== 'loaded')
    throw new Error('Source font positive control did not load')
  const size = mode === 'large' ? 30 : 20
  const usedFamily = mode === 'system' ? 'serif' : `"${family}",serif`
  const root = document.createElement('div')
  root.id = 'svg-font-units-' + ++sequence
  root.style.cssText = `display:flex;width:60px;height:30px;background:white;font-family:${usedFamily};font-size:${size}px`
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '30')
  svg.style.flex = 'none'
  const use = document.createElementNS(namespace, 'use')
  use.setAttribute(
    'href',
    '/test/browser/fixtures/svg-styles/font-units.svg#icon',
  )
  use.setAttribute('width', '20')
  use.setAttribute('height', '30')
  svg.append(use)
  root.append(svg)
  ;['blue', 'yellow'].forEach((color) => {
    const control = document.createElement('div')
    control.style.cssText = `flex:none;width:20px;height:30px;background:${color}`
    root.append(control)
  })
  document.body.append(root)
  const requests = []
  let renderer
  let capture
  try {
    const deadline = performance.now() + 5000
    while (!use.getBBox().width && performance.now() < deadline)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    if (!use.getBBox().width)
      throw new Error('Native external SVG did not load')
    const source = root.outerHTML
    const box = root.getBoundingClientRect()
    const nativeUseWidth = use.getBBox().width
    const before = readNative ? await readNative(root.id) : undefined
    const font = await (await fetch(fontURL)).blob()
    const fontDataURL = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(font)
    })
    const fontCSS = `@font-face{font-family:"${family}";src:url("${fontDataURL}")}`
    renderer = api.createRenderer({
      pixelRatio: 1,
      resources: {
        resolve: ({ url, kind }) => {
          requests.push({ url, kind })
        },
      },
      ...(typeof captureOptions === 'function'
        ? captureOptions(fontCSS)
        : captureOptions),
    })
    const xml = `<svg xmlns="${namespace}" width="60" height="30"><style>${fontCSS}</style><rect width="60" height="30" fill="white"/><rect width="1ex" height="20" fill="green" font-family='${usedFamily}' font-size="${size}"/><rect x="20" width="20" height="30" fill="blue"/><rect x="40" width="20" height="30" fill="yellow"/></svg>`
    const reference = new Image()
    reference.src = 'data:image/svg+xml,' + encodeURIComponent(xml)
    await reference.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 60
    canvas.height = 30
    canvas.getContext('2d').drawImage(reference, 0, 0)
    const authored = canvas.getContext('2d').getImageData(0, 0, 60, 30)
    capture = await renderer.capture(root)
    const actual = await capture.toImageData()
    const frozen = new DOMParser().parseFromString(
      decodeURIComponent((await capture.toSvg()).split(',').slice(1).join(',')),
      'image/svg+xml',
    )
    const capturedWidth = parseFloat(
      frozen.querySelector('symbol rect').style.width,
    )
    const after = readNative ? await readNative(root.id) : undefined
    const nativeDifferentChannels = before ? difference(before, actual) : null
    const referenceNativeDifferentChannels = before
      ? difference(before, authored)
      : null
    const authoredDifferentChannels = difference(actual, authored)
    const changed =
      root.outerHTML !== source ||
      root.getBoundingClientRect().width !== box.width ||
      root.getBoundingClientRect().height !== box.height ||
      (before && difference(before, after))
    if (record)
      await record({
        kind: 'svg-font-units-' + mode,
        nativeDifferentChannels,
        referenceNativeDifferentChannels,
        authoredDifferentChannels,
        nativeUseWidth,
        capturedWidth,
        sourceUnchanged: !changed,
        requests,
        diagnostics: capture.diagnostics,
        native: before && png(before),
        capture: png(actual),
        authored: png(authored),
      })
    if (changed) throw new Error('SVG font measurement changed the source')
    // Compare at CSSOM's serialized precision, independently from raster pixels.
    if (Math.round(nativeUseWidth * 1000) !== Math.round(capturedWidth * 1000))
      throw new Error(
        `SVG font width changed from ${nativeUseWidth} to ${capturedWidth}`,
      )
    if (authoredDifferentChannels)
      throw new Error(
        `SVG ${mode} font metrics differ in ${authoredDifferentChannels} channels`,
      )
    // The loaded 20px case also has a strict actual-page pixel gate. Larger
    // and system-font controls retain any native SVG-image/compositor gap.
    if (mode === 'loaded' && before && nativeDifferentChannels)
      throw new Error(
        `Loaded SVG font differs from page in ${nativeDifferentChannels} channels`,
      )
    return {
      fullImageReferenceMatch: true,
      sourceUnchanged: true,
      nativeDifferentChannels,
      referenceNativeDifferentChannels,
      nativeUseWidth,
      capturedWidth,
      requests,
    }
  } finally {
    capture?.dispose()
    renderer?.dispose()
    root.remove()
    sheet.remove()
  }
}
