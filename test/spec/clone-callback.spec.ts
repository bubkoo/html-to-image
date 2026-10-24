import { cloneNode } from '../../src/clone-node'
import { toSvg } from '../../src/index'

describe('clone node callback', () => {
  it('decorates copied elements after styles and children are cloned', async () => {
    const original = document.createElement('div')
    original.style.color = 'rgb(255, 0, 0)'
    original.innerHTML = '<span>Original text</span>'
    document.body.appendChild(original)
    const seen: HTMLElement[] = []
    try {
      const copy = await cloneNode(original, {
        onCloneNode(source, cloned) {
          expect(cloned).not.toBe(source)
          seen.push(source)
          if (source === original) {
            expect(cloned.style.color).toBe('rgb(255, 0, 0)')
            expect(cloned.querySelector('span')).not.toBeNull()
            cloned.setAttribute('data-capture', 'copy')
          } else {
            cloned.textContent = 'Copied text'
          }
        },
      })
      if (!copy) throw new Error('Expected an element copy')
      expect(seen).toEqual([
        original.firstElementChild as HTMLElement,
        original,
      ])
      expect(copy.getAttribute('data-capture')).toBe('copy')
      expect(copy.textContent).toBe('Copied text')
      expect(original.getAttribute('data-capture')).toBeNull()
      expect(original.textContent).toBe('Original text')
    } finally {
      original.remove()
    }
  })

  it('clones normally when no callback is supplied', async () => {
    const original = document.createElement('div')
    original.textContent = 'Unchanged'
    expect((await cloneNode(original, {}))?.textContent).toBe('Unchanged')
  })

  it('provides copied form values before the callback runs', async () => {
    const original = document.createElement('div')
    const input = document.createElement('input')
    input.value = 'Current input'
    const textarea = document.createElement('textarea')
    textarea.value = 'Current textarea'
    const select = document.createElement('select')
    select.innerHTML =
      '<option value="a">A</option><option value="b">B</option>'
    select.value = 'b'
    original.append(input, textarea, select)
    const seen: HTMLElement[] = []
    await cloneNode(original, {
      onCloneNode(source, copy) {
        seen.push(source)
        if (source === input) {
          expect(copy.getAttribute('value')).toBe('Current input')
        } else if (source === textarea) {
          expect(copy.textContent).toBe('Current textarea')
        } else if (source === select) {
          expect(
            copy.querySelector('[value="b"]')?.hasAttribute('selected'),
          ).toBeTrue()
        }
      },
    })
    expect(seen).toContain(input)
    expect(seen).toContain(textarea)
    expect(seen).toContain(select)
  })

  it('skips filtered elements and text nodes', async () => {
    const original = document.createElement('div')
    const excluded = document.createElement('span')
    const included = document.createElement('span')
    included.textContent = 'Visible'
    original.append(excluded, included, document.createTextNode('Text'))
    const seen: HTMLElement[] = []
    const copy = await cloneNode(original, {
      filter: (node) => node !== excluded,
      onCloneNode(source) {
        seen.push(source)
      },
    })
    expect(seen).toEqual([included, original])
    expect(copy?.children.length).toBe(1)
    expect(copy?.textContent).toBe('VisibleText')
  })

  it('includes callback changes in the public SVG export', async () => {
    const original = document.createElement('div')
    original.textContent = 'Live text'
    const result = await toSvg(original, {
      width: 100,
      height: 40,
      style: { backgroundColor: 'blue' },
      onCloneNode(source, copy) {
        expect(source).toBe(original)
        expect(copy.isConnected).toBeFalse()
        copy.setAttribute('data-capture', 'copy')
        copy.textContent = 'Captured text'
        copy.style.backgroundColor = 'white'
      },
    })
    const xml = decodeURIComponent(result)
    expect(xml).toContain('data-capture="copy"')
    expect(xml).toContain('Captured text')
    expect(xml).toContain('background-color: blue')
    expect(xml).not.toContain('Live text')
    expect(original.textContent).toBe('Live text')
    expect(original.hasAttribute('data-capture')).toBeFalse()
  })

  it('decorates a deep-cloned SVG subtree as a unit', async () => {
    const original = document.createElement('div')
    original.innerHTML = '<svg><rect width="2" height="2"></rect></svg>'
    const seen: HTMLElement[] = []
    const copy = await cloneNode(original, {
      onCloneNode(source, cloned) {
        seen.push(source)
        if (source.tagName.toLowerCase() === 'svg') {
          cloned.querySelector('rect')?.setAttribute('fill', 'red')
        }
      },
    })
    expect(seen.length).toBe(2)
    expect(seen[0].tagName.toLowerCase()).toBe('svg')
    expect(seen[1]).toBe(original)
    expect(copy?.querySelector('rect')?.getAttribute('fill')).toBe('red')
    expect(original.querySelector('rect')?.hasAttribute('fill')).toBeFalse()
  })

  it('rejects the public capture when the callback throws', async () => {
    const original = document.createElement('div')
    await expectAsync(
      toSvg(original, {
        onCloneNode() {
          throw new Error('Callback failed')
        },
      }),
    ).toBeRejectedWithError('Callback failed')
  })

  it('passes the image replacement for a canvas to the callback', async () => {
    const original = document.createElement('canvas')
    original.width = 2
    original.height = 2
    const seen: HTMLElement[] = []
    const copy = await cloneNode(original, {
      onCloneNode(source, cloned) {
        seen.push(source)
        expect(cloned instanceof HTMLImageElement).toBeTrue()
        expect(cloned.isConnected).toBeFalse()
      },
    })
    expect(seen).toEqual([original])
    expect(copy?.tagName).toBe('IMG')
    expect(original.tagName).toBe('CANVAS')
  })
})
