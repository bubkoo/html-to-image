function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function pixel(image, x, y) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4)).join(',')
}

async function fixture(cache = false) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
  const id = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
  const base = `/test/browser/resource-policy/${id}/`
  const response = await fetch(`${base}setup?cache=${cache ? 1 : 0}`, {
    method: 'POST',
  })
  assert(response.ok, 'resource fixture setup failed')
  return {
    base,
    image: new URL(`${base}image`, location.href).href,
    stats: () => fetch(`${base}stats`).then((value) => value.json()),
    color: (color) => fetch(`${base}state?color=${color}`, { method: 'POST' }),
    cleanup: () => fetch(`${base}cleanup`, { method: 'POST' }),
  }
}

export { fixture as createResourceFixture }

function scene(url, repeated = false) {
  const root = document.createElement('div')
  root.style.cssText = `display:flex;width:${repeated ? 60 : 20}px;height:20px;background:white`
  root.innerHTML =
    `<img width="20" height="20" style="display:block;flex:none" src="${url}">` +
    (repeated
      ? `<img width="20" height="20" style="display:block;flex:none" src="${url}"><div style="width:20px;height:20px;flex:none;background:url('${url}')"></div>`
      : '')
  document.body.append(root)
  return root
}

const nativeImages = (requests) =>
  requests.filter(
    (entry) =>
      entry.action === 'image' && entry.method === 'GET' && !entry.marker,
  ).length
const capturedImages = (requests) =>
  requests.filter(
    (entry) =>
      entry.action === 'image' &&
      entry.method === 'GET' &&
      entry.marker === 'capture',
  ).length
const init = () => ({
  headers: { 'X-HTML-To-Image-Test': 'capture' },
  cache: 'no-store',
})

export async function checkResourceCache(api) {
  const session = await fixture()
  const root = scene(session.image, true)
  const renderer = api.createRenderer({
    skipFonts: true,
    pixelRatio: 1,
    fetchRequestInit: init(),
  })
  try {
    await Promise.all(
      Array.from(root.querySelectorAll('img')).map((image) => image.decode()),
    )
    const before = await session.stats()
    const capture = await renderer.capture(root)
    const [first] = await Promise.all([capture.toImageData(), capture.toPng()])
    ;[10, 30, 50].forEach((x) =>
      assert(
        pixel(first, x, 10) === '255,0,0,255',
        'first capture lost a red resource',
      ),
    )
    const firstRequests = await session.stats()
    assert(
      capturedImages(firstRequests) === 1,
      `duplicate loader HTTP requests: ${capturedImages(firstRequests)}`,
    )
    const nativeDuplicates = nativeImages(firstRequests) - nativeImages(before)
    assert(
      nativeDuplicates === 0,
      `cloning issued ${nativeDuplicates} extra native image requests`,
    )
    capture.dispose()
    let disposed = false
    try {
      await capture.toSvg()
    } catch (error) {
      disposed = error.message.includes('disposed')
    }
    assert(disposed, 'disposed capture remained usable')
    await session.color('blue')
    const second = await renderer.toImageData(root)
    assert(
      pixel(second, 10, 10) === '0,0,255,255',
      'a later capture reused a stale library resource',
    )
    assert(
      capturedImages(await session.stats()) === 2,
      'later capture did not fetch again',
    )
    renderer.dispose()
    let rendererDisposed = false
    try {
      await renderer.capture(root)
    } catch (error) {
      rendererDisposed = error.message.includes('disposed')
    }
    assert(rendererDisposed, 'disposed renderer remained usable')
    await session.color('green')
    const third = await api.toImageData(root, {
      skipFonts: true,
      pixelRatio: 1,
      fetchRequestInit: init(),
    })
    assert(
      pixel(third, 10, 10) === '0,128,0,255',
      'new renderer inherited a stale resource',
    )
    assert(
      capturedImages(await session.stats()) === 3,
      'new renderer did not fetch independently',
    )
    assert(
      Array.from(root.querySelectorAll('img')).every(
        (image) => image.src === session.image,
      ),
      'source image URLs changed',
    )
    return {
      fetches: 3,
      nativeDuplicates,
      disposed,
      rendererDisposed,
      sourceUnchanged: true,
    }
  } finally {
    renderer.dispose()
    root.remove()
    await session.cleanup()
  }
}

