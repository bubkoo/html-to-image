import { expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'

test('HTML comments cannot invalidate the exported SVG', async () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;height:20px;background:red'
  root.append(document.createElement('span'))
  const valid = document.createComment('ordinary comment')
  const invalid = document.createComment('bad -- XML comment')
  root.append(valid, invalid)
  document.body.append(root)

  try {
    const options = { skipFonts: true, pixelRatio: 1 }
    const serialized = await fetch(await toSvg(root, options)).then(
      (response) => response.text(),
    )
    const svg = new DOMParser().parseFromString(serialized, 'image/svg+xml')
    expect(svg.querySelector('parsererror')).toBeNull()
    expect(serialized).not.toContain('<!--')
    const image = await toImageData(root, options)
    expect(Array.from(image.data.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(root.childNodes[1]).toBe(valid)
    expect(root.childNodes[2]).toBe(invalid)
  } finally {
    root.remove()
  }
})
