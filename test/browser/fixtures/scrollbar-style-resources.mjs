export const scrollbarStyleResourceCases = [
  'cors-opaque',
  'cors-readable',
  'readable-mutation',
  'resolver-opaque',
  'deny-diagnostic',
  'resolver-reject',
  'cancel-pending',
  'cancel-decode',
  'shared-url',
  'inactive-import',
  'cyclic-import',
  'unrelated-relative',
  'media-page-viewport',
  'nesting-relative',
  'stable-no-overflow',
  'x-overflow-only',
  'y-overflow-only',
  'encoding-parent-header-1252',
  'encoding-parent-charset-1252',
  'encoding-readable-chain',
  'encoding-child-header-1252',
  'encoding-child-charset-1252',
  'encoding-child-utf8-override',
  'encoding-child-bom-override',
  'encoding-parent-utf8-negative',
  'declarations-direct-tail',
  'declarations-active-media',
  'declarations-active-supports',
  'declarations-nested-tail',
  'declarations-ordinary-tail',
  'declarations-inactive-tail',
  'warning-callback',
]

export async function checkScrollbarStyleResources(
  api,
  kind,
  readNative,
  recordMismatch,
) {
  if (!readNative)
    throw new Error('A real native source screenshot is required')
  const prefix =
    '/test/browser/scrollbar-style-resources/' + crypto.randomUUID() + '/'
  const setup = await fetch(prefix + 'setup?mode=' + kind, { method: 'POST' })
  if (!setup.ok)
    throw new Error('Scrollbar resource setup failed: ' + setup.status)
  const control = await setup.json()
  const mainPrefix = new URL(prefix, location.href).href
  const encodingCase = kind.startsWith('encoding-')
  const declarationsCase = kind.startsWith('declarations-')
  const root = document.createElement('div')
  root.id = 'scrollbar-resource-' + control.id
  root.style.cssText = `position:absolute;left:0;top:0;width:${kind === 'shared-url' ? 200 : 100}px;height:100px;overflow:hidden;background:white;display:flex`
  const base = document.createElement('style')
  if (kind !== 'unrelated-relative')
    base.textContent =
      '.scrollbar-resource-panel::-webkit-scrollbar{width:10px;height:10px;background:red}' +
      '.scrollbar-resource-panel::-webkit-scrollbar-track{background:red}' +
      '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:black;border-radius:0}' +
      '.scrollbar-resource-panel::-webkit-scrollbar-corner{background:blue}'
  document.head.append(base)
  const count = kind === 'shared-url' ? 2 : 1
  for (let index = 0; index < count; index++) {
    const panel = document.createElement('div')
    panel.className = 'scrollbar-resource-panel café'
    panel.style.cssText =
      'width:100px;height:100px;overflow:auto;background:green;flex:none'
    if (kind === 'stable-no-overflow') panel.style.scrollbarGutter = 'stable'
    panel.innerHTML = ['unrelated-relative', 'stable-no-overflow'].includes(
      kind,
    )
      ? '<div style="width:40px;height:40px;background:green"></div>'
      : kind === 'x-overflow-only'
        ? '<div style="width:240px;height:40px;background:green"></div>'
        : kind === 'y-overflow-only'
          ? '<div style="width:40px;height:300px;background:green"></div>'
          : '<div style="width:240px;height:300px;background:green"></div>'
    root.append(panel)
  }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = control.url
  if (
    [
      'cors-readable',
      'readable-mutation',
      'unrelated-relative',
      'nesting-relative',
      'stable-no-overflow',
      'x-overflow-only',
      'y-overflow-only',
      'declarations-direct-tail',
      'declarations-active-media',
      'declarations-active-supports',
      'declarations-nested-tail',
      'declarations-ordinary-tail',
      'declarations-inactive-tail',
    ].includes(kind)
  )
    link.crossOrigin = 'anonymous'
  const linked = new Promise((resolve, reject) => {
    link.onload = () => resolve('load')
    link.onerror = () =>
      kind === 'warning-callback'
        ? resolve('expected-missing-import-error')
        : reject(new Error('Native scrollbar stylesheet did not load'))
  })
  document.head.append(link)
  const events = []
  const warnings = []
  const hooks = []
  const stages = []
  const sourceError = new Error(
    'intentional scrollbar stylesheet resolver rejection',
  )
  const abortError = new Error('intentional scrollbar stylesheet cancellation')
  const warningError = new Error(
    'intentional child stylesheet warning callback failure',
  )
  const abort = new AbortController()
  let entered
  let releasePending
  let releaseDecode
  let gatedBlob
  let decodeReads = 0
  let decodeGateSettled = false
  const decodeGate = new Promise((resolve) => {
    releaseDecode = resolve
  }).then((bytes) => {
    decodeGateSettled = true
    return bytes
  })
  const pendingEntered = new Promise((resolve) => {
    entered = resolve
  })
  let renderer
  let capture
  try {
    const nativeLinkStatus = await linked
    if (encodingCase && document.characterSet.toLowerCase() !== 'utf-8')
      throw new Error('Encoding source control requires a UTF-8 document')
    if (kind === 'readable-mutation')
      link.sheet.insertRule(
        '.scrollbar-resource-panel::-webkit-scrollbar-thumb:vertical{background:lime!important}',
        link.sheet.cssRules.length,
      )
    if (
      (kind === 'media-page-viewport' || declarationsCase) &&
      innerWidth <= 300
    )
      throw new Error('Media source control needs a viewport wider than 300px')
    if (['nesting-relative', 'declarations-direct-tail'].includes(kind)) {
      const readyImage = new Image()
      readyImage.src = control.remotePrefix + 'assets/thumb.svg'
      await readyImage.decode()
    }
    // First paint uses the final loaded stylesheet state; do not screenshot a
    // previously painted black base thumb after its CSS has changed.
    document.body.append(root)
    let readable = true
    try {
      void link.sheet.cssRules.length
    } catch {
      readable = false
    }
    const source = root.outerHTML
    const sourceLink = link.outerHTML
    const sourceRules = readable
      ? Array.from(link.sheet.cssRules, (rule) => rule.cssText).join('\n')
      : undefined
    const nativeSheets = []
    const inspectSheet = (sheet) => {
      const result = { href: sheet.href, readable: true }
      nativeSheets.push(result)
      try {
        const rules = sheet.cssRules
        for (let index = 0; index < rules.length; index++) {
          const rule = rules[index]
          if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet)
            inspectSheet(rule.styleSheet)
        }
      } catch {
        result.readable = false
      }
    }
    if (encodingCase || kind === 'warning-callback') {
      inspectSheet(link.sheet)
      const expectedReadable = kind === 'encoding-readable-chain' ? 2 : 1
      if (
        encodingCase &&
        (nativeSheets.filter((sheet) => sheet.readable).length !==
          expectedReadable ||
          nativeSheets.filter((sheet) => !sheet.readable).length !== 1)
      )
        throw new Error(
          'Encoding control did not expose the required live/opaque import chain: ' +
            JSON.stringify(nativeSheets),
        )
    }
    const native = await readNative(root.id)
    const colors = { black: 0, blue: 0, yellow: 0, lime: 0, cyan: 0, red: 0 }
    const keys = {
      '0,0,0,255': 'black',
      '0,0,255,255': 'blue',
      '255,255,0,255': 'yellow',
      '0,255,0,255': 'lime',
      '0,255,255,255': 'cyan',
      '255,0,0,255': 'red',
    }
    for (let index = 0; index < native.data.length; index += 4) {
      const key = keys[Array.from(native.data.slice(index, index + 4)).join()]
      if (key) colors[key]++
    }
    const metrics = Array.from(root.children, (panel) => ({
      clientWidth: panel.clientWidth,
      clientHeight: panel.clientHeight,
      offsetWidth: panel.offsetWidth,
      offsetHeight: panel.offsetHeight,
      scrollWidth: panel.scrollWidth,
      scrollHeight: panel.scrollHeight,
      xOverflow: panel.scrollWidth > panel.clientWidth,
      yOverflow: panel.scrollHeight > panel.clientHeight,
    }))
    const hasNativeReserve = metrics.some(
      (item) =>
        item.clientWidth < item.offsetWidth ||
        item.clientHeight < item.offsetHeight,
    )
    if (
      kind === 'stable-no-overflow' &&
      (!metrics.every((item) => !item.xOverflow && !item.yOverflow) ||
        Object.values(colors).some((value) => value > 0))
    )
      throw new Error(
        'Native empty-gutter control has overflow or a visible scrollbar: ' +
          JSON.stringify({ metrics, colors }),
      )
    if (
      kind === 'x-overflow-only' &&
      !metrics.every((item) => item.xOverflow && !item.yOverflow)
    )
      throw new Error(
        'Native X-only overflow control is invalid: ' + JSON.stringify(metrics),
      )
    if (
      kind === 'y-overflow-only' &&
      !metrics.every((item) => !item.xOverflow && item.yOverflow)
    )
      throw new Error(
        'Native Y-only overflow control is invalid: ' + JSON.stringify(metrics),
      )
    if (!['unrelated-relative', 'stable-no-overflow'].includes(kind)) {
      const greenThumb = ['readable-mutation', 'media-page-viewport'].includes(
        kind,
      )
      if (kind === 'warning-callback') {
        if (
          !readable ||
          colors.black ||
          colors.yellow ||
          colors.blue <= 100 ||
          !colors.cyan
        )
          throw new Error(
            'Native missing-child parent is not readable with blue/cyan thumbs: ' +
              JSON.stringify({ readable, colors, nativeSheets }),
          )
        const requests = await (await fetch(prefix + 'stats')).json()
        if (
          !requests.some(
            (request) =>
              request.path === 'assets/missing.css' && !request.marker,
          )
        )
          throw new Error(
            'Native missing-child control did not request its intentional 404 import',
          )
      } else if (encodingCase || declarationsCase) {
        const expectsYellow = kind !== 'encoding-parent-utf8-negative'
        if (
          expectsYellow
            ? !colors.yellow || colors.black
            : !colors.black || colors.yellow
        )
          throw new Error(
            'Native encoding/declaration control has the wrong thumb colour: ' +
              JSON.stringify({ kind, colors, nativeSheets }),
          )
        if (
          kind === 'declarations-ordinary-tail' &&
          getComputedStyle(root.firstElementChild).color !== 'rgb(255, 255, 0)'
        )
          throw new Error(
            'Ordinary parent trailing declaration did not apply natively',
          )
      } else if (kind === 'nesting-relative') {
        if (!colors.black || !colors.yellow)
          throw new Error(
            'Native nesting/image control is not black/yellow: ' +
              JSON.stringify(colors),
          )
      } else {
        const hasY = metrics.some((item) => item.yOverflow)
        const hasX = metrics.some((item) => item.xOverflow)
        const corners =
          metrics.filter((item) => item.xOverflow && item.yOverflow).length *
          100
        if (
          colors.black ||
          (hasY && (greenThumb ? !colors.lime : colors.blue <= corners))
        )
          throw new Error(
            'Native vertical thumb is not in its loaded stylesheet state: ' +
              JSON.stringify(colors),
          )
        const horizontal =
          kind === 'inactive-import' ? colors.cyan : colors.yellow
        if (hasX && !horizontal)
          throw new Error(
            'Native supported conditional thumb control is not ready: ' +
              JSON.stringify(colors),
          )
      }
    }
    const resolve = async (request) => {
      if (
        !request.url.startsWith(control.remotePrefix) &&
        !request.url.startsWith(mainPrefix)
      )
        return undefined
      events.push({
        url: request.url,
        kind: request.kind,
        contentType: request.contentType,
      })
      if (request.kind === 'stylesheet' && kind === 'resolver-reject')
        throw sourceError
      if (request.kind === 'stylesheet' && kind === 'cancel-pending') {
        entered()
        return new Promise((resolve) => {
          releasePending = resolve
        })
      }
      if (request.kind === 'stylesheet' && kind === 'cancel-decode') {
        class GatedBlob extends Blob {
          arrayBuffer() {
            decodeReads++
            entered()
            return decodeGate
          }
        }
        gatedBlob = new GatedBlob(
          [
            '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:yellow}',
          ],
          { type: 'text/css; charset=utf-8' },
        )
        if (!(gatedBlob instanceof Blob))
          throw new Error(
            'Decode cancellation control did not return a real Blob',
          )
        return gatedBlob
      }
      if (kind !== 'resolver-opaque') return undefined
      const response = await fetch(prefix + 'read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: request.url }),
      })
      if (!response.ok)
        throw new Error(
          'Controlled stylesheet resolver failed: ' + response.status,
        )
      return response.blob()
    }
    renderer = api.createRenderer({
      pixelRatio: 1,
      skipFonts: true,
      signal: abort.signal,
      fetchRequestInit: {
        headers: { 'X-HTML-To-Image-Test': 'scrollbar-capture' },
      },
      resources: { resolve },
      onCloneNode(original) {
        if (original === root) hooks.push('node-root')
      },
      onClone() {
        hooks.push('onClone')
      },
      plugins: [
        {
          name: 'scrollbar-resource-order',
          transformClone() {
            hooks.push('plugin')
          },
        },
      ],
      onEvent(event) {
        if (event.type === 'stage') stages.push(event.stage)
        if (event.type === 'warning') {
          warnings.push(event.diagnostic)
          if (
            kind === 'warning-callback' &&
            event.diagnostic.resource ===
              control.remotePrefix + 'assets/missing.css'
          )
            throw warningError
        }
      },
    })
    const pending = renderer.capture(root)
    if (kind === 'cancel-pending' || kind === 'cancel-decode') {
      const reachedResolver = await Promise.race([
        pendingEntered.then(() => true),
        pending.then(
          () => false,
          () => false,
        ),
      ])
      if (!reachedResolver) {
        capture = await pending
        throw new Error(
          'Capture completed without awaiting its stylesheet resolver',
        )
      }
      abort.abort(abortError)
      let rejected
      try {
        capture = await pending
      } catch (error) {
        rejected = error
      }
      if (rejected !== abortError)
        throw new Error('Cancellation did not preserve its exact reason')
      if (kind === 'cancel-decode' && (decodeReads !== 1 || decodeGateSettled))
        throw new Error(
          'Capture cancellation did not occur during its pending Blob byte read',
        )
      const calls = events.length
      const stagesBeforeRelease = stages.join(',')
      if (kind === 'cancel-decode')
        releaseDecode(await Blob.prototype.arrayBuffer.call(gatedBlob))
      else releasePending(new Blob([''], { type: 'text/css' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (hooks.length || calls !== events.length)
        throw new Error('Cancelled CSS work resumed after its resolver settled')
      if (stages.join(',') !== stagesBeforeRelease)
        throw new Error('Cancelled CSS work advanced to a later capture stage')
    } else if (kind === 'warning-callback') {
      let rejected
      try {
        capture = await pending
      } catch (error) {
        rejected = error
      }
      if (rejected !== warningError)
        throw new Error(
          'Child stylesheet warning callback error was swallowed or replaced',
        )
      if (hooks.length)
        throw new Error(
          'Clone hooks ran after stylesheet warning callback failure',
        )
    } else if (kind === 'resolver-reject') {
      let rejected
      try {
        capture = await pending
      } catch (error) {
        rejected = error
      }
      if (
        rejected?.name !== 'ResourceResolverError' ||
        rejected.cause !== sourceError
      )
        throw new Error(
          'Custom stylesheet resolver rejection was swallowed or replaced',
        )
      if (hooks.length)
        throw new Error('Clone hooks ran after stylesheet resolver rejection')
    } else {
      capture = await pending
      const pixels = await capture.toImageData()
      if (pixels.width !== native.width || pixels.height !== native.height)
        throw new Error('Native resource viewport dimensions changed')
      let differences = 0
      for (let index = 0; index < pixels.data.length; index++)
        differences += pixels.data[index] !== native.data[index]
      if (kind === 'deny-diagnostic') {
        const failure = warnings.find(
          (item) => item.resource === control.url && item.message,
        )
        if (!failure)
          throw new Error(
            'Unreadable stylesheet did not retain its exact URL and failure reason',
          )
        if (!differences)
          throw new Error(
            'Denied conditional CSS negative control unexpectedly matched the native source',
          )
      } else {
        if (differences && recordMismatch) {
          const png = (data) => {
            const canvas = document.createElement('canvas')
            canvas.width = data.width
            canvas.height = data.height
            canvas.getContext('2d').putImageData(data, 0, 0)
            return canvas.toDataURL().split(',')[1]
          }
          const frozen = await capture.toSvg()
          await recordMismatch({
            kind: 'style-resource-' + kind,
            engine: /Firefox/.test(navigator.userAgent)
              ? 'firefox'
              : /Chrome/.test(navigator.userAgent)
                ? 'chromium'
                : 'webkit',
            userAgent: navigator.userAgent,
            dpr: devicePixelRatio,
            nativeDifferentChannels: differences,
            source,
            sourceLink,
            sourceRules,
            nativeSheets,
            nativeLinkStatus,
            readable,
            nativeColors: colors,
            metrics,
            hasNativeReserve,
            events,
            warnings,
            hooks,
            stats: await (await fetch(prefix + 'stats')).json(),
            frozenSvg: decodeURIComponent(frozen.split(',').slice(1).join(',')),
            native: png(native),
            capture: png(pixels),
          })
        }
        if (differences)
          throw new Error(
            `${kind}: native/export differ in ${differences} channels`,
          )
        if (
          warnings.some(
            (item) =>
              item.resource.startsWith(control.remotePrefix) ||
              item.resource.startsWith(mainPrefix),
          )
        )
          throw new Error(
            'Readable stylesheet produced an unexpected resource warning',
          )
      }
      if (hooks.join(',') !== 'node-root,onClone,plugin')
        throw new Error('Stylesheet loading changed clone hook/plugin order')
      if (kind === 'unrelated-relative') {
        if (events.length)
          throw new Error(
            'Unrelated readable CSS triggered a resource resolver',
          )
      } else {
        const styles = events.filter((item) => item.kind === 'stylesheet')
        if (new Set(styles.map((item) => item.url)).size !== styles.length)
          throw new Error(
            'The same stylesheet was resolved more than once in one capture',
          )
        if (styles.some((item) => item.url.endsWith('/never.css')))
          throw new Error('An unsupported conditional import was loaded')
        if (
          kind === 'inactive-import' &&
          styles.some((item) => item.url.endsWith('/child.css'))
        )
          throw new Error('An inactive media import was loaded')
        if (kind === 'shared-url' && styles.length !== 2)
          throw new Error(
            `Two scrollers should share one root and child fetch, got ${styles.length}`,
          )
        if (
          kind === 'resolver-opaque' &&
          !styles.some((item) => item.url.endsWith('/assets/child.css'))
        )
          throw new Error(
            'Blob CSS did not retain the resolver-supplied absolute import base',
          )
        if (encodingCase) {
          const expected = [
            control.url,
            control.remotePrefix + 'assets/encoded-child.css',
          ]
          if (kind === 'encoding-readable-chain')
            expected.push(mainPrefix + 'readable-child.css')
          if (
            styles.length !== expected.length ||
            expected.some((url) => !styles.some((item) => item.url === url))
          )
            throw new Error(
              'Encoding metadata did not follow the entire active import chain: ' +
                JSON.stringify(styles),
            )
        }
      }
    }
    const rulesAfter = readable
      ? Array.from(link.sheet.cssRules, (rule) => rule.cssText).join('\n')
      : undefined
    if (
      root.outerHTML !== source ||
      link.outerHTML !== sourceLink ||
      rulesAfter !== sourceRules
    )
      throw new Error(
        'Capturing changed source nodes or native stylesheet rules',
      )
    const stats = await (await fetch(prefix + 'stats')).json()
    return {
      kind,
      readable,
      events,
      warnings,
      hooks,
      metrics,
      hasNativeReserve,
      nativeSheets,
      nativeLinkStatus,
      stages,
      sourceUnchanged: true,
      stats,
    }
  } finally {
    releaseDecode(new ArrayBuffer(0))
    capture?.dispose()
    renderer?.dispose()
    link.remove()
    base.remove()
    root.remove()
    await fetch(prefix + 'cleanup', { method: 'POST' })
  }
}
