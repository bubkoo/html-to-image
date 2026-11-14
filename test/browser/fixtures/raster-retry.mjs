let sequence = 0

export async function checkRasterRetryFont(api) {
  const root = document.createElement('div')
  root.id = 'raster-font-' + ++sequence
  root.style.cssText =
    'position:absolute;left:0;top:0;width:40px;height:40px;overflow:hidden;background:white'
  const panel = document.createElement('div')
  panel.id = root.id + '-panel'
  panel.style.cssText =
    'width:40px;height:40px;overflow:auto;scrollbar-width:none;font:10px/20px "Raster Retry Font";white-space:pre;font-kerning:none;font-synthesis:none;color:red;background:white;scroll-snap-type:both mandatory;scroll-padding:0;scroll-behavior:auto'
  panel.append('AAAAAA\nAAAAAA\n')
  const blue = document.createElement('span'),
    green = document.createElement('span')
  blue.style.cssText = 'color:blue;margin-left:50px'
  blue.textContent = 'AAAAAA'
  green.style.cssText = 'color:green;margin-left:70px'
  green.textContent = 'AAAAAA'
  panel.append(blue, '\n', green, '\nAAAAAA\nAAAAAA')
  const sheet = document.createElement('style')
  sheet.textContent =
    '@font-face{font-family:"Raster Retry Font";src:url("/test/browser/fixtures/font-metrics.ttf") format("truetype")}#' +
    panel.id +
    '::before{all:initial!important;content:""!important;display:block!important;float:left!important;width:100%!important;height:1px!important;margin:0 -100% -1px 0!important;overflow:hidden!important;scroll-snap-align:start start!important;scroll-margin-left:-40px!important;scroll-margin-right:40px!important;scroll-margin-top:-47px!important;scroll-margin-bottom:86px!important}'
  root.append(sheet, panel)
  document.body.append(root)
  const renderer = api.createRenderer({
    pixelRatio: 1,
    stabilizationAttempts: 3,
  })
  let capture
  try {
    await document.fonts.load('10px "Raster Retry Font"')
    panel.scrollLeft = 40
    panel.scrollTop = 47
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    if (panel.scrollLeft !== 40 || panel.scrollTop !== 47)
      throw new Error('Authored snap source did not reach its target')
    const source = root.outerHTML
    capture = await renderer.capture(root)
    const frozen = await capture.toSvg(),
      image = await capture.toImageData()
    const svg = new DOMParser().parseFromString(
      decodeURIComponent(frozen.split(',').slice(1).join(',')),
      'image/svg+xml',
    )
    svg.documentElement.setAttribute(
      'data-independent-decode-reference',
      'font',
    )
    const reference = new Image()
    reference.crossOrigin = 'anonymous'
    reference.decoding = 'sync'
    const loaded = new Promise((resolve, reject) => {
      reference.onload = resolve
      reference.onerror = reject
    })
    reference.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(svg.documentElement.outerHTML)
    await loaded
    await reference.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 40
    const ctx = canvas.getContext('2d')
    ctx.drawImage(reference, 0, 0, 40, 40)
    const expected = ctx.getImageData(0, 0, 40, 40)
    let different = 0
    const colors = new Set()
    for (let i = 0; i < expected.data.length; i += 4) {
      colors.add(Array.from(expected.data.slice(i, i + 4)).join())
      for (let c = 0; c < 4; c++)
        if (image.data[i + c] !== expected.data[i + c]) different++
    }
    if (
      !['255,0,0,255', '0,0,255,255', '0,128,0,255'].every((color) =>
        colors.has(color),
      )
    )
      throw new Error('Fresh SVG font reference lost a glyph color')
    if (different)
      throw new Error(
        'Repeated SVG font decode differs from a fresh decoding in ' +
          different +
          ' channels',
      )
    if (
      root.outerHTML !== source ||
      panel.scrollLeft !== 40 ||
      panel.scrollTop !== 47 ||
      (await capture.toSvg()) !== frozen
    )
      throw new Error('Font retry changed source or frozen state')
    return { differentChannels: different, sourceUnchanged: true }
  } finally {
    capture?.dispose()
    renderer.dispose()
    root.remove()
  }
}

