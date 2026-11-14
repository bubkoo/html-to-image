const namespace = 'http://www.w3.org/2000/svg'
export const svgNativeStyleCases = [
  'class',
  'cascade',
  'inheritance',
  'dependencies',
  'plain',
  'main-tag',
  'host-contexts',
  'host-inherit-no-page',
  'host-vars',
  'main-id',
  'page-outside',
  'page-ancestor',
  'page-structural',
  'whole-style',
  'nested-style',
  'nested-style-plain',
  'nested-simple',
  'nested-external',
  'late-page-css',
  'unreadable-sheet',
  'page-paint',
  'file-media',
  'file-media-active',
  'file-type',
  'file-invalid-url',
  'loaded-page-font',
  'page-outside-width',
]
let sequence = 0
let referencePolicy

async function nativeFixturePolicy() {
  const style = document.createElement('style')
  style.textContent = '.hti-native-page-hidden{display:none!important}'
  const svg = document.createElementNS(namespace, 'svg')
  svg.style.cssText = 'position:absolute;left:-9999px;opacity:0'
  const uses = ['file', 'page', 'control', ''].map((id) => {
    const use = document.createElementNS(namespace, 'use')
    use.setAttribute(
      'href',
      '/test/browser/fixtures/svg-styles/native-policy.svg' +
        (id ? '#' + id : ''),
    )
    svg.append(use)
    return use
  })
  document.head.append(style)
  document.body.append(svg)
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      const widths = uses.map((use) => use.getBBox().width)
      if (widths.slice(0, 3).every((width) => width > 0)) {
        if (
          widths[2] !== 21 ||
          !widths.slice(0, 3).every((width) => width === 1 || width === 21) ||
          ![0, 21].includes(widths[3])
        )
          throw new Error('Invalid native policy fixture geometry')
        return {
          file: widths[0] === 1,
          page: widths[1] === 1,
          whole: widths[3] === 21,
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    throw new Error('Native HTTP SVG policy fixture did not load')
  } finally {
    svg.remove()
    style.remove()
  }
}

async function authoredPixelReference(name) {
  const policy = await readNativeSVGFixturePolicy()
  const green = [0, 128, 0, 255],
    blue = [0, 0, 255, 255],
    black = [0, 0, 0, 255],
    yellow = [255, 255, 0, 255],
    white = [255, 255, 255, 255]
  let left = green,
    right = policy.file || name.startsWith('host-') ? blue : black
  if (
    policy.file &&
    [
      'whole-style',
      'nested-simple',
      'nested-external',
      'file-media-active',
    ].includes(name)
  )
    left = [128, 0, 128, 255]
  if (policy.page) {
    if (
      [
        'class',
        'cascade',
        'inheritance',
        'dependencies',
        'main-tag',
        'host-contexts',
        'page-outside',
        'page-structural',
        'whole-style',
        'nested-style',
        'nested-external',
        'late-page-css',
        'unreadable-sheet',
        'file-media',
        'file-media-active',
        'file-type',
        'file-invalid-url',
        'loaded-page-font',
        'page-outside-width',
      ].includes(name)
    )
      left = right = yellow
    if (name === 'main-id') left = yellow
    if (name === 'page-paint') left = right = blue
  }
  if (name === 'whole-style' && !policy.whole) left = white
  const reference = new ImageData(60, 20)
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 60; x++) {
      const clipped =
        (name === 'dependencies' && policy.file && x < 20 && x >= 12) ||
        (name === 'page-paint' && policy.page && x < 40 && x % 20 >= 12)
      const color = x >= 40 ? yellow : clipped ? white : x >= 20 ? right : left
      reference.data.set(color, (y * 60 + x) * 4)
    }
  }
  return reference
}

export function readNativeSVGFixturePolicy() {
  referencePolicy ||= nativeFixturePolicy()
  return referencePolicy
}