export async function checkNativeCachePolicy(api) {
  const session = await fixture(true)
  const root = scene(session.image)
  const options = {
    skipFonts: true,
    pixelRatio: 1,
    fetchRequestInit: { headers: { 'X-HTML-To-Image-Test': 'capture' } },
  }
  try {
    await root.firstChild.decode()
    const first = await api.toImageData(root, options)
    assert(
      pixel(first, 10, 10) === '255,0,0,255',
      `initial browser cache resource was not red: ${pixel(first, 10, 10)}`,
    )
    await session.color('blue')
    const cached = await api.toImageData(root, options)
    // Browsers may decline to retain an HTTP cache entry. The contract under
    // test is an actual revalidation request, not a guaranteed default hit.
    assert(
      ['255,0,0,255', '0,0,255,255'].includes(pixel(cached, 10, 10)),
      `default cache produced an invalid pixel: ${pixel(cached, 10, 10)}`,
    )
    const beforeRevalidation = capturedImages(await session.stats())
    const requestInit = Object.freeze({
      cache: 'no-cache',
      headers: Object.freeze({ 'X-HTML-To-Image-Test': 'capture' }),
    })
    const fresh = await api.toImageData(root, {
      ...options,
      fetchRequestInit: requestInit,
    })
    assert(
      pixel(fresh, 10, 10) === '0,0,255,255',
      'no-cache did not revalidate the browser cache',
    )
    assert(requestInit.cache === 'no-cache', 'input cache policy changed')
    const requests = await session.stats()
    const revalidation = requests
      .filter((entry) => entry.action === 'image' && entry.marker === 'capture')
      .at(-1)
    assert(
      capturedImages(requests) === beforeRevalidation + 1,
      'no-cache did not make an HTTP request',
    )
    assert(
      /no-cache|max-age=0/.test(revalidation.cacheControl),
      `revalidation directive missing: ${JSON.stringify(revalidation)}`,
    )
    return { revalidated: 'blue', requestRevalidated: true }
  } finally {
    root.remove()
    await session.cleanup()
  }
}

export async function checkResourceCredentials(api) {
  const session = await fixture()
  const publicOrigin = new URL(location.href)
  publicOrigin.port = String(Number(location.port) + 1)
  const publicImage = new URL(`${session.base}public-image`, publicOrigin).href
  const publicFont = new URL(`${session.base}font`, publicOrigin).href
  const root = scene(session.image)
  root.style.width = '60px'
  root.innerHTML += `<img width="20" height="20" style="display:block;flex:none" src="${publicImage}"><span style="display:block;flex:none;width:20px;height:20px;font:20px 'Policy Metrics';line-height:20px;color:blue">A</span>`
  const sheet = document.createElement('style')
  sheet.textContent = `@font-face {font-family:'Policy Metrics';src:url('${publicFont}') format('truetype')}`
  document.head.append(sheet)
  const warnings = []
  const calls = []
  const fetchRequestInit = Object.freeze({
    credentials: 'include',
    cache: 'no-store',
    headers: Object.freeze({ 'X-HTML-To-Image-Test': 'capture' }),
  })
  try {
    await Promise.all(
      Array.from(root.querySelectorAll('img')).map((image) => image.decode()),
    )
    const fonts = await document.fonts.load("20px 'Policy Metrics'")
    assert(fonts.length > 0, 'public test font did not load')
    const unauthorized = await fetch(session.image, { credentials: 'omit' })
    assert(
      unauthorized.status === 401,
      'private image did not require credentials',
    )
    let failed = false
    try {
      await api.toSvg(root, {
        fetchRequestInit,
        onEvent: (event) => {
          if (event.type === 'warning') warnings.push(event.diagnostic.resource)
        },
      })
    } catch {
      failed = true
    }
    assert(
      failed,
      'global include unexpectedly accepted wildcard CORS resources',
    )
    const image = await api.toImageData(root, {
      pixelRatio: 1,
      fetchRequestInit,
      resources: {
        resolve: async ({ url, kind }, { signal }) => {
          calls.push({ url, kind })
          if (new URL(url).origin !== publicOrigin.origin) return undefined
          const response = await fetch(url, {
            credentials: 'omit',
            signal,
            headers: { 'X-HTML-To-Image-Test': 'capture' },
          })
          if (!response.ok)
            throw new Error(`test resource status ${response.status}`)
          return response.blob()
        },
      },
    })
    assert(
      pixel(image, 10, 10) === '255,0,0,255',
      `private image pixel missing: ${pixel(image, 10, 10)}`,
    )
    assert(pixel(image, 30, 10) === '0,128,0,255', 'public image pixel missing')
    assert(
      pixel(image, 41, 1) === '0,0,255,255',
      `public font pixel missing: ${pixel(image, 41, 1)}`,
    )
    assert(
      calls.some((entry) => entry.url === publicFont && entry.kind === 'font'),
      'font resolver was not used',
    )
    assert(
      calls.some(
        (entry) => entry.url === publicImage && entry.kind === 'image',
      ),
      'image resolver was not used',
    )
    const requests = await session.stats()
    const privateRequests = requests.filter(
      (entry) => entry.action === 'image' && entry.marker === 'capture',
    )
    const publicRequests = requests.filter(
      (entry) =>
        entry.action !== 'image' &&
        entry.method === 'GET' &&
        entry.marker === 'capture',
    )
    assert(
      privateRequests.length > 0 &&
        privateRequests.every((entry) => entry.credential),
      'private requests lost their cookie',
    )
    assert(
      publicRequests.length >= 2 &&
        publicRequests.every((entry) => !entry.credential),
      'public requests sent a private cookie',
    )
    assert(
      Array.from(root.querySelectorAll('img'))
        .map((element) => element.src)
        .join('|') === `${session.image}|${publicImage}`,
      'source image URLs changed',
    )
    assert(
      fetchRequestInit.credentials === 'include',
      'global request policy changed',
    )
    return {
      negativeControl: failed,
      privateCredential: true,
      publicCredential: false,
      font: true,
      publicImage: true,
      sourceUnchanged: true,
      warnings: warnings.length,
    }
  } finally {
    root.remove()
    sheet.remove()
    await session.cleanup()
  }
}

