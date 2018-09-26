import { svgToDataURL } from './utils'

export default function createSvgDataURL(
  clonedNode: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  const xmlns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(xmlns, 'svg')
  const foreignObject = document.createElementNS(xmlns, 'foreignObject')

  svg.setAttributeNS('', 'width', `${width}`)
  svg.setAttributeNS('', 'height', `${height}`)

  foreignObject.setAttributeNS('', 'width', '100%')
  foreignObject.setAttributeNS('', 'height', '100%')
  foreignObject.setAttributeNS('', 'x', '0')
  foreignObject.setAttributeNS('', 'y', '0')
  foreignObject.setAttributeNS('', 'externalResourcesRequired', 'true')

  svg.appendChild(foreignObject)
  foreignObject.appendChild(clonedNode)

  return svgToDataURL(svg)
}
