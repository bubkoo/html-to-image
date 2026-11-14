let sequence = 0

export const nativeScrollCases = [
  'direct-text',
  'visible-text',
  'fractional',
  'positioned-padding',
  'visible-before',
  'paragraph',
  'inline',
  'float',
  'rtl',
  'padding',
  'padding-shadow',
  'nested',
  'sticky',
  'structural',
  'latent-snap-target',
  'latent-snap-pseudo-target',
  'snap-target',
  'snap-pseudo-target',
]

export async function createNativeScrollScene(kind) {
  const root = document.createElement('div')
  root.id = `native-scroll-${++sequence}`
  root.style.cssText =
    'position:absolute;left:0;top:0;width:40px;height:40px;overflow:hidden;background:white;margin:0;padding:0'
  const panel = document.createElement('div')
  panel.id = root.id + '-panel'
  panel.style.cssText =
    'width:40px;height:40px;overflow:auto;scrollbar-width:none;font:10px/20px monospace;white-space:pre;margin:0;padding:0;background:red'
  // Real text remains in the horizontal overflow, while the opaque marker
  // independently identifies the visible viewport without text raster noise.
  panel.append('paragraph overflowing in both directions\n')
  const marker = document.createElement(kind === 'inline' ? 'span' : 'div')
  marker.id = root.id + '-marker'
  marker.style.cssText =
    'display:inline-block;width:120px;height:120px;position:relative;background:green;vertical-align:top'
  if (kind === 'float') marker.style.cssFloat = 'left'
  if (kind === 'rtl') panel.style.direction = 'rtl'
  if (kind.includes('padding')) {
    panel.style.padding = '3px'
    panel.style.border = '1px solid blue'
  }
  if (kind === 'positioned-padding') panel.style.position = 'relative'
  if (kind === 'fractional') {
    panel.style.width = panel.style.height = '40.5px'
  }
  if (kind === 'visible-before') {
    panel.style.position = 'relative'
    const sheet = document.createElement('style')
    sheet.textContent = `#${panel.id}::before{content:"Z";color:purple;display:inline}`
    root.append(sheet)
  }
  if (kind === 'padding-shadow')
    marker.style.boxShadow = 'inset 20px 0 0 red,inset 0 20px 0 red'
  else {
    const top = document.createElement('div')
    top.style.cssText =
      'position:absolute;left:0;top:0;width:120px;height:20px;background:red'
    const side = document.createElement('div')
    side.style.cssText =
      'position:absolute;left:0;top:0;width:20px;height:120px;background:red'
    marker.append(top, side)
  }
  const dot = document.createElement('div')
  dot.style.cssText = `position:absolute;left:${kind === 'fractional' ? 44.5 : 44}px;top:${kind === 'fractional' ? 24.5 : 24}px;width:4px;height:4px;background:blue`
  marker.append(dot)
  if (kind === 'sticky') {
    const sticky = document.createElement('span')
    sticky.style.cssText =
      'position:sticky;top:0;left:0;display:inline-block;width:4px;height:120px;background:blue;vertical-align:top'
    panel.append(sticky)
  }
  panel.append(marker)
  if (kind === 'structural') {
    const style = document.createElement('style')
    style.textContent = `#${panel.id}::before{content:none!important} #${panel.id}>#${marker.id}:nth-child(1){background:green!important} #${panel.id}>#${marker.id}:nth-child(2){background:red!important}`
    root.append(style)
  }
  if (kind.includes('snap-')) {
    // Existing targets must keep their original behavior. The fixture's
    // runtime offset equals its native snap point, so it is a positive control.
    if (kind.startsWith('snap-')) panel.dataset.nativeSnap = 'both mandatory'
    if (kind.endsWith('snap-target')) marker.style.scrollSnapAlign = 'start'
    else {
      marker.style.position = 'relative'
      const style = document.createElement('style')
      style.textContent = `#${marker.id}::before{content:"";position:absolute;left:40px;top:20px;width:1px;height:1px;scroll-snap-align:start}`
      root.append(style)
    }
  }
  if (kind === 'paragraph') {
    const paragraph = document.createElement('p')
    paragraph.style.cssText = 'margin:0;white-space:pre;width:160px'
    paragraph.append(...panel.childNodes)
    panel.append(paragraph)
  }
  root.append(panel)
  if (kind === 'nested') {
    const outer = document.createElement('div')
    outer.id = root.id + '-outer'
    outer.style.cssText =
      'width:40px;height:40px;overflow:auto;scrollbar-width:none;background:red'
    const spacer = document.createElement('div')
    spacer.style.cssText = 'width:80px;height:20px;background:red'
    panel.style.marginLeft = '20px'
    panel.replaceWith(outer)
    outer.append(spacer, panel)
    const tail = document.createElement('div')
    tail.style.height = '80px'
    outer.append(tail)
  }
  if (kind === 'visible-text') {
    const sheet = document.createElement('style')
    sheet.textContent =
      '@font-face{font-family:"Native Scroll Metrics";src:url("/test/browser/fixtures/font-metrics.ttf") format("truetype")}'
    root.append(sheet)
    panel.style.cssText +=
      ';font:10px/20px "Native Scroll Metrics";font-kerning:none;font-synthesis:none;color:red;background:white'
    const line = String.fromCharCode(10)
    const blue = document.createElement('span')
    blue.style.cssText = 'color:blue;margin-left:50px'
    blue.textContent = 'AAAAAA'
    const green = document.createElement('span')
    green.style.cssText = 'color:green;margin-left:70px'
    green.textContent = 'AAAAAA'
    panel.replaceChildren(
      'AAAAAA' + line + 'AAAAAA' + line,
      blue,
      line,
      green,
      line + 'AAAAAA' + line + 'AAAAAA',
    )
  }
  document.body.append(root)
  if (kind === 'visible-text')
    await document.fonts.load('10px "Native Scroll Metrics"')
  return { root, panel }
}

