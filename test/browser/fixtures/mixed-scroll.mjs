let sequence = 0
export const mixedScrollCases = [
  'direct',
  'wrapped',
  'padding',
  'negative-margin',
  'structural',
  'layered-structural',
  'before-block',
  'sticky',
  'fixed-inside',
  'nested',
  'rtl',
  'after',
  'inline-elements',
  'iframe',
]

export async function createMixedScrollScene(kind) {
  const root = document.createElement('div')
  root.id = `mixed-scroll-${++sequence}`
  root.style.cssText = 'width:40px;height:20px;margin:0;padding:0'
  const panel = document.createElement('div')
  panel.id = root.id + '-panel'
  panel.style.cssText =
    'width:40px;height:20px;overflow:auto;scrollbar-width:none;line-height:20px;font:10px/20px monospace;background:red;margin:0;padding:0'
  panel.innerHTML = `${kind === 'wrapped' ? 'X X X X X X X X X X X X' : 'X'}<br><span class="mixed-marker" style="display:inline-block;width:40px;height:20px;background:green"></span><div style="height:80px;background:blue"></div>`
  if (kind === 'rtl') panel.style.direction = 'rtl'
  if (kind === 'inline-elements')
    panel.firstChild.replaceWith(
      Object.assign(document.createElement('span'), { textContent: 'X' }),
    )
  const target = panel.querySelector('.mixed-marker')
  let overlay
  if (kind === 'padding') {
    panel.style.padding = '3px'
    panel.style.border = '1px solid red'
    root.style.width = '48px'
    root.style.height = '28px'
  }
  if (kind === 'negative-margin') {
    const margin = document.createElement('div')
    margin.style.cssText = 'height:20px;margin-top:-7px;background:red'
    panel.prepend(margin)
  }
  if (
    kind === 'structural' ||
    kind === 'layered-structural' ||
    kind === 'before-block' ||
    kind === 'after'
  ) {
    const style = document.createElement('style')
    const rule =
      kind === 'after'
        ? `#${panel.id}::after{content:"";display:block;height:80px;background:blue}`
        : kind === 'before-block'
          ? `#${panel.id}::before{content:"";display:block;width:40px;height:20px;margin-top:-3px;background:red}`
          : `#${panel.id}::before{content:none!important} #${panel.id}>.mixed-marker:nth-child(2){background:green!important} #${panel.id}>.mixed-marker:nth-child(3){background:red!important}`
    style.textContent =
      kind === 'layered-structural' ? `@layer source {${rule}}` : rule
    panel.append(style)
  }
  if (kind === 'sticky' || kind === 'fixed-inside') {
    overlay = document.createElement('div')
    overlay.style.cssText = `position:${kind === 'sticky' ? 'sticky' : 'fixed'};top:0;left:0;width:40px;height:4px;background:blue;z-index:10`
    if (kind === 'sticky') target.before(overlay)
    else {
      panel.style.transform = 'translate(0,0)'
      panel.prepend(overlay)
    }
  }
  root.append(panel)
  document.body.append(root)
  const align = (scroller, marker) => {
    const top =
      marker.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top -
      scroller.clientTop
    scroller.scrollTop += top
  }
  align(panel, target)
  let outer
  if (kind === 'nested') {
    outer = document.createElement('div')
    outer.style.cssText =
      'width:40px;height:20px;overflow:auto;scrollbar-width:none;font:10px/20px monospace;background:red'
    root.replaceChildren(outer)
    outer.append('X', document.createElement('br'), panel)
    const tail = document.createElement('div')
    tail.style.height = '80px'
    outer.append(tail)
    align(panel, target)
    align(outer, panel)
  }
  if (kind === 'iframe') {
    const frame = document.createElement('iframe')
    frame.style.cssText = 'display:block;width:40px;height:20px;border:0'
    root.replaceChildren(frame)
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('iframe fixture timeout')),
        5000,
      )
      frame.onload = () => {
        clearTimeout(timer)
        resolve()
      }
    })
    frame.srcdoc =
      '<body style="margin:0;padding:0;width:40px;background:red;font:10px/20px monospace">X<br><span id="target" style="display:inline-block;width:40px;height:20px;background:green"></span><div style="height:80px;background:blue"></div></body>'
    try {
      await loaded
    } catch (error) {
      root.remove()
      throw error
    }
    const target = frame.contentDocument.querySelector('#target')
    frame.contentWindow.scrollTo(0, target.getBoundingClientRect().top)
    const scrollY = frame.contentWindow.scrollY
    return {
      root,
      panel: frame.contentDocument.body,
      frame,
      points: [
        {
          x: Math.min(
            30,
            Math.floor(frame.contentDocument.documentElement.clientWidth / 2),
          ),
          y: Math.min(
            10,
            Math.floor(frame.contentDocument.documentElement.clientHeight / 2),
          ),
          expected: '0,128,0,255',
        },
      ],
      source: root.outerHTML,
      scroll: [frame.contentDocument.body.scrollTop, 0],
      frameScroll: scrollY,
      cleanup: () => root.remove(),
    }
  }
  const rootBox = root.getBoundingClientRect()
  const targetBox = target.getBoundingClientRect()
  const points = [
    {
      x: Math.round(targetBox.left - rootBox.left + 30),
      y: Math.round(targetBox.top - rootBox.top + 10),
      expected: '0,128,0,255',
    },
  ]
  if (kind === 'negative-margin')
    points.push({ x: 30, y: 2, expected: '0,128,0,255' })
  if (overlay) {
    const x = 30,
      y = 2
    const box = overlay.getBoundingClientRect()
    const visible =
      box.left <= rootBox.left + x &&
      box.right > rootBox.left + x &&
      box.top <= rootBox.top + y &&
      box.bottom > rootBox.top + y
    points.push({ x, y, expected: visible ? '0,0,255,255' : '0,128,0,255' })
  }
  return {
    root,
    panel,
    outer,
    points,
    source: root.outerHTML,
    scroll: [panel.scrollTop, outer?.scrollTop || 0],
    cleanup: () => root.remove(),
  }
}

export async function checkMixedScroll(api, kind, readNative) {
  const scene = await createMixedScrollScene(kind)
  const renderer = api.createRenderer({ pixelRatio: 1, skipFonts: true })
  try {
    if (readNative) {
      const native = await readNative(scene.root.id)
      scene.points.forEach(({ x, y, expected }) => {
        const offset = 4 * (y * native.width + x)
        const actual = Array.from(native.data.slice(offset, offset + 4)).join(
          ',',
        )
        if (actual !== expected)
          throw new Error(
            `${kind} native control ${x},${y}: ${actual}, expected ${expected}`,
          )
      })
    }
    const capture = await renderer.capture(scene.root)
    const image = await capture.toImageData()
    scene.points.forEach(({ x, y, expected }) => {
      const offset = 4 * (y * image.width + x)
      const actual = Array.from(image.data.slice(offset, offset + 4)).join(',')
      if (actual !== expected)
        throw new Error(
          `${kind} captured ${x},${y}: ${actual}, expected ${expected}`,
        )
    })
    if (
      scene.root.outerHTML !== scene.source ||
      scene.panel.scrollTop !== scene.scroll[0] ||
      (scene.outer?.scrollTop || 0) !== scene.scroll[1] ||
      (scene.frame && scene.frame.contentWindow.scrollY !== scene.frameScroll)
    )
      throw new Error('Source scroll or DOM changed')
    capture.dispose()
    return true
  } finally {
    renderer.dispose()
    scene.cleanup()
  }
}
