let sequence = 0

export const rootLayoutCases = [
  ['zero-margin', 'margin:0'],
  ['margin-top16', 'margin:16px 0 0'],
  ['margin-left16', 'margin:0 0 0 16px'],
  ['margin-top-left16', 'margin:16px 0 0 16px'],
  ['margin-auto-horizontal', 'margin:0 auto'],
  ['margin-auto-flex', 'margin:auto', 'display:flex'],
  ['margin-left-percentage', 'margin:0 0 0 10%'],
  ['margin-top-percentage', 'margin:10% 0 0'],
  ['collapse-through-parent', 'margin:16px 0 0', 'display:block'],
  [
    'collapsed-child-zero-root-margin',
    'display:block;margin:0',
    'display:block',
    true,
  ],
  [
    'collapsed-child-root-margin16',
    'display:block;margin:16px 0 0',
    'display:block',
    true,
  ],
  ['contained-child-margin-control', 'display:flow-root;margin:0', '', true],
  ['negative-margin-control', 'margin:-8px 0 0 -8px'],
  ['columns', 'display:block;column-count:2', '', true],
  [
    'content-visibility-hidden',
    'display:block;content-visibility:hidden',
    '',
    true,
  ],
  [
    'content-visibility-auto',
    'display:block;content-visibility:auto',
    '',
    true,
  ],
  ['flex-through-contents', 'display:block', 'display:flex', true],
  ['grid-item', 'display:block', 'display:grid', true],
  ['contained-relative-child', 'display:flow-root', '', true],
  ['empty-prefix', 'display:block', 'display:block', true],
  ['fieldset-content', 'display:block;min-inline-size:0', '', true],
  ['important-root', 'margin:16px'],
  ['important-child', 'display:block', '', true],
  ['nested-fieldset', 'display:block', '', true],
  ['zero-height-image', 'display:block;width:40px;height:40px'],
  ['nonzero-bottom', 'display:block', '', true],
  ['selected-logical-bottom', 'display:block', '', true],
  ['selected-priority-bottom', 'display:block', '', true],
  ['policy-logical-bottom', 'display:block', '', true],
]

function createScene(entry) {
  const stage = document.createElement('div')
  stage.style.cssText =
    'position:fixed;left:32px;top:32px;width:300px;height:240px;display:flow-root;background:white;z-index:2147483647'
  const parent = document.createElement('div')
  parent.style.cssText =
    'display:flow-root;width:240px;height:160px;margin:0;padding:0;' +
    (entry[2] || '')
  const root = document.createElement(
    entry[0] === 'fieldset-content' ? 'fieldset' : 'div',
  )
  root.id = 'root-layout-' + ++sequence
  root.style.cssText =
    'display:flex;width:160px;height:80px;margin:0;padding:0;border:0;background:red;' +
    entry[1]
  root.innerHTML = entry[3]
    ? '<div style="width:160px;height:40px;margin-top:24px;background:blue"></div><div style="width:160px;height:40px;background:red"></div>'
    : '<div style="flex:none;width:80px;height:80px;background:red"></div><div style="flex:none;width:80px;height:80px;background:blue"></div>'
  if (entry[0] === 'flex-through-contents') {
    const contents = document.createElement('div')
    contents.style.display = 'contents'
    contents.append(root)
    parent.append(contents)
  } else parent.append(root)
  if (entry[0] === 'contained-relative-child') {
    root.firstElementChild.style.position = 'relative'
    root.firstElementChild.style.top = '-24px'
  }
  if (entry[0] === 'empty-prefix') {
    const empty = document.createElement('div')
    empty.style.cssText = 'height:0;min-height:0;margin:0 0 12px'
    root.prepend(empty)
  }
  if (entry[0] === 'important-root' || entry[0] === 'important-child') {
    const style = document.createElement('style')
    style.textContent =
      entry[0] === 'important-root'
        ? `#${root.id}{margin:16px!important}`
        : `#${root.id}>div:first-of-type{margin-top:24px!important}`
    root.prepend(style)
  }
  if (entry[0] === 'nested-fieldset') {
    const fieldset = document.createElement('fieldset')
    fieldset.style.cssText =
      'display:block;margin:0;border:0;padding:0;min-inline-size:0'
    fieldset.append(...root.childNodes)
    root.append(fieldset)
  }
  if (entry[0] === 'zero-height-image') {
    const image = document.createElement('img')
    image.src =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
      )
    image.style.cssText =
      'display:block;width:40px;height:0;min-height:0;overflow:visible;margin:0 0 24px;padding:0;border:0'
    const blue = document.createElement('div')
    blue.style.cssText = 'height:16px;background:blue'
    root.replaceChildren(image, blue)
  }
  if (entry[0].endsWith('-bottom')) {
    if (entry[0] === 'nonzero-bottom')
      root.firstElementChild.style.marginBottom = '12px'
    else
      root.firstElementChild.style.setProperty(
        'margin-block-end',
        '12px',
        entry[0] === 'selected-priority-bottom' ? 'important' : '',
      )
    root.lastElementChild.style.background = 'lime'
  }
  stage.append(parent)
  document.body.append(stage)
  return { stage, root }
}

