// Diagnostic observers only: their results never replace the primary GC gate.
function nativeEnvironment(source, detectPolicy, timed = true) {
  let frame, pending, timer
  const fonts = []
  const sharingErrors = []
  source.fonts.forEach((font) => {
    if (font.status === 'loaded') fonts.push(font)
  })
  return {
    getDocument() {
      pending ||= new Promise((resolve, reject) => {
        frame = document.createElement('iframe')
        const owned = frame
        if (timed)
          timer = setTimeout(
            () => reject(new Error('Native frame not ready')),
            5000,
          )
        owned.onload = () => {
          clearTimeout(timer)
          owned.onload = null
          const target = owned.contentDocument
          fonts.forEach((font) => {
            try {
              target.fonts.add(font)
            } catch (error) {
              sharingErrors.push(error.name)
            }
          })
          resolve(target)
        }
        owned.srcdoc = '<!doctype html><body></body>'
        document.body.append(owned)
      })
      return pending
    },
    async measurePolicy(check) {
      return detectPolicy(await this.getDocument(), check)
    },
    dispose() {
      clearTimeout(timer)
      if (frame) frame.onload = null
      frame?.remove()
      frame = undefined
      pending = undefined
      fonts.length = 0
    },
    sharingErrors,
  }
}

async function awaitDocument(create, probed) {
  const environment = create()
  try {
    if (probed) await environment.measurePolicy(() => {})
    return {
      environment,
      reference: new WeakRef(await environment.getDocument()),
      canary: new WeakRef({}),
    }
  } finally {
    environment.dispose()
  }
}

async function weakPromise(create, probed) {
  const environment = create()
  try {
    if (probed) await environment.measurePolicy(() => {})
    const reference = await environment
      .getDocument()
      .then((target) => new WeakRef(target))
    return { environment, reference, canary: new WeakRef({}) }
  } finally {
    environment.dispose()
  }
}

async function clearedLocal(create, probed) {
  const environment = create()
  try {
    if (probed) await environment.measurePolicy(() => {})
    let target = await environment.getDocument()
    const reference = new WeakRef(target)
    target = undefined
    return { environment, reference, canary: new WeakRef({}) }
  } finally {
    environment.dispose()
  }
}

export async function sampleEnvironmentObservers(
  createEnvironment,
  detectPolicy,
  probed,
  collect,
  original,
) {
  const frames = document.querySelectorAll('iframe').length
  const sourceFonts = []
  document.fonts.forEach((font) => {
    sourceFonts.push({ family: font.family, status: font.status })
  })
  const rows = []
  const owners = [
    ['native-timed', () => nativeEnvironment(document, detectPolicy)],
    ['native-untimed', () => nativeEnvironment(document, detectPolicy, false)],
    ['library', () => createEnvironment(document)],
  ]
  const helpers = [
    ['await-document', awaitDocument],
    ['weak-promise', weakPromise],
    ['cleared-local', clearedLocal],
  ]
  for (let ownerIndex = 0; ownerIndex < owners.length; ownerIndex++) {
    const [owner, create] = owners[ownerIndex]
    for (let helperIndex = 0; helperIndex < helpers.length; helperIndex++) {
      const [helper, observe] = helpers[helperIndex]
      try {
        // eslint-disable-next-line no-await-in-loop
        rows.push({ owner, helper, value: await observe(create, probed) })
      } catch (error) {
        rows.push({ owner, helper, error: String(error) })
      }
    }
  }
  const held = { marker: 'strong diagnostic positive control' }
  const heldReference = new WeakRef(held)
  await collect()
  await collect()
  await collect()
  return {
    diagnosticCollections: 3,
    originalCollectedAfterDiagnostic: original.deref() === undefined,
    strongControlPreserved: heldReference.deref() === held,
    framesRestored: document.querySelectorAll('iframe').length === frames,
    sourceFonts,
    rows: rows.map(({ owner, helper, value, error }) => ({
      owner,
      helper,
      error,
      documentCollected: value
        ? value.reference.deref() === undefined
        : undefined,
      canaryCollected: value ? value.canary.deref() === undefined : undefined,
      sharingErrors: value?.environment.sharingErrors,
    })),
  }
}

function captureSource() {
  const source = document.implementation.createHTMLDocument()
  source.body.style.cssText =
    'display:flex;margin:0;width:60px;height:20px;background:white'
  const href = new URL(
    '/test/browser/fixtures/svg-fragment-pattern.svg#inline',
    location.href,
  ).href
  source.body.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs><pattern id="fragment-paint" patternUnits="userSpaceOnUse" width="20" height="20"><rect width="20" height="20" fill="blue"/></pattern></defs></svg><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><use href="' +
    href +
    '" width="20" height="20"/></svg><div style="width:20px;height:20px;background:blue"></div><div style="width:20px;height:20px;background:yellow"></div>'
  return source
}

async function awaitCapture(createRenderer) {
  const source = captureSource()
  const renderer = createRenderer({
    width: 60,
    height: 20,
    pixelRatio: 1,
    skipFonts: true,
  })
  try {
    return {
      reference: new WeakRef(source),
      capture: await renderer.capture(source.body),
      renderer,
      canary: new WeakRef({}),
    }
  } catch (error) {
    renderer.dispose()
    throw error
  }
}

async function clearedSource(createRenderer) {
  let source = captureSource()
  const renderer = createRenderer({
    width: 60,
    height: 20,
    pixelRatio: 1,
    skipFonts: true,
  })
  const reference = new WeakRef(source)
  try {
    const capture = await renderer.capture(source.body)
    source = undefined
    return { reference, capture, renderer, canary: new WeakRef({}) }
  } catch (error) {
    renderer.dispose()
    throw error
  }
}

export async function sampleCaptureObservers(
  createRenderer,
  collect,
  original,
) {
  const rows = []
  try {
    const helpers = [
      ['await-capture', awaitCapture],
      ['cleared-source', clearedSource],
    ]
    for (let index = 0; index < helpers.length; index++) {
      const [helper, observe] = helpers[index]
      try {
        // eslint-disable-next-line no-await-in-loop
        rows.push({ helper, value: await observe(createRenderer) })
      } catch (error) {
        rows.push({ helper, error: String(error) })
      }
    }
    await collect()
    await collect()
    await collect()
    return {
      diagnosticCollections: 3,
      originalCollectedAfterDiagnostic: original.deref() === undefined,
      rows: rows.map(({ helper, value, error }) => ({
        helper,
        error,
        documentCollected: value
          ? value.reference.deref() === undefined
          : undefined,
        canaryCollected: value ? value.canary.deref() === undefined : undefined,
      })),
    }
  } finally {
    rows.forEach(({ value }) => value?.renderer.dispose())
  }
}
