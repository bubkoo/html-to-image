import { expect, test, vi } from 'vitest'
import { detectSVGStylePolicy } from '../../src/svg-style-scope'
import { createRenderer } from '../../src'

const moduleURL = '/test/browser/fixtures/svg-native-styles.mjs'

test('an expired optional import probe preserves measured base SVG capabilities', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  const native = await fixture.readNativeSVGFixturePolicy()
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px'
  root.innerHTML =
    '<svg width="20" height="20"><use href="/test/browser/fixtures/svg-styles/class.svg#icon" width="20" height="20" fill="red"/></svg>'
  document.body.append(root)
  const source = root.outerHTML
  const frames = Array.from(document.querySelectorAll('iframe'))
  const renderer = createRenderer({ pixelRatio: 1, skipFonts: true })
  const errors: unknown[] = []
  let clock = Date.now()
  const now = vi.spyOn(Date, 'now').mockImplementation(() => {
    clock += 6000
    return clock
  })
  try {
    const policy = await detectSVGStylePolicy(
      document,
      () => {},
      (error) => errors.push(error),
    )
    expect({
      file: policy.file,
      page: policy.page,
      whole: policy.whole,
    }).toEqual(native)
    if (native.file) {
      expect(policy.dataImports).toBe(false)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatchObject({
        message: 'Native SVG data-import probe did not become ready',
      })
    } else expect(errors).toHaveLength(0)
    const capture = await renderer.capture(root)
    const image = await capture.toImageData()
    expect(
      Array.from(image.data.slice((10 * 20 + 10) * 4, (10 * 20 + 10) * 4 + 4)),
    ).toEqual(native.file ? [0, 128, 0, 255] : [255, 0, 0, 255])
    expect(
      capture.diagnostics.filter(
        (item) => item.resource === 'external-svg-style-import-probe',
      ),
    ).toHaveLength(native.file ? 1 : 0)
    expect(root.outerHTML).toBe(source)
    expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
  } finally {
    now.mockRestore()
    renderer.dispose()
    root.remove()
  }
})
