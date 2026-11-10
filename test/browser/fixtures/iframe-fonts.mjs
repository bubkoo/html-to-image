function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function pixel(image, x, y = 8) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4)).join(',')
}

async function frame(parent, file, color, nested, family, important) {
  const element = parent.ownerDocument.createElement('iframe')
  element.style.cssText = `display:block;flex:none;width:${nested ? 40 : 20}px;height:20px;border:0`
  const loaded = new Promise((resolve) => {
    element.onload = resolve
  })
  const base = new URL('/test/browser/fixtures/', location.href).href
  element.srcdoc = `<base href="${base}"><body><style>@font-face{font-family:${family};src:url('${file}')}html,body{margin:0}body{display:flex;width:${nested ? 40 : 20}px;height:20px;background:white}#glyph{display:block;flex:none;width:20px;height:20px;font:20px/20px ${family};background:white;color:${color}${important ? '!important' : ''}}</style><span id="glyph">A</span>`
  parent.append(element)
  await loaded
  await element.contentDocument.fonts.load(`20px ${family}`)
  return element
}

export async function checkIframeFonts(api, mode = 'all') {
  if (mode === 'all') {
    const modes = [
      'content',
      'frame',
      'ancestor',
      'reused-css',
      'quoted-family',
      'explicit-css',
      'important-style',
    ]
    const results = []
    for (let index = 0; index < modes.length; index += 1) {
      // Each mode exercises a distinct public capture root or cached font CSS.
      // eslint-disable-next-line no-await-in-loop
      results.push(await checkIframeFonts(api, modes[index]))
    }
    return results
  }
  const family = JSON.stringify(
    mode === 'quoted-family' ? `Realm, O'Brien` : 'RealmShared',
  )
  const sheet = document.createElement('style')
  sheet.textContent = `@font-face{font-family:${family};src:url("/test/browser/fixtures/font-metrics.ttf")}`
  document.head.append(sheet)
  const root = document.createElement('div')
  root.style.cssText = 'display:flex;width:60px;height:20px;background:white'
  root.innerHTML = '<span>A</span>'
  root.firstChild.style.cssText = `display:block;flex:none;width:20px;height:20px;font:20px/20px ${family};color:blue`
  document.body.append(root)
  const requested = []
  const renderer = api.createRenderer({
    pixelRatio: 1,
    resources: {
      resolve: ({ url, kind }) => {
        if (kind === 'font') requested.push(url)
        return undefined
      },
    },
  })
  try {
    await document.fonts.load(`20px ${family}`)
    const outer = await frame(
      root,
      'font-frame-metrics.ttf',
      'red',
      true,
      family,
      mode === 'important-style',
    )
    const inner = await frame(
      outer.contentDocument.body,
      'font-metrics.ttf',
      'green',
      false,
      family,
      mode === 'important-style',
    )
    const glyph = outer.contentDocument.getElementById('glyph')
    assert(
      !(glyph instanceof HTMLElement),
      'fixture did not create a foreign realm',
    )
    // Exercise document-adopted font rules in a nested foreign realm too.
    const adopted = new inner.contentWindow.CSSStyleSheet()
    adopted.replaceSync(
      `@font-face{font-family:${family};src:url('font-metrics.ttf')}`,
    )
    inner.contentDocument.styleSheets[0].deleteRule(0)
    inner.contentDocument.adoptedStyleSheets = [adopted]
    await inner.contentDocument.fonts.load(`20px ${family}`)
    const documents = [outer.contentDocument, inner.contentDocument]
    const before = documents.map((value) => value.documentElement.innerHTML)
    const adoptedBefore = adopted.cssRules[0].cssText
    const originalStyle = sheet.textContent
    const target = mode === 'content' ? glyph : mode === 'frame' ? outer : root
    const options = {}
    if (mode === 'reused-css') {
      options.fontEmbedCSS = await renderer.getFontEmbedCSS(target)
    }
    if (mode === 'explicit-css') {
      const blob = await (
        await fetch('/test/browser/fixtures/font-metrics.ttf')
      ).blob()
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      options.fontEmbedCSS = `@font-face{font-family:${family};src:url("${data}")}`
    }
    const capture = await renderer.capture(target, Object.freeze(options))
    const svg = new DOMParser().parseFromString(
      decodeURIComponent((await capture.toSvg()).split(',')[1]),
      'image/svg+xml',
    )
    const fontCSS = Array.from(svg.querySelectorAll('style'))
      .map((value) => value.textContent)
      .join('\n')
    assert(
      fontCSS.includes('data:font/ttf;base64,'),
      `font data absent for ${mode}`,
    )
    const image = await capture.toImageData()
    const shift = mode === 'content' || mode === 'frame' ? 0 : 20
    if (shift) {
      assert(
        pixel(image, 2) === '0,0,255,255',
        `outer document font changed: ${pixel(image, 2)}`,
      )
    }
    assert(
      pixel(image, shift + 2) ===
        (mode === 'explicit-css' ? '255,0,0,255' : '255,255,255,255'),
      `iframe font lost its empty left half: ${pixel(image, shift + 2)}`,
    )
    assert(
      pixel(image, shift + 12) === '255,0,0,255',
      `iframe font lost its filled right half: ${pixel(image, shift + 12)}`,
    )
    if (mode !== 'content') {
      assert(
        pixel(image, shift + 22) === '0,128,0,255',
        `nested document font was overridden: ${pixel(image, shift + 22)}`,
      )
    }
    if (mode !== 'explicit-css') {
      assert(
        requested.some((url) => url.endsWith('/font-frame-metrics.ttf')),
        'iframe relative font URL was not requested',
      )
    }
    const count = mode === 'explicit-css' ? 0 : mode === 'content' ? 1 : 2
    assert(
      requested.length === count,
      `unexpected font requests: ${JSON.stringify(requested)}`,
    )
    assert(
      adopted.cssRules[0].cssText === adoptedBefore,
      'source adopted font stylesheet changed',
    )
    assert(sheet.textContent === originalStyle, 'outer font stylesheet changed')
    assert(
      documents.every(
        (value, index) => value.documentElement.innerHTML === before[index],
      ),
      'source iframe DOM or styles changed',
    )
    return {
      mode,
      fonts: requested.length,
      pixels: true,
      sourceUnchanged: true,
    }
  } finally {
    renderer.dispose()
    root.remove()
    sheet.remove()
  }
}