// Model an image decoder retaining an incomplete result for one SVG URL.
// New decode contexts must still draw the original frozen snapshot.
export async function checkRasterRetry(api, mode = 'retry') {
  const root = document.createElement('div')
  root.id = 'raster-retry-' + ++sequence
  root.style.cssText = 'position:relative;width:16px;height:12px;background:red'
  const clip = root.id + '-clip',
    gradient = root.id + '-gradient'
  root.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 12" style="position:absolute;left:8px;top:0"><defs><clipPath id="' +
    clip +
    '"><rect width="6" height="12"/></clipPath><linearGradient id="' +
    gradient +
    '"><stop offset=".5" stop-color="blue"/><stop offset=".5" stop-color="lime"/></linearGradient></defs><rect width="8" height="12" clip-path="url(#' +
    clip +
    ')" fill="url(#' +
    gradient +
    ')"/></svg>'
  document.body.append(root)
  let clones = 0
  const options = {
    pixelRatio: 1,
    skipFonts: true,
    onClone: () => {
      clones++
    },
  }
  if (mode === 'retry') options.stabilizationAttempts = 3
  const renderer = api.createRenderer(options)
  const proto = HTMLImageElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'src')
  if (!descriptor?.set) throw new Error('Image source setter is unavailable')
  const requests = []
  let first
  let capture
  const blank =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>',
    )
  try {
    capture = await renderer.capture(root)
    const frozen = await capture.toSvg()
    // Compare against the browser's healthy decoding of the exact SVG,
    // including its clip and gradient. Some engines quantize gradient edge
    // channels differently; retries must preserve every decoded channel.
    const referenceImage = new Image()
    referenceImage.crossOrigin = 'anonymous'
    referenceImage.decoding = 'sync'
    const referenceLoaded = new Promise((resolve, reject) => {
      referenceImage.onload = resolve
      referenceImage.onerror = reject
    })
    referenceImage.src = frozen
    await referenceLoaded
    await referenceImage.decode()
    const referenceCanvas = document.createElement('canvas')
    referenceCanvas.width = 16
    referenceCanvas.height = 12
    const referenceContext = referenceCanvas.getContext('2d')
    referenceContext.drawImage(referenceImage, 0, 0, 16, 12)
    const reference = referenceContext.getImageData(0, 0, 16, 12)
    const channel = (x, c) => reference.data[4 * (4 * 16 + x) + c]
    if (
      channel(0, 0) !== 255 ||
      channel(8, 2) !== 255 ||
      channel(12, 1) !== 255 ||
      channel(14, 0) !== 255 ||
      channel(8, 3) !== 255
    )
      throw new Error('Healthy SVG reference lost its paint or clip')
    // A re-clone would incorrectly observe this later source change.
    root.style.backgroundColor = 'green'
    Object.defineProperty(proto, 'src', {
      ...descriptor,
      set(value) {
        if (String(value).startsWith('data:image/svg+xml')) {
          requests.push(value)
          first ??= value
          if (mode !== 'healthy' && value === first) {
            descriptor.set.call(this, blank)
            return
          }
        }
        descriptor.set.call(this, value)
      },
    })
    const image = await capture.toImageData()
    if (image.width !== 16 || image.height !== 12)
      throw new Error('Retry changed image dimensions')
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 16; x++) {
        const actual = Array.from(
          image.data.slice(4 * (y * 16 + x), 4 * (y * 16 + x) + 4),
        )
        const expected =
          mode === 'single'
            ? [0, 0, 0, 0]
            : Array.from(
                reference.data.slice(4 * (y * 16 + x), 4 * (y * 16 + x) + 4),
              )
        if (actual.some((value, index) => value !== expected[index]))
          throw new Error(
            mode +
              ': frozen pixel ' +
              x +
              ',' +
              y +
              ' is ' +
              actual +
              '; expected ' +
              expected +
              '; decode requests=' +
              requests.length +
              '; distinct sources=' +
              new Set(requests).size,
          )
      }
    if (
      clones !== 1 ||
      root.style.backgroundColor !== 'green' ||
      (await capture.toSvg()) !== frozen
    )
      throw new Error('Retry re-read or changed the frozen/source state')
    const expectedRequests = mode === 'retry' ? 3 : 1
    if (requests.length !== expectedRequests)
      throw new Error('Retry did not honor the requested attempt count')
    await capture.toImageData()
    if (requests.length !== expectedRequests)
      throw new Error('Completed raster was not cached')
    return {
      mode,
      requests: requests.length,
      distinctSources: new Set(requests).size,
      clones,
      frozenUnchanged: true,
    }
  } finally {
    Object.defineProperty(proto, 'src', descriptor)
    capture?.dispose()
    renderer.dispose()
    root.remove()
  }
}
