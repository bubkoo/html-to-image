import { svgToDataURL, nodeToDataURL } from '../../src/util'

describe('svgToDataURL', () => {
  it('should convert an SVG element to a data URL', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const dataURL = await svgToDataURL(svg)

    expect(dataURL).toContain('data:image/svg+xml;charset=utf-8')
  })
})

describe('nodeToDataURL', () => {
  it('should convert an HTML node to a data URL', async () => {
    const div = document.createElement('div')
    div.textContent = 'Hello, world!'
    const dataURL = await nodeToDataURL(div, 100, 100)

    expect(dataURL).toContain('data:image/svg+xml;charset=utf-8')
  })
})
