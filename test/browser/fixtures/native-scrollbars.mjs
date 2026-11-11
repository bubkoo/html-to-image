let sequence = 0
export const nativeScrollbarCases = [
  'legacy-zero',
  'legacy-scrolled',
  'standard-zero',
  'standard-scrolled',
]

export async function checkNativeScrollbars(api, kind, readNative) {
  const root = document.createElement('div')
  root.id = `native-bars-${++sequence}`
  root.style.cssText =
    'position:absolute;left:0;top:0;width:100px;height:100px;overflow:hidden;background:white'
  const panel = document.createElement('div')
  panel.id = root.id + '-panel'
  panel.style.cssText =
    'width:100px;height:100px;overflow:scroll;background:green'
  const sheet = document.createElement('style')
  sheet.textContent = `#${panel.id}::-webkit-scrollbar{width:10px;height:10px;background:red}#${panel.id}::-webkit-scrollbar-track{background:red}#${panel.id}::-webkit-scrollbar-thumb{background:black;border-radius:0}#${panel.id}::-webkit-scrollbar-corner{background:blue}`
  if (kind.startsWith('standard')) {
    panel.style.scrollbarWidth = 'thin'
    panel.style.scrollbarColor = 'black red'
  } else document.head.append(sheet)
  panel.innerHTML =
    '<div style="position:relative;width:200px;height:300px;background:green"><div style="position:absolute;left:44px;top:54px;width:4px;height:4px;background:blue"></div></div>'
  root.append(panel)
  document.body.append(root)
  const renderer = api.createRenderer({ pixelRatio: 1, skipFonts: true })
  try {
    if (kind.endsWith('scrolled')) {
      panel.scrollLeft = 40
      panel.scrollTop = 50
    }
    const before = root.outerHTML,
      css = sheet.textContent,
      offsets = [panel.scrollLeft, panel.scrollTop]
    const native = readNative ? await readNative(root.id) : undefined
    const count = (data) => {
      const colors = { red: 0, black: 0, blue: 0 }
      for (let n = 0; n < data.length; n += 4) {
        const pixel = Array.from(data.slice(n, n + 4)).join()
        if (pixel === '255,0,0,255') colors.red++
        if (pixel === '0,0,0,255') colors.black++
        if (pixel === '0,0,255,255') colors.blue++
      }
      return colors
    }
    const nativeColors = native ? count(native.data) : undefined
    if (
      native &&
      (panel.clientWidth < 100 || panel.clientHeight < 100) &&
      (!nativeColors.red || !nativeColors.black)
    )
      throw new Error(
        `${kind}: native scrollbar control is not red/black: ${JSON.stringify(nativeColors)}`,
      )
    const capture = await renderer.capture(root)
    try {
      const image = await capture.toImageData()
      if (image.width !== 100 || image.height !== 100)
        throw new Error('bar viewport dimensions changed')
      const colors = count(image.data)
      if (native) {
        const different = image.data.findIndex(
          (value, i) => value !== native.data[i],
        )
        if (different !== -1)
          throw new Error(
            `${kind}: source/capture channel ${different}: ${image.data[different]}, expected ${native.data[different]}`,
          )
      }
      if (
        before !== root.outerHTML ||
        css !== sheet.textContent ||
        offsets[0] !== panel.scrollLeft ||
        offsets[1] !== panel.scrollTop
      )
        throw new Error('bar source mutated')
      return {
        kind,
        client: [panel.clientWidth, panel.clientHeight],
        offsets,
        nativeColors,
        captureColors: colors,
      }
    } finally {
      capture.dispose()
    }
  } finally {
    renderer.dispose()
    root.remove()
    sheet.remove()
  }
}
