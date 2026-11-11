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

export async function checkNativeScroll(api, kind, readNative) {
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