function differences(a, b) {
  if (a.width !== b.width || a.height !== b.height)
    throw new Error(
      `Root-layout dimensions ${a.width}x${a.height} != ${b.width}x${b.height}`,
    )
  let count = 0
  for (let i = 0; i < a.data.length; i += 1)
    if (a.data[i] !== b.data[i]) count += 1
  return count
}

export async function checkRootLayout(api, name, readNative) {
  const entry = rootLayoutCases.find((item) => item[0] === name)
  if (!entry) throw new Error('Unknown root-layout case: ' + name)
  const { stage, root } = createScene(entry)
  const before = stage.outerHTML
  const options = { pixelRatio: 1, skipFonts: true }
  if (name === 'selected-logical-bottom')
    options.includeStyleProperties = ['margin-block-end']
  if (name === 'selected-priority-bottom') options.includeStyleProperties = []
  const calls = new Map()
  if (name === 'policy-logical-bottom')
    options.stylePropertiesForNode = (node) => {
      calls.set(node, (calls.get(node) || 0) + 1)
      return ['margin-block-end']
    }
  let preservedBottom
  let preservedPriority
  if (name.includes('bottom'))
    options.onCloneNode = (source, copy) => {
      if (source === root.firstElementChild) {
        preservedBottom = copy.style.marginBottom
        preservedPriority = copy.style.getPropertyPriority('margin-bottom')
      }
    }
  try {
    const native = await readNative(root.id)
    const actual = await api.toImageData(root, options)
    return {
      differentChannels: differences(native, actual),
      sourceUnchanged: stage.outerHTML === before,
      preservedBottom,
      preservedPriority,
      policyCalls: [...calls.values()],
    }
  } finally {
    stage.remove()
  }
}

