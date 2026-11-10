export async function checkPseudoResources(
  { createRenderer },
  { skipFonts = true } = {},
) {
  const session = await createResourceFixture()
  const endpoint = session.base
  const imageURL = new URL(`${endpoint}public-image`, location.href).href
  const root = document.createElement('div')
  root.style.cssText = 'display:flex;width:60px;height:20px;background:red'
  root.innerHTML =
    '<div class="pseudo-before"></div><div class="pseudo-after"></div>' +
    '<div class="pseudo-added"></div>'
  const style = document.createElement('style')
  style.textContent = `
    .pseudo-before,.pseudo-after,.pseudo-added {width:20px;height:20px}
    .pseudo-before::before,.pseudo-after::after {content:"";display:block;width:20px;height:20px;background-image:url("${imageURL}")}
  `
  document.head.append(style)
  document.body.append(root)
  const renderer = createRenderer({
    pixelRatio: 1,
    skipFonts,
    fetchRequestInit: {
      headers: { 'X-HTML-To-Image-Test': 'pseudo-resource' },
    },
    onClone({ root: copy }) {
      const rule = copy.ownerDocument.createElement('style')
      rule.textContent = `
        @font-face {font-family:UnusedProbe;src:url("${endpoint}font")}
        @media all {
          .pseudo-added::before {content:"url(not-an-image)";color:transparent;font-size:0;display:block;width:20px;height:20px;background:green;mask-image:url("${endpoint}public-image");-webkit-mask-image:url("${endpoint}public-image")}
        }
      `
      copy.append(rule)
      const unused = copy.ownerDocument.createElement('style')
      unused.textContent = `@import url("${endpoint}public-image?import=1"); .not-present {background-image:url("${imageURL}")}`
      copy.append(unused)
      const data = copy.ownerDocument.createElement('style')
      data.type = 'text/plain'
      data.textContent = `.not-css {background-image:url("${endpoint}font")}`
      copy.append(data)
    },
  })
  try {
    const source = root.outerHTML
    const css = style.textContent
    const preloaded = new Image()
    preloaded.src = imageURL
    await preloaded.decode()
    const before = await fetch(`${endpoint}stats`).then((res) => res.json())
    const capture = await renderer.capture(root)
    const svg = decodeURIComponent(await capture.toSvg())
    const image = await capture.toImageData()
    const pixel = (x) => {
      const offset = 4 * (10 * image.width + x)
      return Array.from(image.data.slice(offset, offset + 4)).join(',')
    }
    if (pixel(10) !== '0,128,0,255' || pixel(30) !== '0,128,0,255')
      throw new Error(`Pseudo backgrounds ${pixel(10)} / ${pixel(30)}`)
    if (pixel(50) !== '0,128,0,255')
      throw new Error(`Injected mask ${pixel(50)}`)
    const requests = await fetch(`${endpoint}stats`).then((res) => res.json())
    const added = requests.slice(before.length)
    const library = added.filter(
      (request) => request.marker === 'pseudo-resource',
    )
    if (library.length !== 1 || library[0].action !== 'public-image')
      throw new Error(`Rule resource requests ${JSON.stringify(added)}`)
    if (added.some((request) => !request.marker))
      throw new Error('Inert stylesheet parsing triggered a native request')
    if (!svg.includes('data:image/svg+xml;base64,'))
      throw new Error('Image bytes were not embedded in stylesheet rules')
    if (!svg.includes('@import') || (skipFonts && !svg.includes('UnusedProbe')))
      throw new Error('Unrelated import/font rules were dropped')
    if (!svg.includes('url(not-an-image)'))
      throw new Error('Literal generated text was rewritten')
    if (root.outerHTML !== source || style.textContent !== css)
      throw new Error('Source DOM or stylesheet changed')
    return {
      backgrounds: true,
      injectedMask: true,
      libraryRequests: 1,
      sourceUnchanged: true,
    }
  } finally {
    renderer.dispose()
    root.remove()
    style.remove()
    await session.cleanup()
  }
}
import { createResourceFixture } from './resource-policy.mjs'
