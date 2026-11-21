import { expect, test } from 'vitest'
import { toImageData, toSvg } from '../../src'
import { cloneNode } from '../../src/clone-node'

// Regression tests for https://github.com/bubkoo/html-to-image/issues/500
// Since v1.11.12, CSS custom properties (var()) were not resolved when an
// SVG subtree was cloned, so exported images lost colors that referenced
// variables defined outside the SVG (e.g. `:root { --brand: ... }`).

const RED = 'rgb(255, 0, 0)'
const RED_PIXEL = [255, 0, 0, 255]

function pixel(image: ImageData, x: number, y: number) {
  const offset = 4 * (y * image.width + x)
  return Array.from(image.data.slice(offset, offset + 4))
}

async function svgText(node: HTMLElement, options = {}) {
  return fetch(
    await toSvg(node, { skipFonts: true, pixelRatio: 1, ...options }),
  ).then((response) => response.text())
}

function parsedRect(output: string, selector = '[data-sector]') {
  const doc = new DOMParser().parseFromString(output, 'image/svg+xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  return doc.querySelector(selector) as unknown as SVGRectElement
}

function mountChart(innerSVG: string, extraStyle = '') {
  const stylesheet = document.createElement('style')
  stylesheet.textContent = `:root { --brand: rgb(255, 0, 0); } ${extraStyle}`
  document.head.append(stylesheet)
  const chart = document.createElement('div')
  chart.style.cssText = 'width:40px;height:40px'
  chart.innerHTML = `<svg width="40" height="40" viewBox="0 0 40 40">${innerSVG}</svg>`
  document.body.append(chart)
  return { chart, stylesheet }
}

test('issue #500: inline style var(--brand) on an SVG child is resolved in the cloned SVG', async () => {
  const { chart, stylesheet } = mountChart(
    '<rect data-sector x="0" y="0" width="40" height="40" style="fill: var(--brand)"/>',
  )
  try {
    const output = await svgText(chart)
    const rect = parsedRect(output)
    expect(rect.style.fill).toBe(RED)
    expect(rect.getAttribute('style')).toContain(RED)
    expect(rect.getAttribute('style')).not.toContain('var(')

    const image = await toImageData(chart, { skipFonts: true, pixelRatio: 1 })
    expect(pixel(image, 20, 20)).toEqual(RED_PIXEL)
  } finally {
    chart.remove()
    stylesheet.remove()
  }
})

test('issue #500: presentation attribute fill="var(--brand)" is resolved in the cloned SVG', async () => {
  const { chart, stylesheet } = mountChart(
    '<rect data-sector x="0" y="0" width="40" height="40" fill="var(--brand)"/>',
  )
  try {
    const output = await svgText(chart)
    const rect = parsedRect(output)
    // The serialized clone must not keep the unresolved var() reference.
    expect(rect.getAttribute('fill')).toBe(RED)
    expect(rect.style.fill).toBe(RED)

    const image = await toImageData(chart, { skipFonts: true, pixelRatio: 1 })
    expect(pixel(image, 20, 20)).toEqual(RED_PIXEL)
  } finally {
    chart.remove()
    stylesheet.remove()
  }
})

test('issue #500: stylesheet class fill: var(--brand) on an SVG child is resolved', async () => {
  const { chart, stylesheet } = mountChart(
    '<rect data-sector class="issue-500-sector" x="0" y="0" width="40" height="40"/>',
    '.issue-500-sector { fill: var(--brand); }',
  )
  try {
    const output = await svgText(chart)
    const rect = parsedRect(output)
    expect(rect.style.fill).toBe(RED)

    const image = await toImageData(chart, { skipFonts: true, pixelRatio: 1 })
    expect(pixel(image, 20, 20)).toEqual(RED_PIXEL)
  } finally {
    chart.remove()
    stylesheet.remove()
  }
})

test('issue #500: var() defined on an ancestor outside the captured node still resolves', async () => {
  const wrapper = document.createElement('div')
  wrapper.style.setProperty('--brand', RED)
  const chart = document.createElement('div')
  chart.style.cssText = 'width:40px;height:40px'
  chart.innerHTML =
    '<svg width="40" height="40" viewBox="0 0 40 40"><rect data-sector x="0" y="0" width="40" height="40" style="fill: var(--brand)"/></svg>'
  wrapper.append(chart)
  document.body.append(wrapper)
  try {
    const output = await svgText(chart)
    expect(parsedRect(output).style.fill).toBe(RED)

    const image = await toImageData(chart, { skipFonts: true, pixelRatio: 1 })
    expect(pixel(image, 20, 20)).toEqual(RED_PIXEL)
  } finally {
    wrapper.remove()
  }
})

test('issue #500: capturing the <svg> root directly resolves var() and keeps the definition', async () => {
  const stylesheet = document.createElement('style')
  stylesheet.textContent =
    ':root { --brand: rgb(255, 0, 0); } .issue-500-root-sector { fill: var(--brand); }'
  document.head.append(stylesheet)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '40')
  svg.setAttribute('height', '40')
  svg.innerHTML =
    '<rect data-sector class="issue-500-root-sector" x="0" y="0" width="40" height="40"/>'
  document.body.append(svg)
  try {
    const clone = (await cloneNode(
      svg as unknown as HTMLElement,
      {},
      true,
    )) as unknown as SVGSVGElement
    const clonedRect = clone.querySelector(
      '[data-sector]',
    ) as unknown as SVGRectElement
    expect(clonedRect.style.fill).toBe(RED)
    expect(clone.style.getPropertyValue('--brand')).toBe(RED)

    const output = await svgText(svg as unknown as HTMLElement)
    expect(parsedRect(output).style.fill).toBe(RED)

    const image = await toImageData(svg as unknown as HTMLElement, {
      skipFonts: true,
      pixelRatio: 1,
    })
    expect(pixel(image, 20, 20)).toEqual(RED_PIXEL)
  } finally {
    svg.remove()
    stylesheet.remove()
  }
})

test('issue #500: chained and fallback var() references resolve in the cloned SVG', async () => {
  const stylesheet = document.createElement('style')
  stylesheet.textContent =
    ':root { --brand: rgb(255, 0, 0); --alias: var(--brand); }'
  document.head.append(stylesheet)
  const chart = document.createElement('div')
  chart.style.cssText = 'width:40px;height:40px'
  chart.innerHTML =
    '<svg width="40" height="40" viewBox="0 0 40 40">' +
    '<rect data-alias x="0" y="0" width="20" height="40" style="fill: var(--alias)"/>' +
    '<rect data-fallback x="20" y="0" width="20" height="40" style="fill: var(--missing, rgb(0, 128, 0))"/>' +
    '</svg>'
  document.body.append(chart)
  try {
    const output = await svgText(chart)
    expect(parsedRect(output, '[data-alias]').style.fill).toBe(RED)
    expect(parsedRect(output, '[data-fallback]').style.fill).toBe(
      'rgb(0, 128, 0)',
    )

    const image = await toImageData(chart, { skipFonts: true, pixelRatio: 1 })
    expect(pixel(image, 10, 20)).toEqual(RED_PIXEL)
    expect(pixel(image, 30, 20)).toEqual([0, 128, 0, 255])
  } finally {
    chart.remove()
    stylesheet.remove()
  }
})