export async function checkRelativeCloneAssets(api) {
  const session = await fixture()
  let copyRoot
  let copyBase
  const root = document.createElement('div')
  root.style.cssText = `width:40px;height:20px;background:white url('${session.base}image') no-repeat;background-size:20px 20px`
  document.body.append(root)
  const frame = document.createElement('iframe')
  frame.style.cssText = 'display:block;width:60px;height:20px;border:0'
  const loaded = new Promise((resolve) => {
    frame.onload = resolve
  })
  frame.srcdoc = `<base href="${new URL(session.base, location.href).href}"><style>html,body{margin:0}body{display:flex}</style><img id="relative-resource" src="image" width="20" height="20"><svg width="20" height="20"><image id="relative-svg" href="image" width="20" height="20"/></svg><svg xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20"><image id="relative-legacy-svg" xlink:href="image" width="20" height="20"/></svg>`
  document.body.append(frame)
  try {
    const inserted = await api.toImageData(root, {
      skipFonts: true,
      pixelRatio: 1,
      includeStyleProperties: [],
      fetchRequestInit: init(),
      onEvent: (event) => {
        if (event.type === 'stage' && event.stage === 'serialize') {
          assert(
            copyRoot.ownerDocument.baseURI === copyBase,
            'clone document lost its base during resource embedding',
          )
        }
      },
      onClone: ({ root: copy }) => {
        copyRoot = copy
        copyBase = copy.ownerDocument.baseURI
        const image = copy.ownerDocument.createElement('img')
        image.style.cssText =
          'display:block;margin-left:20px;width:20px;height:20px'
        image.src = `${session.base}image`
        copy.append(image)
      },
    })
    const afterInserted = capturedImages(await session.stats())
    assert(
      pixel(inserted, 10, 10) === '255,0,0,255',
      'relative inline background failed',
    )
    assert(
      pixel(inserted, 30, 10) === '255,0,0,255',
      'relative transform-added image failed',
    )
    assert(root.children.length === 0, 'clone transform changed the source')
    await loaded
    const sourceImage =
      frame.contentDocument.getElementById('relative-resource')
    await sourceImage.decode()
    const renderer = api.createRenderer({
      skipFonts: true,
      pixelRatio: 1,
      fetchRequestInit: init(),
    })
    let image
    try {
      const capture = await renderer.capture(frame)
      const svg = new DOMParser().parseFromString(
        decodeURIComponent(
          (await capture.toSvg()).split(',').slice(1).join(','),
        ),
        'image/svg+xml',
      )
      assert(
        svg
          .getElementById('relative-resource')
          .getAttribute('src')
          .startsWith('data:image/svg+xml;') &&
          svg
            .getElementById('relative-svg')
            .getAttribute('href')
            .startsWith('data:image/svg+xml;') &&
          svg
            .getElementById('relative-legacy-svg')
            .getAttribute('href')
            .startsWith('data:image/svg+xml;'),
        'relative iframe resources were not embedded into the frozen SVG',
      )
      image = await capture.toImageData()
    } finally {
      renderer.dispose()
    }
    const afterFrame = capturedImages(await session.stats())
    assert(
      pixel(image, 10, 10) === '255,0,0,255',
      'iframe image lost its source base URL',
    )
    assert(
      pixel(image, 30, 10) === '255,0,0,255',
      'iframe SVG image lost its source base URL',
    )
    assert(
      pixel(image, 50, 10) === '255,0,0,255',
      'iframe legacy SVG image lost its source base URL',
    )
    const failure = new Error('iframe clone callback failed')
    let originalError = false
    try {
      await api.toSvg(frame, {
        skipFonts: true,
        onCloneNode: (source) => {
          if (source === sourceImage) throw failure
        },
      })
    } catch (error) {
      originalError = error === failure
    }
    assert(
      originalError,
      'iframe adapter swallowed a user clone callback failure',
    )
    assert(
      sourceImage.getAttribute('src') === 'image',
      'source iframe image URL changed',
    )
    assert(
      frame.contentDocument
        .getElementById('relative-svg')
        .getAttribute('href') === 'image',
      'source SVG image URL changed',
    )
    assert(
      frame.contentDocument
        .getElementById('relative-legacy-svg')
        .getAttribute('xlink:href') === 'image',
      'source legacy SVG image URL changed',
    )
    const requests = await session.stats()
    const total = capturedImages(requests)
    assert(
      total === 2,
      `relative capture counts ${JSON.stringify({ stages: [afterInserted, afterFrame, total], requests: requests.map(({ action, marker, cacheControl }) => [action, marker, cacheControl]) })}`,
    )
    return {
      relativeBackground: true,
      insertedImage: true,
      iframeImage: true,
      originalError,
      sourceUnchanged: true,
    }
  } finally {
    root.remove()
    frame.remove()
    await session.cleanup()
  }
}
