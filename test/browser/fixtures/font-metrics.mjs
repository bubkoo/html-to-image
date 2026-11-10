// Shared by the built ESM smoke page and the independent UMD package test.
export async function checkFontMetrics(api) {
  const sheet = document.createElement('style')
  sheet.textContent =
    '@font-face { font-family: "Capture Metrics"; src: url("/test/browser/fixtures/font-metrics.ttf") format("truetype"); }'
  document.head.append(sheet)
  const root = document.createElement('div')
  document.body.append(root)
  const colors = []
  try {
    await document.fonts.load('20.75px "Capture Metrics"')
    root.style.cssText =
      'width:max-content;height:56px;line-height:28px;font-size:20.75px;font-family:"Capture Metrics";font-kerning:normal;background:white;color:red;white-space:nowrap'
    root.textContent = 'AAAAA BBBBB'
    const range = document.createRange()
    range.selectNodeContents(root)
    const fullWidth = range.getBoundingClientRect().width
    root.style.width = `${(fullWidth * (1 + 19.9 / 20.75)) / 2}px`
    root.style.whiteSpace = 'normal'
    const sourceLines = Array.from(range.getClientRects())
    if (sourceLines.length !== 2)
      throw new Error(`source has ${sourceLines.length} lines`)
    const box = root.getBoundingClientRect()
    const x = sourceLines[1].left - box.left + 2.4 * 20.75
    const y = sourceLines[1].top - box.top + sourceLines[1].height / 2
    const svg = new DOMParser().parseFromString(
      decodeURIComponent((await api.toSvg(root)).split(',')[1]),
      'image/svg+xml',
    )
    const fontSize = svg.querySelector('foreignObject > div').style.fontSize
    if (fontSize !== '20.75px')
      throw new Error(`fractional font-size changed to ${fontSize}`)
    const sample = (image, pointX, pointY) => {
      const offset = 4 * (Math.floor(pointY) * image.width + Math.floor(pointX))
      const color = Array.from(image.data.slice(offset, offset + 4))
      colors.push(color)
      if (color.join(',') !== '255,0,0,255')
        throw new Error(`expected source text pixel, got ${color}`)
    }
    sample(await api.toImageData(root, { pixelRatio: 1 }), x, y)
    const cases = [
      ['auto', 20.75, 1],
      ['normal', 20.75, 2],
      ['none', 20.75, 1],
      ['auto', 8.75, 2],
      ['auto', 13.75, 2],
    ]
    for (let index = 0; index < cases.length; index += 1) {
      const [kerning, size, ratio] = cases[index]
      root.style.fontKerning = kerning
      root.style.fontSize = `${size}px`
      root.style.width = 'max-content'
      root.style.whiteSpace = 'nowrap'
      range.selectNodeContents(root)
      root.style.width = `${range.getBoundingClientRect().width + 0.25}px`
      root.style.whiteSpace = 'normal'
      if (range.getClientRects().length !== 1)
        throw new Error('source tight word wrapped')
      range.setStart(root.firstChild, 8)
      range.setEnd(root.firstChild, 9)
      const letter = range.getBoundingClientRect()
      const bounds = root.getBoundingClientRect()
      // The same live node is deliberately captured sequentially in each mode.
      // eslint-disable-next-line no-await-in-loop
      const image = await api.toImageData(root, { pixelRatio: ratio })
      sample(
        image,
        (letter.left - bounds.left + letter.width * 0.4) * ratio,
        (letter.top - bounds.top + letter.height / 2) * ratio,
      )
      if (
        root.style.fontSize !== `${size}px` ||
        getComputedStyle(root).fontKerning !== kerning
      )
        throw new Error('source metrics changed')
    }
    return {
      fontSize,
      sourceLines: sourceLines.length,
      colors,
      sourceUnchanged: true,
    }
  } finally {
    root.remove()
    sheet.remove()
  }
}
