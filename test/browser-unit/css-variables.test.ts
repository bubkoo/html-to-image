import { expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'

function pixel(image: ImageData, x: number, y: number) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4))
}

test('inherited CSS variables are serialized once and overrides stay local', async () => {
  const stylesheet = document.createElement('style')
  stylesheet.textContent = '.capture-variable-override { --fill:rgb(255,0,0) }'
  document.head.append(stylesheet)
  const root = document.createElement('div')
  root.dataset.variableRoot = ''
  root.style.cssText =
    'display:flex;width:40px;height:20px;--fill:rgb(0,128,0);--unused:4px'
  const inherited = document.createElement('div')
  inherited.dataset.variableInherited = ''
  inherited.style.cssText = 'width:20px;height:20px;background:var(--fill)'
  const overridden = document.createElement('div')
  overridden.dataset.variableOverridden = ''
  overridden.className = 'capture-variable-override'
  overridden.style.cssText = 'width:20px;height:20px;background:var(--fill)'
  root.append(inherited, overridden)
  document.body.append(root)

  try {
    const options = { skipFonts: true, pixelRatio: 1 }
    const output = await fetch(await toSvg(root, options)).then((response) =>
      response.text(),
    )
    const svg = new DOMParser().parseFromString(output, 'image/svg+xml')
    expect(svg.querySelector('parsererror')).toBeNull()
    const copiedRoot = svg.querySelector('[data-variable-root]')!
    const copiedInherited = svg.querySelector('[data-variable-inherited]')!
    const copiedOverridden = svg.querySelector('[data-variable-overridden]')!
    expect(copiedRoot.getAttribute('style')).toContain('--unused: 4px')
    expect(copiedInherited.getAttribute('style')).not.toContain('--fill:')
    expect(copiedInherited.getAttribute('style')).not.toContain('--unused:')
    expect(copiedOverridden.getAttribute('style')).toContain('--fill:')
    expect(copiedOverridden.getAttribute('style')).not.toContain('--unused:')

    const image = await toImageData(root, options)
    expect(pixel(image, 10, 10)).toEqual([0, 128, 0, 255])
    expect(pixel(image, 30, 10)).toEqual([255, 0, 0, 255])
    expect(inherited.style.getPropertyValue('--fill')).toBe('')
    expect(overridden.style.getPropertyValue('--fill')).toBe('')

    const selected = await fetch(
      await toSvg(root, {
        skipFonts: true,
        includeStyleProperties: ['--fill'],
      }),
    ).then((response) => response.text())
    const selectedCopy = new DOMParser()
      .parseFromString(selected, 'image/svg+xml')
      .querySelector('[data-variable-inherited]')!
    expect(selectedCopy.getAttribute('style')).toContain('--fill:')
  } finally {
    root.remove()
    stylesheet.remove()
  }
})