export async function checkRootLayoutIntent(api, kind, readNative, record) {
  const childIntent = kind.startsWith('child-')
  const { stage, root } = createScene([
    'intent',
    (childIntent ? 'display:block;' : '') + 'margin:16px',
    '',
    childIntent,
  ])
  const sourceChild = root.firstElementChild
  const before = stage.outerHTML
  const options = { pixelRatio: 1, skipFonts: true }
  const transform = kind.startsWith('transform-') ? kind.slice(10) : ''
  const margin = kind.endsWith('-zero') ? '0px' : '16px'
  if (kind === 'style-margin' || kind === 'style-zero')
    options.style = { margin }
  else if (kind === 'clone-margin' || kind === 'clone-zero')
    options.onClone = ({ root: copy }) => {
      copy.style.margin = margin
    }
  else if (kind === 'node-margin' || kind === 'node-zero')
    options.onCloneNode = (source, copy) => {
      if (source === root) copy.style.margin = margin
    }
  else if (kind === 'style-logical')
    options.style = { marginBlockStart: '16px', marginInlineStart: '16px' }
  else if (kind === 'clone-logical')
    options.onClone = ({ root: copy }) => {
      copy.style.marginBlockStart = '16px'
      copy.style.marginInlineStart = '16px'
    }
  else if (kind === 'node-logical')
    options.onCloneNode = (source, copy) => {
      if (source !== root) return
      copy.style.marginBlockStart = '16px'
      copy.style.marginInlineStart = '16px'
    }
  else if (childIntent)
    options.onCloneNode = (source, copy) => {
      if (source !== sourceChild) return
      if (kind === 'child-physical') copy.style.marginTop = '16px'
      else copy.style.marginBlockStart = '16px'
    }
  else if (kind === 'clone-physical-important')
    options.onClone = ({ root: copy }) => {
      copy.style.setProperty('margin-top', '0px', 'important')
      copy.style.marginBlockStart = '16px'
      copy.style.marginInlineStart = '16px'
    }
  else if (kind === 'clone-new-style')
    options.onClone = ({ root: copy }) => {
      const style = copy.ownerDocument.createElement('style')
      style.textContent = `#${copy.id}{margin:16px!important}`
      copy.append(style)
    }
  else if (transform) options.style = { transform }
  else if (kind === 'border-dimensions') {
    root.style.border = '2px solid lime'
    root.style.boxSizing = 'border-box'
    options.width = 120
    options.height = 60
    options.style = { margin: '16px', transform: 'translateX(8px)' }
  } else throw new Error('Unknown intent: ' + kind)
  if (kind === 'child-logical-zero-root') options.style = { margin: '0' }
  // Independent normal DOM viewport: the external source margin is absent;
  // only the declared user override is applied. White is an opaque RGB oracle.
  const shell = document.createElement('div')
  shell.id = root.id + '-oracle'
  const width = options.width || root.offsetWidth
  const height = options.height || root.offsetHeight
  shell.style.cssText = `position:absolute;left:0;top:0;display:flow-root;width:${width}px;height:${height}px;overflow:hidden;background:white`
  const expected = root.cloneNode(true)
  expected.removeAttribute('id')
  expected.style.margin = transform || childIntent ? '0' : margin
  if (kind === 'clone-physical-important') expected.style.margin = '0 0 0 16px'
  if (childIntent) expected.firstElementChild.style.marginTop = '16px'
  if (options.width) expected.style.width = options.width + 'px'
  if (options.height) expected.style.height = options.height + 'px'
  if (transform) expected.style.transform = transform
  if (kind === 'border-dimensions') expected.style.transform = 'translateX(8px)'
  shell.append(expected)
  stage.append(shell)
  const sourceBeforeCapture = root.outerHTML
  const renderer = api.createRenderer()
  try {
    const native = await readNative(shell.id)
    shell.remove()
    const capture = await renderer.capture(root, options)
    const actual = await capture.toImageData()
    const canvas = document.createElement('canvas')
    canvas.width = actual.width
    canvas.height = actual.height
    const context = canvas.getContext('2d')
    context.putImageData(actual, 0, 0)
    context.globalCompositeOperation = 'destination-over'
    context.fillStyle = 'white'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const opaque = context.getImageData(0, 0, canvas.width, canvas.height)
    let alphaDifferentPixels = 0
    for (let y = 0; y < actual.height; y += 1) {
      for (let x = 0; x < actual.width; x += 1) {
        let transparent
        if (kind.endsWith('-zero') || transform === 'scale(2)')
          transparent = false
        else if (transform === 'scale(0.5)')
          transparent = x < 40 || x >= 120 || y < 20 || y >= 60
        else if (transform === 'translateX(8px)') transparent = x < 8
        else if (kind === 'border-dimensions') transparent = x < 24 || y < 16
        else if (kind === 'clone-physical-important') transparent = x < 16
        else if (childIntent) transparent = y < 16
        else transparent = x < 16 || y < 16
        if (
          actual.data[4 * (y * actual.width + x) + 3] !==
          (transparent ? 0 : 255)
        )
          alphaDifferentPixels += 1
      }
    }
    const differentChannels = differences(native, opaque)
    if (differentChannels && record) {
      const png = (image) => {
        const buffer = document.createElement('canvas')
        buffer.width = image.width
        buffer.height = image.height
        buffer.getContext('2d').putImageData(image, 0, 0)
        return buffer.toDataURL('image/png').split(',')[1]
      }
      await record({
        engine: 'root-layout',
        kind: kind + '-' + crypto.randomUUID(),
        userAgent: navigator.userAgent,
        nativeDifferentChannels: differentChannels,
        native: png(native),
        capture: png(actual),
        frozenSVG: await capture.toSvg(),
        sourceHTML: sourceBeforeCapture,
        alphaDifferentPixels,
      })
    }
    return {
      differentChannels,
      sourceUnchanged: root.outerHTML === sourceBeforeCapture,
      sourceBeforeSetup: before,
      topLeftAlpha: actual.data[3],
      alphaDifferentPixels,
    }
  } finally {
    renderer.dispose()
    stage.remove()
  }
}
