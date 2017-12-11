import { svgToDataURL } from './utils'

export default function createSvgDataURL(
  clonedNode: HTMLElement,
  width: number,
  height: number,
): Promise<String> {
  const xmlns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(xmlns, 'svg')
  const foreignObject = document.createElementNS(xmlns, 'foreignObject')

  svg.setAttributeNS(null, 'width', width)
  svg.setAttributeNS(null, 'height', height)

  foreignObject.setAttributeNS(null, 'width', '100%')
  foreignObject.setAttributeNS(null, 'height', '100%')
  foreignObject.setAttributeNS(null, 'x', 0)
  foreignObject.setAttributeNS(null, 'y', 0)
  foreignObject.setAttributeNS(null, 'externalResourcesRequired', 'true')

  svg.appendChild(foreignObject)
  foreignObject.appendChild(clonedNode)

  return svgToDataURL(svg)
}