async function positionNativeScene({ root, panel }, kind) {
  panel.style.scrollSnapType = panel.dataset.nativeSnap || 'none'
  const left = kind === 'rtl' ? -40 : kind === 'fractional' ? 40.5 : 40
  panel.scrollLeft = left
  panel.scrollTop =
    kind === 'visible-text' ? 47 : kind === 'fractional' ? 40.5 : 40
  if (kind === 'nested') {
    const outer = root.querySelector('#' + root.id + '-outer')
    outer.scrollLeft = 20
    outer.scrollTop = 20
  }
  await new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export async function checkNativeScroll(api, kind, readNative, recordMismatch) {
  const { root, panel } = await createNativeScrollScene(kind)
  const unscrolled = readNative ? await readNative(root.id) : undefined
  await positionNativeScene({ root, panel }, kind)
  const source = root.outerHTML
  const scrollers = [panel, ...root.querySelectorAll('[id$="-outer"]')]
  const offsets = scrollers.map((p) => [p.scrollLeft, p.scrollTop])
  const renderer = api.createRenderer({
    pixelRatio: 1,
    skipFonts: kind !== 'visible-text',
  })
  try {
    if (!offsets[0][0] || !offsets[0][1])
      throw new Error(`${kind}: native source did not scroll on both axes`)
    const native = readNative ? await readNative(root.id) : undefined
    const point = (data) =>
      Array.from(
        data.data.slice(
          4 * (20 * data.width + 20),
          4 * (20 * data.width + 20) + 4,
        ),
      ).join()
    if (native && kind !== 'visible-text' && point(native) !== '0,128,0,255')
      throw new Error(`${kind}: invalid native marker: ${point(native)}`)
    if (
      native &&
      unscrolled &&
      native.data.every((v, i) => v === unscrolled.data[i])
    )
      throw new Error(`${kind}: native source did not visibly move`)
    const capture = await renderer.capture(root)
    try {
      const image = await capture.toImageData()
      const center = 4 * (20 * image.width + 20)
      if (
        kind !== 'visible-text' &&
        Array.from(image.data.slice(center, center + 4)).join() !==
          '0,128,0,255'
      )
        throw new Error(`${kind}: capture lost the visible green marker`)
      let differingChannels = 0

      if (native) {
        if (image.width !== native.width || image.height !== native.height)
          throw new Error(`${kind}: native/capture dimensions differ`)
        differingChannels = image.data.reduce(
          (count, value, i) => count + (value !== native.data[i] ? 1 : 0),
          0,
        )
        if (differingChannels) {
          if (recordMismatch)
            await recordNativeMismatch(
              kind,
              root,
              panel,
              capture,
              image,
              native,
              readNative,
              recordMismatch,
            )
          const different = image.data.findIndex((v, i) => v !== native.data[i])
          throw new Error(
            `${kind}: native/capture channel ${different}: ${image.data[different]}, expected ${native.data[different]}`,
          )
        }
      }

      if (
        root.outerHTML !== source ||
        scrollers.some((p, i) =>
          offsets[i].some(
            (value, axis) => value !== [p.scrollLeft, p.scrollTop][axis],
          ),
        )
      )
        throw new Error(`${kind}: source DOM or scroll changed`)
      return {
        fullPixelMatch: native ? differingChannels === 0 : undefined,
        differingChannels,

        sourceUnchanged: true,
      }
    } finally {
      capture.dispose()
    }
  } finally {
    renderer.dispose()
    root.remove()
  }
}

// Diagnostics run only after the original strict comparison has failed.
// An independently authored SVG and a nonvisual fresh-URL replay distinguish
// clone/layout errors from SVG-image paint and first-decode cache behavior.
async function recordNativeMismatch(
  kind,
  root,
  panel,
  capture,
  image,
  native,
  readNative,
  record,
) {
  const frozen = decodeURIComponent(
    (await capture.toSvg()).split(',').slice(1).join(','),
  )
  const png = (data) => {
    const canvas = document.createElement('canvas')
    canvas.width = data.width
    canvas.height = data.height
    canvas.getContext('2d').putImageData(data, 0, 0)
    return canvas.toDataURL().split(',')[1]
  }
  const render = async (svg, contextOptions, operation) => {
    const img = new Image()
    img.decoding = 'sync'
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d', contextOptions)
    if (operation) ctx.globalCompositeOperation = operation
    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  const css = getComputedStyle(panel)
  const n = (name) => parseFloat(css.getPropertyValue(name)) || 0
  const x = panel.scrollLeft,
    y = panel.scrollTop
  let html = root.outerHTML.replace(
    '<div',
    '<div xmlns="http://www.w3.org/1999/xhtml"',
  )
  if (kind === 'visible-text') {
    const blob = await (
      await fetch('/test/browser/fixtures/font-metrics.ttf')
    ).blob()
    const font = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    html = html.replace('/test/browser/fixtures/font-metrics.ttf', font)
  }
  const rules =
    '#' +
    panel.id +
    '{scroll-snap-type:both mandatory!important;scroll-padding:0!important;scroll-behavior:auto!important}' +
    '#' +
    panel.id +
    '::before{all:initial!important;content:""!important;display:block!important;float:left!important;width:100%!important;height:1px!important;margin:0 -100% -1px 0!important;overflow:hidden!important;scroll-snap-align:start start!important;' +
    'scroll-margin-left:' +
    (n('padding-left') - x) +
    'px!important;scroll-margin-right:' +
    (x + n('padding-right')) +
    'px!important;scroll-margin-top:' +
    (n('padding-top') - y) +
    'px!important;scroll-margin-bottom:' +
    (y + panel.clientHeight - n('padding-top') - 1) +
    'px!important;}'
  const authoredSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    image.width +
    '" height="' +
    image.height +
    '"><style>' +
    rules +
    '</style><foreignObject width="100%" height="100%">' +
    html +
    '</foreignObject></svg>'
  const repeated = await render(frozen)
  const commentReplay = await render(
    '<!-- html-to-image diagnostic replay -->' + frozen,
  )
  const authored = await render(authoredSvg)
  const parsed = new DOMParser().parseFromString(frozen, 'image/svg+xml')
  parsed.documentElement.setAttribute('data-diagnostic-replay', 'fresh')
  const replaySvg = parsed.documentElement.outerHTML
  const replay = await render(replaySvg)
  const framePixels = async (markup, suffix) => {
    const frame = document.createElement('iframe')
    frame.id = root.id + '-diagnostic-' + suffix
    frame.style.cssText =
      'position:absolute;left:200px;top:0;width:40px;height:40px;border:0'
    const loaded = new Promise((resolve) => {
      frame.onload = resolve
    })
    frame.srcdoc = '<!doctype html><body style="margin:0">' + markup + '</body>'
    document.body.append(frame)
    try {
      await loaded
      await frame.contentDocument.fonts.ready
      await new Promise((resolve) =>
        frame.contentWindow.requestAnimationFrame(() =>
          frame.contentWindow.requestAnimationFrame(resolve),
        ),
      )
      return await readNative(frame.id)
    } finally {
      frame.remove()
    }
  }
  const styles = Array.from(parsed.documentElement.children)
    .filter((node) => node.tagName === 'style')
    .map((node) => node.outerHTML)
    .join('')
  const htmlPixels = await framePixels(
    styles + parsed.querySelector('foreignObject').innerHTML,
    'html',
  )
  const inlinePixels = await framePixels(frozen, 'svg')
  const difference = (a, b) =>
    a.data.reduce((count, value, i) => count + (value !== b.data[i] ? 1 : 0), 0)
  const canvasVariants = await Promise.all(
    [
      ['read-frequently', { willReadFrequently: true }],
      ['opaque-canvas', { alpha: false }],
      ['copy-composite', undefined, 'copy'],
      ['opaque-read-frequently', { alpha: false, willReadFrequently: true }],
    ].map(async ([name, options, operation]) => {
      const pixels = await render(frozen, options, operation)
      return {
        name,
        nativeDifferentChannels: difference(pixels, native),
      }
    }),
  )
  const variants = []
  const svgNS = 'http://www.w3.org/2000/svg'
  const variant = async (name, change) => {
    const doc = new DOMParser().parseFromString(frozen, 'image/svg+xml')
    change(doc)
    try {
      const data = await render(doc.documentElement.outerHTML)
      variants.push({ name, nativeDifferentChannels: difference(native, data) })
    } catch (error) {
      variants.push({ name, error: String(error) })
    }
  }
  await variant('foreign-overflow-visible', (doc) =>
    doc.querySelector('foreignObject').style.setProperty('overflow', 'visible'),
  )
  await variant('foreign-opacity-filter', (doc) =>
    doc
      .querySelector('foreignObject')
      .style.setProperty('filter', 'opacity(1)'),
  )
  await variant('group', (doc) => {
    const group = doc.createElementNS(svgNS, 'g'),
      foreign = doc.querySelector('foreignObject')
    foreign.replaceWith(group)
    group.append(foreign)
  })
  await variant('identity-filter', (doc) => {
    const filter = doc.createElementNS(svgNS, 'filter'),
      matrix = doc.createElementNS(svgNS, 'feColorMatrix')
    filter.id = 'diagnostic-identity-filter'
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    matrix.setAttribute('type', 'matrix')
    matrix.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0')
    filter.append(matrix)
    doc.documentElement.prepend(filter)
    doc
      .querySelector('foreignObject')
      .setAttribute('filter', 'url(#diagnostic-identity-filter)')
  })
  await variant('nested-svg-image', (doc) => {
    const img = doc.createElementNS(svgNS, 'image')
    img.setAttribute('width', '100%')
    img.setAttribute('height', '100%')
    img.setAttribute(
      'href',
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frozen),
    )
    doc.documentElement.replaceChildren(img)
  })
  await variant('nested-inline-svg', (doc) => {
    const foreign = doc.createElementNS(svgNS, 'foreignObject'),
      host = doc.createElementNS('http://www.w3.org/1999/xhtml', 'div')
    foreign.setAttribute('width', '100%')
    foreign.setAttribute('height', '100%')
    host.style.cssText = 'margin:0;padding:0;width:40px;height:40px'
    host.append(
      new DOMParser().parseFromString(frozen, 'image/svg+xml').documentElement,
    )
    foreign.append(host)
    doc.documentElement.replaceChildren(foreign)
  })
  await record({
    kind: 'native-' + kind,
    engine: /Firefox/.test(navigator.userAgent)
      ? 'firefox'
      : /Chrome/.test(navigator.userAgent)
        ? 'chromium'
        : 'webkit',
    userAgent: navigator.userAgent,
    offsets: [x, y],
    nativeDifferentChannels: difference(native, image),
    authoredNativeDifferentChannels: difference(native, authored),
    replayNativeDifferentChannels: difference(native, replay),
    replayAuthoredDifferentChannels: difference(replay, authored),
    replayInitialDifferentChannels: difference(replay, image),
    repeatedNativeDifferentChannels: difference(repeated, native),
    repeatedInitialDifferentChannels: difference(repeated, image),
    commentReplayNativeDifferentChannels: difference(commentReplay, native),
    canvasVariants,
    variants,
    htmlNativeDifferentChannels: difference(htmlPixels, native),
    inlineSvgNativeDifferentChannels: difference(inlinePixels, native),
    replayNativeMaxChannelDelta: replay.data.reduce(
      (max, value, i) => Math.max(max, Math.abs(value - native.data[i])),
      0,
    ),
    native: png(native),
    capture: png(image),
    authored: png(authored),
    replay: png(replay),
    html: png(htmlPixels),
    inline: png(inlinePixels),
    frozenSvg: frozen,
    authoredSvg,
    replaySvg,
  })
}
