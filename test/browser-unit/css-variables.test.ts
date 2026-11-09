import { expect, test, vi } from 'vitest'
import { toImageData, toSvg } from '../../src'
import { cloneNode } from '../../src/clone-node'

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

test.each(['shadow child', 'slotted child'])(
  '%s inherits a CSS variable from its copied host',
  async (placement) => {
    const host = document.createElement('div')
    host.style.cssText = 'width:20px;height:20px;--fill:rgb(0,128,0)'
    const shadow = host.attachShadow({ mode: 'open' })
    const child = document.createElement('div')
    child.style.cssText = 'width:20px;height:20px;background:var(--fill)'
    if (placement === 'slotted child') {
      shadow.append(document.createElement('slot'))
      host.append(child)
    } else {
      shadow.append(child)
    }
    document.body.append(host)

    try {
      const options = { skipFonts: true, pixelRatio: 1 }
      const output = await fetch(await toSvg(host, options)).then((response) =>
        response.text(),
      )
      expect((output.match(/--fill:/g) || []).length).toBe(1)
      const image = await toImageData(host, options)
      expect(pixel(image, 10, 10)).toEqual([0, 128, 0, 255])
      expect(child.style.getPropertyValue('--fill')).toBe('')
    } finally {
      host.remove()
    }
  },
)

test('a detached document keeps its own CSS variables', async () => {
  const sourceDocument = document.implementation.createHTMLDocument('capture')
  const root = sourceDocument.createElement('div')
  root.style.setProperty('--fill', 'rgb(0,128,0)')
  const child = sourceDocument.createElement('div')
  root.append(child)
  sourceDocument.body.append(root)

  const copy = await cloneNode(root, {}, true)
  expect(copy?.style.getPropertyValue('--fill')).toBe('rgb(0,128,0)')
  expect(
    (copy?.firstElementChild as HTMLElement).style.getPropertyValue('--fill'),
  ).toBe('')

  const orphan = sourceDocument.createElement('div')
  orphan.style.setProperty('--fill', 'blue')
  const orphanCopy = await cloneNode(orphan, {}, false)
  expect(orphanCopy?.style.getPropertyValue('--fill')).toBe('blue')
})

test('siblings reuse parent CSS variable reads within a capture', async () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:20px;--fill:rgb(0,128,0)'
  for (let i = 0; i < 20; i += 1) {
    const child = document.createElement('div')
    child.style.cssText = 'width:20px;height:2px;background:var(--fill)'
    root.append(child)
  }
  document.body.append(root)

  const getComputedStyle = window.getComputedStyle.bind(window)
  let reads = 0
  const spy = vi
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element, pseudo) => {
      const style = getComputedStyle(element, pseudo)
      if (element !== root || pseudo) return style
      return new Proxy(style, {
        get(target, property) {
          if (property === 'getPropertyValue') {
            return (name: string) => {
              if (name === '--fill') reads += 1
              return target.getPropertyValue(name)
            }
          }
          const value = Reflect.get(target, property, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })

  try {
    const first = await fetch(await toSvg(root, { skipFonts: true })).then(
      (response) => response.text(),
    )
    expect(first).toContain('rgb(0, 128, 0)')
    expect(reads).toBeLessThanOrEqual(2)

    root.style.setProperty('--fill', 'rgb(0,0,255)')
    reads = 0
    const second = await fetch(await toSvg(root, { skipFonts: true })).then(
      (response) => response.text(),
    )
    expect(second).toContain('rgb(0, 0, 255)')
    expect(reads).toBeLessThanOrEqual(2)
  } finally {
    spy.mockRestore()
    root.remove()
  }
})