export async function checkSVGNativeStyles(api, name, readNative, record) {
  await readNativeSVGFixturePolicy()
  const root = document.createElement('div')
  root.id = 'svg-native-style-' + ++sequence
  root.style.cssText = 'display:flex;width:60px;height:20px;background:white'
  const asset = ['loaded-page-font', 'page-outside-width'].includes(name)
    ? 'class'
    : name === 'page-paint'
      ? 'class'
      : name === 'unreadable-sheet'
        ? 'class'
        : name === 'late-page-css'
          ? 'class'
          : name === 'nested-style-plain'
            ? 'nested-style'
            : ['page-ancestor', 'page-structural'].includes(name)
              ? 'class'
              : name === 'main-id'
                ? 'cascade'
                : name === 'page-outside'
                  ? 'class'
                  : name === 'main-tag'
                    ? 'class'
                    : name === 'host-inherit-no-page'
                      ? 'host-contexts'
                      : name
  root.innerHTML =
    '<style>.shared{fill:yellow!important}</style>' +
    '<svg xmlns="' +
    namespace +
    '" width="20" height="20"><use href="/test/browser/fixtures/svg-styles/' +
    asset +
    '.svg#icon" fill="green" width="20" height="20"/></svg>' +
    '<svg xmlns="' +
    namespace +
    '" width="20" height="20"><use href="/test/browser/fixtures/svg-styles/other.svg#icon" width="20" height="20"/></svg>' +
    '<svg xmlns="' +
    namespace +
    '" width="20" height="20"><rect class="shared" fill="yellow" width="20" height="20"/></svg>'
  if (['plain', 'host-inherit-no-page', 'host-vars'].includes(name))
    root.querySelector('style').remove()
  if (['nested-style-plain', 'nested-simple'].includes(name))
    root.querySelector('style').remove()
  if (name === 'whole-style')
    root
      .querySelector('use')
      .setAttribute('href', '/test/browser/fixtures/svg-styles/whole-style.svg')
  if (name === 'main-tag')
    root.querySelector('style').textContent = 'rect{fill:yellow!important}'
  if (name === 'main-id')
    root.querySelector('style').textContent = '#shape{fill:yellow!important}'
  if (name === 'page-paint') {
    const paint = root.id + '-paint',
      clip = root.id + '-clip'
    root.querySelector('style').textContent =
      '.shared{fill:url(#' +
      paint +
      ')!important;clip-path:url(#' +
      clip +
      ')!important}'
    root.querySelector('rect').removeAttribute('class')
    const definitions = document.createElementNS(namespace, 'svg')
    definitions.style.cssText = 'position:absolute;width:0;height:0'
    definitions.innerHTML =
      '<defs><linearGradient id="' +
      paint +
      '"><stop stop-color="blue"/></linearGradient><clipPath id="' +
      clip +
      '"><rect width="12" height="20"/></clipPath></defs>'
    root.prepend(definitions)
  }
  if (name === 'page-outside-width')
    root.querySelector('style').textContent =
      'rect{width:20px!important}.shared{fill:yellow!important}'
  if (name === 'page-ancestor') {
    root.className = 'style-context-parent'
    root.querySelector('style').textContent =
      '.style-context-parent .shared{fill:yellow!important}'
  }
  if (name === 'page-structural')
    root.querySelector('style').textContent =
      'symbol:first-child>.shared{fill:yellow!important}'
  let outsideStyle
  if (['page-outside', 'late-page-css', 'page-outside-width'].includes(name)) {
    outsideStyle = root.querySelector('style')
    document.head.append(outsideStyle)
  }
  if (name.startsWith('host-')) {
    const uses = root.querySelectorAll('use')
    uses[1].setAttribute('href', uses[0].getAttribute('href'))
    uses[1].setAttribute('fill', 'blue')
    if (name === 'host-vars') {
      uses[0].parentElement.style.setProperty('--tile', 'green')
      uses[1].parentElement.style.setProperty('--tile', 'blue')
    }
  }
  document.body.append(root)
  let loadedFontSheet
  let loadedFontCount = 0
  if (name === 'loaded-page-font') {
    loadedFontSheet = document.createElement('style')
    loadedFontSheet.textContent =
      '@font-face{font-family:"SVG Native Page Font";src:url("/test/browser/fixtures/font-metrics.ttf")}'
    document.head.append(loadedFontSheet)
    root.style.fontFamily = '"SVG Native Page Font"'
    try {
      const faces = await document.fonts.load('20px "SVG Native Page Font"')
      loadedFontCount = faces.length
      if (faces.length !== 1 || faces[0].status !== 'loaded')
        throw new Error('Loaded page font positive control failed')
    } catch (error) {
      loadedFontSheet.remove()
      outsideStyle?.remove()
      root.remove()
      throw error
    }
  }
  let opaqueSheet
  if (name === 'unreadable-sheet') {
    opaqueSheet = document.createElement('link')
    opaqueSheet.rel = 'stylesheet'
    const url = new URL(
      '/test/browser/fixtures/svg-styles/unrelated.css?direct',
      location.href,
    )
    url.port = String(Number(url.port) + 1)
    opaqueSheet.href = url.href
    const loaded = new Promise((resolve, reject) => {
      opaqueSheet.onload = resolve
      opaqueSheet.onerror = () =>
        reject(new Error('Cross-origin CSS control did not load'))
    })
    document.head.append(opaqueSheet)
    try {
      await loaded
    } catch (error) {
      opaqueSheet.remove()
      outsideStyle?.remove()
      root.remove()
      throw error
    }
    let unreadable = false
    try {
      Array.from(opaqueSheet.sheet.cssRules)
    } catch {
      unreadable = true
    }
    if (!unreadable)
      throw new Error('Cross-origin stylesheet negative control is readable')
  }
  let wholeControl
  if (name === 'whole-style') {
    wholeControl = document.createElementNS(namespace, 'svg')
    wholeControl.style.cssText = 'position:absolute;left:-9999px;opacity:0'
    wholeControl.innerHTML =
      '<use href="/test/browser/fixtures/svg-styles/whole-style.svg#icon" width="20" height="20"/>'
    document.body.append(wholeControl)
  }
  const requests = []
  const renderer = api.createRenderer({
    pixelRatio: 1,
    skipFonts: true,
    resources: {
      resolve: ({ url }) => {
        requests.push(url)
        if (name === 'late-page-css' && requests.length === 1)
          outsideStyle.textContent = '.shared{fill:red!important}'
      },
    },
  })
  let capture
  try {
    const uses = Array.from(root.querySelectorAll('use'))
    if (wholeControl) uses[0] = wholeControl.querySelector('use')
    await Promise.all(
      uses.map(async (use) => {
        for (let attempt = 0; attempt < 60; attempt++) {
          if (use.getBBox().width > 0) return
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
        throw new Error(
          'Native external SVG did not load: ' + use.getAttribute('href'),
        )
      }),
    )
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const source = root.outerHTML
    const rect = root.getBoundingClientRect()
    const native = readNative
      ? await readNative(root.id)
      : await authoredPixelReference(name)
    const reference = readNative ? await authoredPixelReference(name) : native
    const point = (data, x) =>
      Array.from(data.data.slice((10 * 60 + x) * 4, (10 * 60 + x) * 4 + 4))
    if (
      native.width !== 60 ||
      native.height !== 20 ||
      point(native, 50).join() !== '255,255,0,255'
    )
      throw new Error('Invalid source screenshot or yellow geometry control')
    capture = await renderer.capture(root)
    if (
      capture.diagnostics.some(
        (item) => item.resource === 'external-svg-style-probe',
      )
    )
      throw new Error(
        'Native SVG style probe was unavailable for a normal source fixture',
      )
    const pixels = await capture.toImageData()
    if (name === 'late-page-css')
      outsideStyle.textContent = '.shared{fill:yellow!important}'
    if (name.startsWith('host-') && requests.length !== 1)
      throw new Error(
        'Same SVG resource was not deduplicated across style contexts',
      )
    let different = 0
    for (let i = 0; i < pixels.data.length; i++)
      if (pixels.data[i] !== native.data[i]) different++
    if (record) {
      const png = (data) => {
        const canvas = document.createElement('canvas')
        canvas.width = data.width
        canvas.height = data.height
        canvas.getContext('2d').putImageData(data, 0, 0)
        return canvas.toDataURL().split(',')[1]
      }
      await record({
        kind: 'external-style-' + name,
        engine: /Firefox/.test(navigator.userAgent)
          ? 'firefox'
          : /Chrome/.test(navigator.userAgent)
            ? 'chromium'
            : 'webkit',
        nativeDifferentChannels: different,
        nativeCenters: [10, 30, 50].map((x) => point(native, x)),
        captureCenters: [10, 30, 50].map((x) => point(pixels, x)),
        diagnostics: capture.diagnostics,
        loadedFontCount,
        native: png(native),
        capture: png(pixels),
        frozenSvg: decodeURIComponent(
          (await capture.toSvg()).split(',').slice(1).join(','),
        ),
      })
    }
    if (
      root.outerHTML !== source ||
      root.getBoundingClientRect().width !== rect.width ||
      root.getBoundingClientRect().height !== rect.height
    )
      throw new Error('Capture changed native SVG source or geometry')
    if (reference.data.some((value, index) => value !== native.data[index]))
      throw new Error(
        'Authored reference differs from native ' +
          name +
          ': ' +
          JSON.stringify([10, 30, 50].map((x) => point(native, x))),
      )
    if (pixels.width !== 60 || pixels.height !== 20 || different)
      throw new Error(
        name +
          ': exported SVG differs from the native page in ' +
          different +
          ' channels',
      )
    return {
      fullPixelMatch: true,
      sourceUnchanged: true,
      oracle: readNative
        ? 'native screenshot'
        : 'authored reference selected by independent native HTTP geometry',
    }
  } finally {
    capture?.dispose()
    renderer.dispose()
    outsideStyle?.remove()
    wholeControl?.remove()
    loadedFontSheet?.remove()
    opaqueSheet?.remove()
    root.remove()
  }
}
