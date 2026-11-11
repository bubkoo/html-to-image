let sequence = 0

export const horizontalFixedCases = [
  'local-nested',
  'local-deep',
  'viewport-nested',
  'ancestor-nested',
  'wrapper-nested',
  'local-rtl',
  'local-reverse',
  'local-relative',
  'local-absolute',
  'local-margin',
  'local-important',
  'local-selected',
]

export async function createHorizontalFixedScene(kind) {
  const root = document.createElement('div')
  root.id = `horizontal-fixed-${++sequence}`
  root.style.cssText =
    'position:absolute;left:0;top:0;width:40px;height:40px;overflow:hidden;margin:0;padding:0'
  const panel = document.createElement('div')
  panel.style.cssText =
    'width:40px;height:40px;overflow:auto;scrollbar-width:none;display:flex;flex-wrap:nowrap;align-items:flex-start;margin:0;padding:0'
  if (kind.startsWith('local')) panel.style.transform = 'translate(0,0)'
  if (kind.startsWith('ancestor')) root.style.transform = 'translate(0,0)'
  if (kind.endsWith('rtl')) panel.style.direction = 'rtl'
  if (kind.endsWith('reverse')) panel.style.flexDirection = 'row-reverse'
  const red = document.createElement('div')
  red.style.cssText = 'width:48px;height:40px;background:red;flex:none'
  const green = document.createElement('div')
  green.style.cssText = 'width:80px;height:40px;background:green;flex:none'
  if (kind.startsWith('wrapper')) green.style.transform = 'translate(0,0)'
  if (kind.endsWith('relative')) green.style.position = 'relative'
  if (kind.endsWith('margin')) {
    red.style.marginLeft = '3px'
    green.style.marginRight = '5px'
  }
  const fixed = document.createElement('div')
  fixed.id = root.id + '-fixed'
  fixed.style.cssText =
    'position:fixed;left:0;top:0;width:4px;height:40px;background:blue;z-index:10'
  if (kind.endsWith('deep')) {
    const inner = document.createElement('div')
    inner.style.cssText = 'width:80px;height:40px'
    inner.append(fixed)
    green.append(inner)
  } else green.append(fixed)
  panel.append(red, green)
  root.append(panel)
  document.body.append(root)
  panel.scrollLeft = /rtl|reverse/.test(kind) ? -40 : 40
  // Place the source's blue stripe at x=4 regardless of the actual containing
  // block. Native screenshots independently assert this setup before capture.
  const container = fixed.offsetParent
  const left =
    4 -
    (container?.getBoundingClientRect().left || 0) +
    (container?.scrollLeft || 0)
  fixed.style.setProperty(
    'left',
    `${left}px`,
    kind.endsWith('important') ? 'important' : '',
  )
  if (kind.endsWith('absolute')) {
    const absolute = document.createElement('div')
    absolute.style.cssText =
      'position:absolute;left:52px;top:0;width:4px;height:40px;background:purple;z-index:11'
    green.append(absolute)
  }
  const points = [
    { x: 6, y: 20, expected: '0,0,255,255' },
    { x: 20, y: 20, expected: '0,128,0,255' },
  ]
  if (kind.endsWith('absolute'))
    points.push({ x: 14, y: 20, expected: '128,0,128,255' })
  return {
    root,
    panel,
    points,
    source: root.outerHTML,
    scroll: [panel.scrollLeft, panel.scrollTop],
    options: kind.endsWith('selected')
      ? {
          stylePropertiesForNode: (source) =>
            source === fixed ? [] : undefined,
        }
      : {},
    cleanup: () => root.remove(),
  }
}

export async function checkHorizontalFixed(api, kind, readNative) {
  const scene = await createHorizontalFixedScene(kind)
  const renderer = api.createRenderer({
    pixelRatio: 1,
    skipFonts: true,
    ...scene.options,
  })
  const check = (image, label) => {
    scene.points.forEach(({ x, y, expected }) => {
      const start = 4 * (y * image.width + x)
      const actual = Array.from(image.data.slice(start, start + 4)).join(',')
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
    capture.dispose()
    if (
      scene.source !== scene.root.outerHTML ||
      scene.scroll[0] !== scene.panel.scrollLeft ||
      scene.scroll[1] !== scene.panel.scrollTop
    )
      throw new Error('Source DOM or scroll changed')
    return true
  } finally {
    renderer.dispose()
    scene.cleanup()
  }
}
