import { expect, test } from 'vitest'
import { createRenderer } from '../../src'

test('a denied SVG style probe preserves existing reference pixels with diagnostics', async () => {
  const policy = document.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  policy.content = "frame-src 'none'; img-src 'self' data:"
  document.head.append(policy)
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px'
  root.innerHTML =
    '<svg width="20" height="20"><use href="/test/browser/fixtures/svg-styles/class.svg#icon" width="20" height="20" fill="green"/></svg>'
  document.body.append(root)
  const renderer = createRenderer({ skipFonts: true })
  try {
    const capture = await renderer.capture(root, { pixelRatio: 1 })
    const image = await capture.toImageData()
    expect(
      Array.from(image.data.slice((10 * 20 + 10) * 4, (10 * 20 + 10) * 4 + 4)),
    ).toEqual([0, 128, 0, 255])
    expect(
      capture.diagnostics.filter(
        (item) => item.resource === 'external-svg-style-probe',
      ),
    ).toHaveLength(1)
    capture.dispose()
  } finally {
    renderer.dispose()
    root.remove()
    policy.remove()
  }
})
