let sequence = 0
export const scrollbarBoxCases = [
  'content',
  'border',
  'padding',
  'fractional',
  'gutter',
  'vertical',
  'legacy-fractional',
  'legacy-gutter',
  'selected-empty',
  'selected-logical',
  'scrolled',
  'scrolled-gutter',
]

export async function checkScrollbarBox(api, kind, readNative, record) {
  const root = document.createElement('div')
  root.id = `scrollbar-box-${++sequence}`
  root.style.cssText =
    'position:absolute;left:0;top:0;overflow:hidden;background:white;margin:0;padding:0'
  const panel = document.createElement('div')
  panel.id = root.id + '-panel'
  panel.style.cssText =
    'width:100px;height:100px;overflow:scroll;background:green;scrollbar-color:black red;scrollbar-width:thin'
  panel.style.colorScheme = 'light'
  if (kind === 'border') panel.style.boxSizing = 'border-box'
  if (kind === 'padding')
    panel.style.cssText += ';padding:3px;border:1px solid blue'
  if (kind === 'fractional' || kind.startsWith('legacy'))
    panel.style.width = panel.style.height = '100.5px'
  if (
    kind === 'gutter' ||
    kind === 'legacy-gutter' ||
    kind === 'scrolled-gutter'
  )
    panel.style.scrollbarGutter = 'stable both-edges'
  if (kind === 'vertical') panel.style.writingMode = 'vertical-rl'
  panel.innerHTML =
    '<div style="position:relative;width:200px;height:300px;background:green"><div style="position:absolute;left:44px;top:54px;width:4px;height:4px;background:blue"></div></div>'
  root.append(panel)
  if (kind.startsWith('legacy')) {
    panel.style.scrollbarColor = 'auto'
    panel.style.scrollbarWidth = 'auto'
    const sheet = document.createElement('style')
    sheet.textContent = `#${panel.id}::-webkit-scrollbar{width:10.5px;height:10.5px;background:red}#${panel.id}::-webkit-scrollbar-track{background:red}#${panel.id}::-webkit-scrollbar-thumb{background:black;border-radius:0}#${panel.id}::-webkit-scrollbar-corner{background:blue}`
    root.append(sheet)
  }
  document.body.append(root)
  const bounds = panel.getBoundingClientRect()
  root.style.width = `${Math.ceil(bounds.width)}px`
  root.style.height = `${Math.ceil(bounds.height)}px`
  const options = { pixelRatio: 1, skipFonts: true }
  if (kind.startsWith('selected'))
    options.stylePropertiesForNode = (node) =>
      node === panel
        ? kind === 'selected-empty'
          ? []
          : ['inline-size', 'block-size']
        : undefined
  if (kind.startsWith('scrolled')) {
    panel.scrollLeft = 40
    panel.scrollTop = 50
  }
  const renderer = api.createRenderer(options)
  try {
    const source = root.outerHTML,
      offsets = [panel.scrollLeft, panel.scrollTop]
    const css = getComputedStyle(panel)
    const metrics = {
      kind,
      boxSizing: css.boxSizing,
      resolved: [css.width, css.height],
      client: [panel.clientWidth, panel.clientHeight],
      outer: [bounds.width, bounds.height],
      offsets,
      clientOrigin: [panel.clientLeft, panel.clientTop],
      engine: /Firefox/.test(navigator.userAgent)
        ? 'firefox'
        : /Chrome/.test(navigator.userAgent)
          ? 'chromium'
          : 'webkit',
      userAgent: navigator.userAgent,
    }
    const native = readNative ? await readNative(root.id) : undefined
    const capture = await renderer.capture(root)
    try {
      const frozen = new DOMParser().parseFromString(
        decodeURIComponent(
          (await capture.toSvg()).split(',').slice(1).join(','),
        ),
        'image/svg+xml',
      )
      const frame = document.createElement('iframe')
      frame.style.cssText =
        'position:absolute;left:200px;top:0;width:160px;height:160px;border:0'
      const loaded = new Promise((resolve) => {
        frame.onload = resolve
      })
      frame.srcdoc =
        '<!doctype html><body style="margin:0">' +
        [...frozen.querySelectorAll('style')].map((s) => s.outerHTML).join('') +
        frozen.querySelector('foreignObject').innerHTML +
        '</body>'
      document.body.append(frame)
      try {
        await loaded
        const copy = frame.contentDocument.getElementById(panel.id)
        const rect = copy.getBoundingClientRect()
        metrics.serializedOuter = [rect.width, rect.height]
        metrics.serializedViewport = [copy.clientWidth, copy.clientHeight]
        const expected = kind.startsWith('scrolled')
          ? metrics.client
          : metrics.outer
        const actual = kind.startsWith('scrolled')
          ? metrics.serializedViewport
          : metrics.serializedOuter
        if (actual.some((value, i) => value !== expected[i]))
          throw new Error(`${kind}: source box ${expected} became ${actual}`)
      } finally {
        frame.remove()
      }
      const image = await capture.toImageData()
      const png = (data) => {
        const canvas = document.createElement('canvas')
        canvas.width = data.width
        canvas.height = data.height
        canvas.getContext('2d').putImageData(data, 0, 0)
        return canvas.toDataURL().split(',')[1]
      }
      if (
        image.width !== Math.ceil(bounds.width) ||
        image.height !== Math.ceil(bounds.height)
      )
        throw new Error(`${kind}: captured outer size changed`)
      if (kind.startsWith('scrolled')) {
        if (native) {
          let different = 0
          for (let y = 0; y < panel.clientHeight; y++)
            for (let x = 0; x < panel.clientWidth; x++)
              for (let c = 0; c < 4; c++)
                if (
                  image.data[
                    4 *
                      ((y + panel.clientTop) * image.width +
                        x +
                        panel.clientLeft) +
                      c
                  ] !==
                  native.data[
                    4 *
                      ((y + panel.clientTop) * native.width +
                        x +
                        panel.clientLeft) +
                      c
                  ]
                )
                  different++
          if (record)
            await record({
              ...metrics,
              native: png(native),
              capture: png(image),
              nativeContentDifferentChannels: different,
            })
          if (different)
            throw new Error(
              `${kind}: native content viewport differs in ${different} channels`,
            )
          metrics.nativeContentDifferentChannels = different
        } else {
          const start =
            4 * ((5 + panel.clientTop) * image.width + 5 + panel.clientLeft)
          if (
            Array.from(image.data.slice(start, start + 4)).join() !==
            '0,0,255,255'
          )
            throw new Error('Scrolled blue marker lost')
        }
      } else {
        const html = root.outerHTML.replace(
          '<div',
          '<div xmlns="http://www.w3.org/1999/xhtml"',
        )
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`
        const manual = new Image()
        manual.src =
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        await manual.decode()
        const c = document.createElement('canvas')
        c.width = image.width
        c.height = image.height
        const ctx = c.getContext('2d')
        ctx.drawImage(manual, 0, 0)
        const authored = ctx.getImageData(0, 0, c.width, c.height)
        const difference = (a, b) =>
          a.data.reduce((n, v, i) => n + (v !== b.data[i] ? 1 : 0), 0)
        const libraryAuthored = difference(image, authored)
        if (record)
          await record({
            ...metrics,
            native: native && png(native),
            capture: png(image),
            authored: png(authored),
            libraryAuthoredDifferentChannels: libraryAuthored,
            nativeDifferentChannels: native && difference(image, native),
          })
        if (libraryAuthored)
          throw new Error(
            `${kind}: frozen box differs from the original authored SVG in ${libraryAuthored} channels; metrics=${JSON.stringify(metrics)}`,
          )
        metrics.libraryAuthoredDifferentChannels = libraryAuthored
        if (native) {
          if (native.width !== image.width || native.height !== image.height)
            throw new Error(`${kind}: source/capture dimensions differ`)
          metrics.nativeDifferentChannels = difference(image, native)
          metrics.nativeAuthoredDifferentChannels = difference(authored, native)
        } else {
          const x = kind === 'vertical' ? 30 : 5,
            y = 5,
            k = 4 * (y * image.width + x)
          if (Array.from(image.data.slice(k, k + 4)).join() !== '0,128,0,255')
            throw new Error(`${kind}: capture lost the green content`)
        }
      }
      if (
        root.outerHTML !== source ||
        offsets[0] !== panel.scrollLeft ||
        offsets[1] !== panel.scrollTop
      )
        throw new Error(`${kind}: source mutated`)
      return metrics
    } finally {
      capture.dispose()
    }
  } finally {
    renderer.dispose()
    root.remove()
  }
}
