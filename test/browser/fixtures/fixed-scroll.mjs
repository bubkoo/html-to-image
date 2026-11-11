let sequence = 0

export const fixedScrollCases = [
  'transform-block',
  'transform-sticky-first',
  'transform-sticky-last',
  'transform-horizontal',
  'transform-diagonal',
  'filter-block',
  'perspective-block',
  'contain-block',
  'will-change-block',
  'translate-block',
  'transform-mixed',
  'filter-mixed',
  'viewport-block',
  'viewport-mixed',
  'transform-nested',
  'viewport-nested',
  'transform-visible',
  'transform-bottom',
  'transform-auto',
  'transform-right-horizontal',
  'transform-rtl-horizontal',
  'transform-chain',
  'transform-transformed-chain',
  'transform-inner',
  'ancestor-block',
  'relative-block',
  'transform-important',
]

export async function createFixedScrollScene(kind) {
  const root = document.createElement('div')
  root.id = `fixed-scroll-${++sequence}`
  root.style.cssText =
    'position:absolute;left:0;top:0;width:40px;height:40px;overflow:hidden;margin:0;padding:0'
  const panel = document.createElement('div')
  panel.style.cssText =
    'width:40px;height:40px;overflow:auto;scrollbar-width:none;margin:0;padding:0;font:10px/20px monospace'
  const mode = kind.split('-')[0]
  const properties = {
    transform: 'transform:translate(0,0)',
    filter: 'filter:opacity(1)',
    perspective: 'perspective:100px',
    contain: 'contain:paint',
    will: 'will-change:transform',
    translate: 'translate:0px',
    relative: 'position:relative',
  }
  panel.style.cssText += ';' + (properties[mode] || '')
  const fixed = document.createElement('div')
  fixed.style.cssText =
    'position:fixed;left:0;top:0;width:40px;height:4px;background:blue;z-index:10'
  fixed.id = root.id + '-fixed'
  const red = document.createElement('div')
  red.style.cssText = 'width:40px;height:40px;background:red;flex:none'
  const green = document.createElement('div')
  green.style.cssText = 'width:40px;height:80px;background:green;flex:none'
  const mixed = kind.endsWith('mixed')
  if (mixed) panel.append('X', document.createElement('br'))
  const nested = kind.endsWith('nested')
  if (nested) {
    if (mode === 'viewport') red.style.height = '60px'
    else fixed.style.top = '44px'
    green.append(fixed)
    panel.append(red, green)
  } else panel.append(fixed, red, green)
  if (kind.endsWith('inner')) {
    green.style.transform = 'translate(0,0)'
    fixed.style.top = '4px'
    green.append(fixed)
  }
  if (kind.endsWith('chain')) {
    fixed.style.top = '44px'
    const inner = document.createElement('div')
    inner.style.cssText =
      'position:fixed;top:52px;left:0;width:40px;height:4px;background:blue'
    if (kind.includes('transformed')) {
      fixed.style.transform = 'translate(2px,1px)'
      inner.style.top = '8px'
    }
    fixed.append(inner)
  }
  if (kind.endsWith('important')) {
    const style = document.createElement('style')
    style.textContent = `#${fixed.id}{top:44px!important}`
    panel.append(style)
  }
  if (kind.endsWith('bottom')) {
    fixed.style.top = 'auto'
    fixed.style.bottom = '0'
  }
  if (kind.endsWith('auto')) {
    fixed.style.top = 'auto'
    fixed.style.left = 'auto'
  }
  if (mode === 'ancestor') root.style.transform = 'translate(0,0)'
  const sticky = kind.includes('sticky')
  if (sticky) {
    const header = document.createElement('div')
    header.style.cssText =
      'position:sticky;top:8px;width:40px;height:10px;background:red'
    panel.insertBefore(header, green)
    if (kind.endsWith('last')) panel.append(fixed)
  }
  const horizontal = kind.endsWith('horizontal')
  const diagonal = kind.endsWith('diagonal')
  if (horizontal) {
    panel.style.display = 'flex'
    green.style.height = '40px'
    fixed.style.width = '4px'
    fixed.style.height = '40px'
    if (kind.includes('right')) {
      fixed.style.left = 'auto'
      fixed.style.right = '0'
    }
    if (kind.includes('rtl')) panel.style.direction = 'rtl'
  }
  if (diagonal) {
    red.style.width = '80px'
    green.style.width = '80px'
  }
  if (kind.endsWith('visible')) {
    fixed.style.top = '44px'
    fixed.style.transform = 'translate(2px,1px)'
  }
  root.append(panel)
  document.body.append(root)
  panel.scrollTop = horizontal ? 0 : sticky ? 50 : mixed ? 60 : 40
  panel.scrollLeft = kind.includes('rtl')
    ? -40
    : horizontal || diagonal
      ? 40
      : 0
  const points = [{ x: 20, y: 25, expected: '0,128,0,255' }]
  points.push({
    x: horizontal ? 2 : 20,
    y: horizontal ? 20 : 2,
    expected: ['viewport', 'ancestor', 'relative'].includes(mode)
      ? '0,0,255,255'
      : '0,128,0,255',
  })
  if (sticky) points.push({ x: 20, y: 13, expected: '255,0,0,255' })
  if (nested && mode !== 'viewport')
    points.push({ x: 20, y: 6, expected: '0,0,255,255' })
  if (kind.endsWith('visible'))
    points.push({ x: 20, y: 7, expected: '0,0,255,255' })
  if (kind.endsWith('important') || kind.endsWith('inner'))
    points.push({ x: 20, y: 6, expected: '0,0,255,255' })
  if (kind.endsWith('chain')) {
    points.push({ x: 20, y: 6, expected: '0,0,255,255' })
    points.push({ x: 20, y: 14, expected: '0,0,255,255' })
  }
  return {
    root,
    panel,
    points,
    source: root.outerHTML,
    scroll: [panel.scrollLeft, panel.scrollTop],
    cleanup: () => root.remove(),
  }
}

export async function checkFixedScroll(api, kind, readNative) {
  const scene = await createFixedScrollScene(kind)
  const renderer = api.createRenderer({ pixelRatio: 1, skipFonts: true })
  const check = (image, label) => {
    scene.points.forEach(({ x, y, expected }) => {
      const offset = 4 * (y * image.width + x)
      const actual = Array.from(image.data.slice(offset, offset + 4)).join(',')
      if (actual !== expected)
        throw new Error(
          `${kind} ${label} ${x},${y}: ${actual}, expected ${expected}`,
        )
    })
  }
  try {
    if (readNative) check(await readNative(scene.root.id), 'native control')
    const capture = await renderer.capture(scene.root)
    check(await capture.toImageData(), 'capture')
    if (
      scene.root.outerHTML !== scene.source ||
      scene.panel.scrollLeft !== scene.scroll[0] ||
      scene.panel.scrollTop !== scene.scroll[1]
    )
      throw new Error('Source DOM or scroll changed')
    capture.dispose()
    return true
  } finally {
    renderer.dispose()
    scene.cleanup()
  }
}
