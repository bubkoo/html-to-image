import { cloneNode } from '../../src/clone-node'
import { toSvg } from '../../src/index'
import type { Options } from '../../src/types'

describe('per-node style property selection', () => {
  it('uses each element selection without leaking it to siblings or descendants', async () => {
    const original = document.createElement('div')
    const stylesheet = document.createElement('style')
    stylesheet.textContent =
      '.node-style-root{width:120px;height:64px;color:red}.node-style-child{height:32px;color:green}.node-style-leaf{color:blue}'
    document.head.appendChild(stylesheet)
    original.className = 'node-style-root'
    original.innerHTML =
      '<div class="node-style-child"><span class="node-style-leaf">Text</span></div>'
    document.body.appendChild(original)
    const child = original.firstElementChild as HTMLElement
    try {
      const copy = await cloneNode(original, {
        stylePropertiesForNode(node) {
          if (node === original) return ['width']
          if (node === child) return ['height']
          return undefined
        },
      })
      if (!copy) throw new Error('Expected an element copy')
      const clonedChild = copy.firstElementChild as HTMLElement
      const clonedLeaf = clonedChild.firstElementChild as HTMLElement
      expect(copy.style.width).toBe('120px')
      expect(copy.style.color).toBe('')
      expect(clonedChild.style.height).toBe('32px')
      expect(clonedChild.style.color).toBe('')
      expect(clonedLeaf.style.color).toBe('rgb(0, 0, 255)')
      expect(getComputedStyle(original).color).toBe('rgb(255, 0, 0)')
    } finally {
      original.remove()
      stylesheet.remove()
    }
  })

  it('supports an empty selection and restores full styles for undefined', async () => {
    const original = document.createElement('div')
    const stylesheet = document.createElement('style')
    stylesheet.textContent = '.node-style-empty{width:120px}'
    document.head.appendChild(stylesheet)
    original.className = 'node-style-empty'
    document.body.appendChild(original)
    try {
      const empty = await cloneNode(original, {
        stylePropertiesForNode: () => [],
      })
      expect(empty?.style.width).toBe('')
      const full = await cloneNode(original, {
        includeStyleProperties: ['color'],
        stylePropertiesForNode: () => undefined,
      })
      expect(full?.style.width).toBe('120px')
    } finally {
      original.remove()
      stylesheet.remove()
    }
  })

  it('honors selections when computed styles expose cssText, including pseudos', async () => {
    const original = document.createElement('div')
    const stylesheet = document.createElement('style')
    stylesheet.textContent =
      '.node-style-css-text{color:red;width:120px}.node-style-css-text::before{content:"Pseudo";color:green;width:40px}'
    original.className = 'node-style-css-text'
    document.head.appendChild(stylesheet)
    document.body.appendChild(original)
    const readStyle = window.getComputedStyle.bind(window)
    spyOn(window, 'getComputedStyle').and.callFake((node, pseudo) => {
      const style = readStyle(node, pseudo)
      if (node === original) {
        Object.defineProperty(style, 'cssText', {
          configurable: true,
          value: pseudo
            ? 'content: "Pseudo"; color: rgb(0, 128, 0); width: 40px;'
            : 'color: rgb(255, 0, 0); width: 120px;',
        })
      }
      return style
    })
    try {
      const selected = await cloneNode(original, {
        stylePropertiesForNode: () => ['color', 'content'],
      })
      expect(selected?.style.color).toBe('rgb(255, 0, 0)')
      expect(selected?.style.width).toBe('')
      const pseudo = selected?.querySelector('style')?.textContent
      expect(pseudo).toContain('color: rgb(0, 128, 0)')
      expect(pseudo).not.toContain('width:')
      const empty = await cloneNode(original, {
        stylePropertiesForNode: () => [],
      })
      expect(empty?.style.color).toBe('')
      expect(empty?.style.width).toBe('')
      expect(empty?.querySelector('style')?.textContent).not.toContain('color:')
      const full = await cloneNode(original, {
        includeStyleProperties: ['height'],
        stylePropertiesForNode: () => undefined,
      })
      expect(full?.style.width).toBe('120px')
      expect(full?.querySelector('style')?.textContent).toContain('width: 40px')
    } finally {
      original.remove()
      stylesheet.remove()
    }
  })

  it('does not mutate shared options or selection arrays', async () => {
    const original = document.createElement('div')
    original.innerHTML = '<span>Child</span>'
    const shared = ['height']
    const selected = ['color']
    Object.freeze(shared)
    Object.freeze(selected)
    const options: Options = Object.freeze({
      includeStyleProperties: shared,
      stylePropertiesForNode: () => selected,
    })
    await cloneNode(original, options)
    expect(options.includeStyleProperties).toBe(shared)
    expect(shared).toEqual(['height'])
    expect(selected).toEqual(['color'])
  })

  it('preserves original inline styles for an empty selection', async () => {
    const original = document.createElement('div')
    original.style.width = '20px'
    const copy = await cloneNode(original, {
      stylePropertiesForNode: () => [],
    })
    expect(copy?.style.width).toBe('20px')
    expect(original.style.width).toBe('20px')
  })

  it('uses per-element selection in the public SVG export', async () => {
    const original = document.createElement('div')
    const stylesheet = document.createElement('style')
    stylesheet.textContent =
      '.node-style-export{color:red}.node-style-export span{color:green}'
    original.className = 'node-style-export'
    original.innerHTML = '<span>Child</span>'
    document.head.appendChild(stylesheet)
    document.body.appendChild(original)
    try {
      const svg = await toSvg(original, {
        width: 100,
        height: 40,
        skipFonts: true,
        stylePropertiesForNode: (node) => (node === original ? ['color'] : []),
      })
      const xml = decodeURIComponent(svg.slice(svg.indexOf(',') + 1))
      const doc = new DOMParser().parseFromString(xml, 'image/svg+xml')
      expect(doc.querySelector('div')?.getAttribute('style')).toContain(
        'color: rgb(255, 0, 0)',
      )
      expect(
        doc.querySelector('span')?.getAttribute('style') ?? '',
      ).not.toContain('color:')
      expect(original.hasAttribute('style')).toBeFalse()
      expect(original.querySelector('span')?.hasAttribute('style')).toBeFalse()
    } finally {
      original.remove()
      stylesheet.remove()
    }
  })

  it('rejects a capture when the selector throws', async () => {
    await expectAsync(
      toSvg(document.createElement('div'), {
        stylePropertiesForNode() {
          throw new Error('Selection failed')
        },
      }),
    ).toBeRejectedWithError('Selection failed')
  })
})
