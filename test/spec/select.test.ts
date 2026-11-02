import './setup'
import pixelmatch from 'pixelmatch'
import { toPng, toSvg } from '../../src'
import { bootstrap, drawDataUrl, getSvgDocument } from './helper'

describe('work with select element', () => {
  ;['first', 'second', 'third'].forEach((text) => {
    it(`should capture ${text} selected option`, async () => {
      const node = await bootstrap(
        `select/${text}-option.html`,
        'select/style.css',
      )
      const svg = await getSvgDocument(await toSvg(node))
      expect(svg.querySelector('option[selected]')?.textContent).toBe(text)

      const pixels = await drawDataUrl(await toPng(node))
      expect(
        pixels.data.some((value, index) => index % 4 === 3 && value > 0),
      ).toBe(true)
    })
  })

  it('captures a runtime selection change in the SVG and pixels', async () => {
    const node = await bootstrap(
      'select/second-option.html',
      'select/style.css',
    )
    const select = node.querySelector('select')!
    const before = await drawDataUrl(await toPng(node))

    select.selectedIndex = 2
    const svg = await getSvgDocument(await toSvg(node))
    expect(svg.querySelectorAll('option[selected]').length).toBe(1)
    expect(svg.querySelector('option[selected]')?.textContent).toBe('third')
    expect(select.selectedIndex).toBe(2)

    const after = await drawDataUrl(await toPng(node))
    expect(
      pixelmatch(before.data, after.data, null, before.width, before.height, {
        threshold: 0.1,
      }),
    ).toBeGreaterThan(10)
  })

  it('keeps the selected option when values are duplicated', async () => {
    const node = await bootstrap(
      'select/second-option.html',
      'select/style.css',
    )
    node.innerHTML =
      '<select><option value="same">first</option><option value="same">second</option></select>'
    const select = node.querySelector('select')!
    select.selectedIndex = 1

    const svg = await getSvgDocument(await toSvg(node))
    expect(svg.querySelectorAll('option[selected]').length).toBe(1)
    expect(svg.querySelector('option[selected]')?.textContent).toBe('second')
  })

  it('keeps the selected option when an earlier option is filtered out', async () => {
    const node = await bootstrap(
      'select/second-option.html',
      'select/style.css',
    )
    const select = node.querySelector('select')!
    select.selectedIndex = 2

    const svg = await getSvgDocument(
      await toSvg(node, {
        filter: (element) => element.textContent !== 'first',
      }),
    )
    expect(svg.querySelectorAll('option').length).toBe(2)
    expect(svg.querySelector('option[selected]')?.textContent).toBe('third')
  })
})
