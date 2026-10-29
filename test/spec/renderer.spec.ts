import './setup'
import { createRenderer, toBlob, toImageData, toSvg } from '../../src'
import type { CaptureEvent, CapturePlugin, Options, Renderer } from '../../src'
import { createImage } from '../../src/util'
import { fetchAsDataURL } from '../../src/dataurl'
import { getSvgDocument } from './helper'

function imageBlob(color = 'red') {
  return new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${color}"/></svg>`,
    ],
    { type: 'image/svg+xml' },
  )
}

describe('renderer and capture architecture', () => {
  const nodes: HTMLElement[] = []
  const renderers: Renderer[] = []

  function element(html = '', color = 'red') {
    const node = document.createElement('div')
    node.style.cssText = `width:16px;height:12px;background:${color}`
    node.innerHTML = html
    document.body.appendChild(node)
    nodes.push(node)
    return node
  }

  function renderer(options: Options = {}) {
    const instance = createRenderer({
      skipFonts: true,
      pixelRatio: 1,
      ...options,
    })
    renderers.push(instance)
    return instance
  }

  afterEach(() => {
    renderers.splice(0).forEach((instance) => instance.dispose())
    nodes.splice(0).forEach((node) => node.remove())
  })

  it('freezes one capture while subsequent captures read current content', async () => {
    const node = element('before')
    const instance = renderer()
    const capture = await instance.capture(node)
    node.style.backgroundColor = 'blue'
    node.textContent = 'after'
    const before = await getSvgDocument(await capture.toSvg())
    const after = await getSvgDocument(await instance.toSvg(node))
    expect(before.documentElement.textContent).toContain('before')
    expect(after.documentElement.textContent).toContain('after')
    expect((await capture.toImageData()).data.slice(0, 4)).toEqual(
      new Uint8ClampedArray([255, 0, 0, 255]),
    )
  })

  it('renders once for concurrent formats and returns independent canvases', async () => {
    const events: CaptureEvent[] = []
    const capture = await renderer({
      onEvent: (event) => events.push(event),
    }).capture(element())
    const [png, blob, first] = await Promise.all([
      capture.toPng(),
      capture.toBlob({ type: 'image/jpeg' }),
      capture.toCanvas(),
    ])
    expect(png.startsWith('data:image/png')).toBeTrue()
    expect(blob!.type).toBe('image/jpeg')
    expect(
      events.filter(
        (event) => event.type === 'stage' && event.stage === 'render',
      ).length,
    ).toBe(1)
    first.getContext('2d')!.clearRect(0, 0, first.width, first.height)
    const second = await capture.toCanvas()
    expect(second).not.toBe(first)
    expect(second.getContext('2d')!.getImageData(0, 0, 1, 1).data[3]).toBe(255)
  })

  it('re-rasterizes a frozen snapshot without re-running clone transforms', async () => {
    const node = element()
    let clones = 0
    const capture = await renderer({
      stabilizationAttempts: 3,
      onClone: () => {
        clones += 1
      },
    }).capture(node)
    node.style.backgroundColor = 'blue'
    const image = await capture.toImageData()
    expect(Array.from(image.data.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(clones).toBe(1)
    await expectAsync(
      renderer({ stabilizationAttempts: Infinity }).capture(node),
    ).toBeRejectedWithError(/stabilizationAttempts/)
  })

  it('recovers when the first browser draw is blank', async () => {
    const original = CanvasRenderingContext2D.prototype.drawImage
    let draws = 0
    const draw = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      draws += 1
      if (draws > 1) Reflect.apply(original, this, args)
    }
    spyOn(CanvasRenderingContext2D.prototype, 'drawImage').and.callFake(
      draw as typeof original,
    )
    const image = await renderer({ stabilizationAttempts: 3 }).toImageData(
      element(),
    )
    expect(draws).toBe(3)
    expect(Array.from(image.data.slice(0, 4))).toEqual([255, 0, 0, 255])
  })

  it('reads the complete output pixel buffer at non-unit pixel ratios', async () => {
    const node = element()
    const image = await toImageData(node, { skipFonts: true, pixelRatio: 2 })
    expect(image.width).toBe(32)
    expect(image.height).toBe(24)
    expect(image.data.length).toBe(32 * 24 * 4)
    const pixels = await renderer({ pixelRatio: 2 }).toPixelData(node)
    expect(pixels.length).toBe(image.data.length)
    expect(Array.from(pixels.slice(-4))).toEqual([255, 0, 0, 255])
  })

  it('forwards Blob MIME and zero JPEG quality through the legacy facade', async () => {
    const original = HTMLCanvasElement.prototype.toBlob
    const qualities: (number | undefined)[] = []
    spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake(function (
      this: HTMLCanvasElement,
      callback,
      type,
      quality,
    ) {
      qualities.push(quality)
      original.call(this, callback, type, quality)
    })
    const blob = await toBlob(element(), {
      skipFonts: true,
      type: 'image/jpeg',
      quality: 0,
    })
    expect(blob!.type).toBe('image/jpeg')
    expect(qualities).toEqual([0])
  })

  it('isolates concurrent style selections and does not mutate frozen options', async () => {
    const node = element('text')
    node.className = 'renderer-selection'
    const sheet = document.createElement('style')
    sheet.textContent =
      '.renderer-selection { color: green; font-style: italic; }'
    document.head.appendChild(sheet)
    nodes.push(sheet)
    const style = Object.freeze({ opacity: '0.5' })
    const options = Object.freeze({
      includeStyleProperties: Object.freeze(['color']) as unknown as string[],
      style,
    })
    const instance = renderer()
    const [color, size, empty] = await Promise.all([
      instance.toSvg(node, options),
      instance.toSvg(node, { includeStyleProperties: ['width'] }),
      instance.toSvg(node, { includeStyleProperties: [] }),
    ])
    const roots = await Promise.all(
      [color, size, empty].map(
        async (value) =>
          (
            await getSvgDocument(value)
          ).querySelector('foreignObject > div') as HTMLElement,
      ),
    )
    expect(roots[0].style.color).toBe('rgb(0, 128, 0)')
    expect(roots[0].style.fontStyle).toBe('')
    expect(roots[1].style.color).toBe('')
    expect(roots[2].style.color).toBe('')
    expect(options.includeStyleProperties).toEqual(['color'])
    expect(node.style.opacity).toBe('')
  })

  it('selects pseudo-element style properties independently per capture', async () => {
    const sheet = document.createElement('style')
    sheet.textContent =
      '.capture-pseudo::before { content: "marker"; color: red; background-color: blue; }'
    document.head.appendChild(sheet)
    nodes.push(sheet)
    const node = element()
    node.className = 'capture-pseudo'
    const instance = renderer()
    const [color, background] = await Promise.all([
      instance.toSvg(node, { includeStyleProperties: ['content', 'color'] }),
      instance.toSvg(node, {
        includeStyleProperties: ['content', 'background-color'],
      }),
    ])
    const colorDoc = await getSvgDocument(color)
    const backgroundDoc = await getSvgDocument(background)
    const colorRule = colorDoc.querySelector('foreignObject style')!
      .textContent!
    const backgroundRule = backgroundDoc.querySelector('foreignObject style')!
      .textContent!
    expect(colorRule).toContain('color: rgb(255, 0, 0)')
    expect(colorRule).not.toContain('background-color:')
    expect(backgroundRule).toContain('background-color: rgb(0, 0, 255)')
    expect(backgroundRule).not.toContain(' color:')
  })

  it('runs asynchronous transforms in order before discovering added resources', async () => {
    const order: string[] = []
    const node = element('original')
    const instance = renderer({
      onClone: async ({ root }) => {
        await Promise.resolve()
        order.push('callback')
        root.textContent = 'copy'
      },
      plugins: [
        {
          name: 'add-image',
          transformClone: ({ root }) => {
            order.push('plugin')
            const image = document.createElement('img')
            image.src = 'asset:added'
            root.appendChild(image)
          },
          resolveResource: (request) => {
            order.push(request.kind)
            expect(request.url).toBe('asset:added')
            return imageBlob()
          },
        },
      ],
    })
    const svg = await getSvgDocument(await instance.toSvg(node))
    expect(order).toEqual(['callback', 'plugin', 'image'])
    expect(
      svg
        .querySelector('img')!
        .getAttribute('src')!
        .startsWith('data:image/svg+xml'),
    ).toBeTrue()
    expect(node.textContent).toBe('original')
    expect(node.querySelector('img')).toBeNull()
  })

  it('excludes subtrees without applying the legacy filter to the root', async () => {
    const node = element(
      '<span class="private">secret</span><span>visible</span>',
    )
    const svg = await getSvgDocument(
      await renderer({
        exclude: ['.private'],
        filter: (candidate) => candidate !== node,
      }).toSvg(node),
    )
    expect(svg.documentElement.textContent).not.toContain('secret')
    expect(svg.documentElement.textContent).toContain('visible')
  })

  it('visits SVG descendants for exclusions and computed styles', async () => {
    const node = element(
      '<svg width="16" height="12"><rect class="keep" width="8" height="8"/><rect class="private" x="8" width="8" height="8"/></svg>',
    )
    const sheet = document.createElement('style')
    sheet.textContent = '.keep { fill: rgb(0, 128, 0); }'
    document.head.appendChild(sheet)
    nodes.push(sheet)
    const svg = await getSvgDocument(
      await renderer({ exclude: ['.private'] }).toSvg(node),
    )
    const rects = svg.querySelectorAll('rect')
    expect(rects.length).toBe(1)
    expect(rects[0].getAttribute('class')).toBe('keep')
    expect((rects[0] as SVGRectElement).style.fill).toBe('rgb(0, 128, 0)')
    expect(node.querySelectorAll('rect').length).toBe(2)
  })

  it('applies filter to SVG descendants', async () => {
    const node = element(
      '<svg width="16" height="12"><rect class="keep" width="8" height="8"/><rect class="omit" x="8" width="8" height="8"/></svg>',
    )
    const svg = await getSvgDocument(
      await renderer({
        filter: (candidate) => !candidate.classList?.contains('omit'),
      }).toSvg(node),
    )
    const rects = svg.querySelectorAll('rect')
    expect(rects.length).toBe(1)
    expect(rects[0].getAttribute('class')).toBe('keep')
  })

  it('applies filter to SVG foreignObject descendants', async () => {
    const node = element(
      '<svg width="16" height="12">' +
        '<foreignObject class="keep" width="8" height="12"><div xmlns="http://www.w3.org/1999/xhtml">visible</div></foreignObject>' +
        '<foreignObject class="omit" x="8" width="8" height="12"><div xmlns="http://www.w3.org/1999/xhtml">secret</div></foreignObject>' +
        '</svg>',
    )
    const svg = await getSvgDocument(
      await renderer({
        filter: (candidate) => !candidate.classList?.contains('omit'),
      }).toSvg(node),
    )
    expect(svg.querySelectorAll('foreignObject.keep').length).toBe(1)
    expect(svg.querySelector('foreignObject.omit')).toBeNull()
    expect(svg.documentElement.textContent).toContain('visible')
    expect(svg.documentElement.textContent).not.toContain('secret')
  })

  it('clones a same-origin iframe body exactly once', async () => {
    const node = element()
    const frame = document.createElement('iframe')
    const loaded = new Promise<void>((resolve) => {
      frame.onload = () => resolve()
    })
    frame.srcdoc = '<div id="frame-content">one copy</div>'
    node.appendChild(frame)
    await loaded
    const svg = await getSvgDocument(await renderer().toSvg(node))
    expect(svg.querySelectorAll('#frame-content').length).toBe(1)
    expect(node.querySelector('iframe')).toBe(frame)
  })

  it('resolves relative CSS image URLs against the source document', async () => {
    const node = element()
    node.style.backgroundImage = 'url("./assets/pixel.svg")'
    const urls: string[] = []
    const svg = await getSvgDocument(
      await renderer({
        resources: {
          resolve: ({ url }) => {
            urls.push(url)
            return imageBlob()
          },
        },
      }).toSvg(node),
    )
    expect(urls).toEqual([new URL('./assets/pixel.svg', node.baseURI).href])
    expect(
      (svg.querySelector('foreignObject > div') as HTMLElement).style
        .backgroundImage,
    ).toContain('data:image/svg+xml')
  })

  it('deduplicates pending requests within a capture without sharing state across captures', async () => {
    let requests = 0
    const node = element('<img src="asset:same"><img src="asset:same">')
    const instance = renderer({
      resources: {
        resolve: async () => {
          requests += 1
          await Promise.resolve()
          return imageBlob()
        },
      },
    })
    await instance.toSvg(node)
    expect(requests).toBe(1)
    await instance.toSvg(node)
    expect(requests).toBe(2)
  })

  it('keeps query variants distinct by default', async () => {
    const urls: string[] = []
    const node = element(
      '<img src="asset:pixel?v=1"><img src="asset:pixel?v=2">',
    )
    await renderer({
      resources: {
        resolve: ({ url }) => {
          urls.push(url)
          return imageBlob(url.endsWith('1') ? 'red' : 'blue')
        },
      },
    }).toSvg(node)
    expect(urls.sort()).toEqual(['asset:pixel?v=1', 'asset:pixel?v=2'])
  })

  it('fetches again for each capture when cacheBust is enabled', async () => {
    const requests: string[] = []
    spyOn(window, 'fetch').and.callFake((input) => {
      requests.push(String(input))
      return Promise.resolve(new Response(imageBlob(), { status: 200 }))
    })
    const node = element('<img src="asset:pixel">')
    const instance = renderer({ cacheBust: true })
    await instance.toSvg(node)
    await instance.toSvg(node)
    expect(requests.length).toBe(2)
    requests.forEach((url) => expect(url).toContain('_htmlToImage='))
  })

  it('reports missing resources and lets the image handler continue', async () => {
    const events: CaptureEvent[] = []
    let imageErrors = 0
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response('', { status: 404 })),
    )
    const result = await renderer({
      onEvent: (event) => events.push(event),
      onImageErrorHandler: () => {
        imageErrors += 1
      },
    }).capture(element('<img src="asset:missing">'))
    expect(imageErrors).toBe(1)
    expect(result.diagnostics.length).toBe(1)
    expect(result.diagnostics[0].resource).toBe('asset:missing')
    expect(events.some((event) => event.type === 'warning')).toBeTrue()
  })

  it('rejects non-404 HTTP failures in the exported fetch helper', async () => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response('', { status: 500 })),
    )
    await expectAsync(
      fetchAsDataURL('asset:broken', undefined, ({ result }) => result),
    ).toBeRejectedWithError(/500/)
  })

  it('allows a resource resolver to decline and falls through in order', async () => {
    const order: string[] = []
    await renderer({
      resources: {
        resolve: () => {
          order.push('option')
          return undefined
        },
      },
      plugins: [
        {
          name: 'decline',
          resolveResource: () => {
            order.push('decline')
            return undefined
          },
        },
        {
          name: 'handle',
          resolveResource: () => {
            order.push('handle')
            return imageBlob()
          },
        },
        {
          name: 'unused',
          resolveResource: () => {
            order.push('unused')
            return imageBlob()
          },
        },
      ],
    }).toSvg(element('<img src="asset:pixel">'))
    expect(order).toEqual(['option', 'decline', 'handle'])
  })

  it('propagates resolver failures instead of silently replacing resources', async () => {
    await expectAsync(
      renderer({
        resources: {
          resolve: () => {
            throw new Error('credentials unavailable')
          },
        },
      }).toSvg(element('<img src="asset:pixel">')),
    ).toBeRejectedWithError('Custom resource resolver failed')
  })

  it('propagates transform errors and rejects duplicate plugin names', async () => {
    const node = element()
    await expectAsync(
      renderer({
        onClone: () => {
          throw new Error('transform failed')
        },
      }).toSvg(node),
    ).toBeRejectedWithError('transform failed')
    const plugin: CapturePlugin = { name: 'duplicate' }
    await expectAsync(
      renderer({ plugins: [plugin, plugin] }).toSvg(node),
    ).toBeRejectedWithError(/unique/)
  })

  it('copies renderer defaults instead of reading later caller mutations', async () => {
    const options: Options = { style: { opacity: '0.5' }, plugins: [] }
    const instance = renderer(options)
    options.style!.opacity = '0'
    const svg = await getSvgDocument(await instance.toSvg(element()))
    expect(
      (svg.querySelector('foreignObject > div') as HTMLElement).style.opacity,
    ).toBe('0.5')
  })

  it('merges per-capture styles and permits clearing default exclusions', async () => {
    const instance = renderer({ style: { opacity: '0.5' }, exclude: ['span'] })
    const svg = await getSvgDocument(
      await instance.toSvg(element('<span>kept</span>'), {
        style: { backgroundColor: 'blue' },
        exclude: [],
      }),
    )
    const root = svg.querySelector('foreignObject > div') as HTMLElement
    expect(root.style.opacity).toBe('0.5')
    expect(root.style.backgroundColor).toBe('blue')
    expect(root.querySelector('span')!.textContent).toBe('kept')
  })

  it('rejects already aborted signals without invoking transforms', async () => {
    const controller = new AbortController()
    controller.abort()
    let called = false
    await expectAsync(
      renderer({
        signal: controller.signal,
        onClone: () => {
          called = true
        },
      }).toSvg(element()),
    ).toBeRejected()
    expect(called).toBeFalse()
  })

  it('cancels a pending resolver independently of other captures', async () => {
    const controller = new AbortController()
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const instance = renderer({
      resources: {
        resolve: () => {
          started()
          return new Promise<Blob>(() => {})
        },
      },
    })
    const pending = instance.toSvg(element('<img src="asset:pending">'), {
      signal: controller.signal,
    })
    await ready
    controller.abort()
    await expectAsync(pending).toBeRejected()
    await expectAsync(instance.toSvg(element())).toBeResolved()
  })

  it('times out a transform that never settles', async () => {
    const pending = renderer({
      timeout: 25,
      onClone: () => new Promise<void>(() => {}),
    }).toSvg(element())
    try {
      await pending
      fail('Expected a timeout')
    } catch (error) {
      expect((error as DOMException).name).toBe('TimeoutError')
    }
  })

  it('disposes pending work and previously created captures', async () => {
    const instance = renderer()
    const capture = await instance.capture(element())
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const pending = instance.toSvg(element(), {
      onClone: () => {
        started()
        return new Promise<void>(() => {})
      },
    })
    await ready
    instance.dispose()
    instance.dispose()
    await expectAsync(pending).toBeRejected()
    await expectAsync(capture.toSvg()).toBeRejectedWithError(/disposed/)
    await expectAsync(instance.capture(element())).toBeRejectedWithError(
      /disposed/,
    )
  })

  it('keeps the renderer usable after an individual capture is disposed', async () => {
    const instance = renderer()
    const node = element()
    const capture = await instance.capture(node)
    capture.dispose()
    capture.dispose()
    await expectAsync(capture.toCanvas()).toBeRejectedWithError(/disposed/)
    await expectAsync(instance.toPng(node)).toBeResolved()
  })

  it('does not depend on animation frames and tolerates usable image decode rejection', async () => {
    spyOn(window, 'requestAnimationFrame').and.callFake(() => {
      throw new Error('Unexpected animation frame')
    })
    spyOn(HTMLImageElement.prototype, 'decode').and.callFake(() =>
      Promise.reject(new Error('decode rejected')),
    )
    const source = URL.createObjectURL(imageBlob())
    try {
      const image = await createImage(source, {})
      expect(image.naturalWidth).toBe(8)
      await expectAsync(renderer().toPng(element())).toBeResolved()
    } finally {
      URL.revokeObjectURL(source)
    }
  })

  it('preserves fragment-only CSS references without fetching the document', async () => {
    let requests = 0
    const node = element()
    node.style.clipPath = 'url(#clip)'
    const svg = await getSvgDocument(
      await renderer({
        resources: {
          resolve: () => {
            requests += 1
            return undefined
          },
        },
      }).toSvg(node),
    )
    expect(requests).toBe(0)
    expect(
      (svg.querySelector('foreignObject > div') as HTMLElement).style.clipPath,
    ).toContain('#clip')
  })

  it('serializes invalid XML controls without mutating the source text', async () => {
    const node = element()
    node.textContent = `a${String.fromCharCode(1)}b`
    const svg = await getSvgDocument(await toSvg(node, { skipFonts: true }))
    expect(svg.querySelector('parsererror')).toBeNull()
    expect(svg.documentElement.textContent).toContain('ab')
    expect(node.textContent).toBe(`a${String.fromCharCode(1)}b`)
  })

  it('preserves textarea markup as text', async () => {
    const node = element('<textarea></textarea>')
    const text = '<b>literal & text</b>'
    node.querySelector('textarea')!.value = text
    const svg = await getSvgDocument(await renderer().toSvg(node))
    expect(svg.querySelector('textarea')!.textContent).toBe(text)
    expect(svg.querySelector('textarea b')).toBeNull()
  })

  it('keeps zero-height SVG serialization compatible while rejecting rasterization', async () => {
    const node = element()
    node.style.height = '0'
    const capture = await renderer().capture(node)
    const svg = await getSvgDocument(await capture.toSvg())
    expect(svg.documentElement.getAttribute('height')).toBe('0')
    await expectAsync(capture.toPng()).toBeRejectedWithError(/zero-sized/)
  })
})
