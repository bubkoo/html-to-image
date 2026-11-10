import { expect, test } from 'vitest'
import * as api from '../../src'

test.each(['content', 'frame', 'ancestor'] as const)(
  'embeds srcdoc font rules when capturing the %s',
  async (mode) => {
    const root = document.createElement('div')
    const frame = document.createElement('iframe')
    frame.style.cssText = 'width:40px;height:20px;border:0;display:block'
    frame.srcdoc = `<base href="${new URL('/test/browser/fixtures/', location.href).href}"><style>@font-face{font-family:FrameMetrics;src:url(font-metrics.ttf)}html,body{margin:0}#capture{width:40px;height:20px;font:20px/20px FrameMetrics;color:red;background:white}</style><div id="capture"><span>A</span></div>`
    const loaded = new Promise<void>((resolve) => {
      frame.onload = () => resolve()
    })
    root.append(frame)
    document.body.append(root)
    try {
      await loaded
      await frame.contentDocument!.fonts.load('20px FrameMetrics')
      const target =
        mode === 'content'
          ? frame.contentDocument!.getElementById('capture')!
          : mode === 'frame'
            ? frame
            : root
      const svg = new DOMParser().parseFromString(
        decodeURIComponent((await api.toSvg(target)).split(',')[1]),
        'image/svg+xml',
      )
      expect(svg.documentElement.textContent).toContain('data:font/ttf;base64,')
      expect(
        frame.contentDocument!.getElementById('capture')!.children[0] instanceof
          HTMLElement,
      ).toBe(false)
    } finally {
      root.remove()
    }
  },
)

test.each([
  'content',
  'frame',
  'ancestor',
  'reused-css',
  'quoted-family',
  'explicit-css',
  'important-style',
])('preserves document-local font families and pixels for %s', async (mode) => {
  const moduleURL = '/test/browser/fixtures/iframe-fonts.mjs'
  const { checkIframeFonts } = await import(/* @vite-ignore */ moduleURL)
  expect(await checkIframeFonts(api, mode)).toEqual({
    mode,
    fonts: mode === 'explicit-css' ? 0 : mode === 'content' ? 1 : 2,
    pixels: true,
    sourceUnchanged: true,
  })
})

test('font faces added by a clone transform embed without changing source styles', async () => {
  const root = document.createElement('div')
  root.style.cssText =
    'width:20px;height:20px;background:white;color:red;font:20px/20px "Callback, Font"'
  root.textContent = 'A'
  document.body.append(root)
  try {
    const result = await api.toImageData(root, {
      pixelRatio: 1,
      onClone: ({ root: copy }) => {
        const sheet = copy.ownerDocument.createElement('style')
        sheet.textContent =
          '@font-face{font-family:"Callback, Font";src:url("/test/browser/fixtures/font-frame-metrics.ttf")}'
        copy.append(sheet)
      },
    })
    const pixel = (x: number) =>
      Array.from(
        result.data.slice(
          4 * (8 * result.width + x),
          4 * (8 * result.width + x) + 4,
        ),
      )
    expect(pixel(2)).toEqual([255, 255, 255, 255])
    expect(pixel(12)).toEqual([255, 0, 0, 255])
    expect(root.querySelector('style')).toBeNull()
    expect(root.style.fontFamily).toBe('"Callback, Font"')
  } finally {
    root.remove()
  }
})

test('local-only faces survive font collection without resource requests', async () => {
  const root = document.createElement('div')
  root.innerHTML =
    '<style>@font-face{font-family:LocalAlias;src:local("Arial")}</style><span style="font-family:LocalAlias">A</span>'
  root.style.cssText = 'width:40px;height:20px'
  document.body.append(root)
  const requested: string[] = []
  try {
    const before = root.innerHTML
    const svg = await api.toSvg(root, {
      resources: {
        resolve: ({ url }) => {
          requested.push(url)
          return undefined
        },
      },
    })
    const copy = new DOMParser().parseFromString(
      decodeURIComponent(svg.split(',')[1]),
      'image/svg+xml',
    )
    expect(copy.documentElement.textContent).toContain('local(')
    expect(copy.documentElement.textContent).toContain('LocalAlias')
    expect(requested).toEqual([])
    expect(root.innerHTML).toBe(before)
  } finally {
    root.remove()
  }
})

test('excluding an iframe does not fetch its conflicting font face', async () => {
  const style = document.createElement('style')
  style.textContent =
    '@font-face{font-family:FilteredFrame;src:url("/test/browser/fixtures/font-metrics.ttf")}'
  document.head.append(style)
  const root = document.createElement('div')
  root.style.cssText = 'width:40px;height:20px;font:20px/20px FilteredFrame'
  root.textContent = 'A'
  const frame = document.createElement('iframe')
  frame.srcdoc =
    '<style>@font-face{font-family:FilteredFrame;src:url("/test/browser/fixtures/font-frame-metrics.ttf")}</style><span style="font-family:FilteredFrame">A</span>'
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve()
  })
  root.append(frame)
  document.body.append(root)
  const requested: string[] = []
  try {
    await loaded
    const svg = await api.toSvg(root, {
      filter: (node) => node !== frame,
      resources: {
        resolve: ({ url, kind }) => {
          if (kind === 'font') requested.push(url)
          return undefined
        },
      },
    })
    expect(requested).toEqual([
      new URL('/test/browser/fixtures/font-metrics.ttf', location.href).href,
    ])
    expect(decodeURIComponent(svg.split(',')[1])).not.toContain('<iframe')
    expect(frame.isConnected).toBe(true)
  } finally {
    root.remove()
    style.remove()
  }
})
