const family = 'SVG Attribute Metrics'
const fontURL = '/test/browser/fixtures/font-metrics.ttf'
export const svgFontModes = [
  'attribute',
  'inline',
  'inherited',
  'attribute-root',
  'inline-root',
  'inherited-root',
]

export async function observeSVGFontGlyphs(api, mode, readNative) {
  const sheet = document.createElement('style')
  sheet.textContent = `@font-face{font-family:"${family}";src:url("${fontURL}") format("truetype")}`
  document.head.append(sheet)
  const root = document.createElement('div')
  root.id = 'svg-font-glyph-wrapper'
  root.style.cssText = 'width:20px;height:20px;background:white'
  root.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><text x="0" y="16" font-size="20" fill="red">A</text></svg>'
  const text = root.querySelector('text')
  const kind = mode.split('-')[0]
  if (kind === 'attribute') text.setAttribute('font-family', family)
  else if (kind === 'inline') text.style.fontFamily = family
  else root.querySelector('svg').setAttribute('font-family', family)
  const target = mode.endsWith('-root') ? root.firstElementChild : root
  target.id = 'svg-font-glyph-source'
  target.style.backgroundColor = 'white'
  document.body.append(root)
  const source = root.outerHTML
  const sample = (image) =>
    Array.from(
      image.data.slice(
        4 * (2 * image.width + 2),
        4 * (2 * image.width + 2) + 4,
      ),
    )
  const capture = async (options = {}) => {
    const canvas = await api.toCanvas(target, { pixelRatio: 1, ...options })
    return sample(
      canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height),
    )
  }
  try {
    await document.fonts.load(`20px "${family}"`, 'A')
    const native = readNative ? sample(await readNative(target.id)) : undefined
    const automatic = await capture()
    const omitted = await capture({ skipFonts: true })
    const font = await (await fetch(fontURL)).blob()
    const dataURL = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(font)
    })
    const explicit = await capture({
      fontEmbedCSS: `@font-face{font-family:"${family}";src:url("${dataURL}") format("truetype")}`,
    })
    const svg = await api.toSvg(target)
    const xml = decodeURIComponent(svg.slice(svg.indexOf(',') + 1))
    return {
      mode,
      native,
      automatic,
      omitted,
      explicit,
      fontEmbedded:
        xml.includes('@font-face') && /url\(\s*['"]?data:/i.test(xml),
      sourceUnchanged: root.outerHTML === source,
    }
  } finally {
    root.remove()
    sheet.remove()
  }
}

export async function checkSVGFontGlyphs(api, mode, readNative) {
  const result = await observeSVGFontGlyphs(api, mode, readNative)
  const red = '255,0,0,255'
  const white = '255,255,255,255'
  if (result.native && result.native.join(',') !== red)
    throw new Error(`${mode} native font control: ${result.native}`)
  if (result.automatic.join(',') !== red)
    throw new Error(`${mode} automatic font pixels: ${result.automatic}`)
  if (result.omitted.join(',') !== white)
    throw new Error(`${mode} missing font negative control: ${result.omitted}`)
  if (result.explicit.join(',') !== red)
    throw new Error(
      `${mode} explicit font positive control: ${result.explicit}`,
    )
  if (!result.fontEmbedded || !result.sourceUnchanged)
    throw new Error(`${mode} font embedding or source state changed`)
  return result
}
