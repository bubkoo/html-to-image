import type { Options } from '../types'
import { fetchResource } from '../fetch'
import { isInstanceOfElement, traverse } from '../util'

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

function getUseHref(use: SVGUseElement) {
  return (
    use.getAttribute('href') ??
    use.getAttribute('xlink:href') ??
    use.getAttributeNS(XLINK_NS, 'href')
  )
}

function setUseHref(use: SVGUseElement, value: string) {
  use.setAttribute('href', value)
  use.setAttributeNS(XLINK_NS, 'xlink:href', value)
}

function splitSvgHref(href: string) {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) {
    return null
  }

  return {
    url: href.slice(0, hashIndex),
    id: href.slice(hashIndex + 1),
  }
}

async function fetchExternalSvgDocument(url: string, options: Options) {
  try {
    const response = await fetchResource(url, undefined, options)
    const document = new DOMParser().parseFromString(
      response.asString(),
      'image/svg+xml',
    )

    if (document.querySelector('parsererror')) {
      console.warn(`Failed to parse external SVG: ${url}`)
      return null
    }

    return document
  } catch (error) {
    console.warn(`Failed to inline external SVG: ${url}`, error)
    return null
  }
}

function normalizeSvgReferences(element: Element) {
  traverse(element, (child) => {
    const href =
      child.getAttribute('href') ??
      child.getAttribute('xlink:href') ??
      child.getAttributeNS(XLINK_NS, 'href')

    if (href) {
      child.setAttribute('href', href)
      child.setAttributeNS(XLINK_NS, 'xlink:href', href)
    }
  })
}

function getReferencedIds(element: Element) {
  const ids = new Set<string>()

  traverse(element, (child) => {
    Array.from(child.attributes).forEach((attribute) => {
      const matches = attribute.value.matchAll(
        /url\(\s*["']?#([^)"'\s]+)["']?\s*\)/g,
      )
      Array.from(matches).forEach((match) => {
        if (match[1]) {
          ids.add(match[1])
        }
      })
    })

    const href =
      child.getAttribute('href') ??
      child.getAttribute('xlink:href') ??
      child.getAttributeNS(XLINK_NS, 'href')
    if (href?.startsWith('#')) {
      ids.add(href.slice(1))
    }
  })

  return ids
}

function collectDefinitionWithDependencies(
  definition: SVGElement,
  ownerDocument: Document,
) {
  const collectedIds = new Set<string>()
  const collectedDefinitions: SVGElement[] = []

  function collect(element: SVGElement) {
    const id = element.getAttribute('id')
    if (id && collectedIds.has(id)) {
      return
    }

    if (id) {
      collectedIds.add(id)
      collectedDefinitions.push(element)
    }

    getReferencedIds(element).forEach((referencedId) => {
      const referencedElement = ownerDocument.getElementById(referencedId)
      if (
        referencedElement &&
        isInstanceOfElement(referencedElement, SVGElement)
      ) {
        collect(referencedElement)
      }
    })
  }

  collect(definition)
  return collectedDefinitions
}

async function fetchSvgDefinitions(href: string, options: Options) {
  const parsed = splitSvgHref(href)
  if (!parsed?.id) {
    return []
  }

  const ownerDocument = parsed.url
    ? await fetchExternalSvgDocument(parsed.url, options)
    : document
  if (!ownerDocument) {
    return []
  }

  const definition = ownerDocument.getElementById(parsed.id)
  if (!definition || !isInstanceOfElement(definition, SVGElement)) {
    return []
  }

  return collectDefinitionWithDependencies(definition, ownerDocument)
}

function ensureSvgDefs(svg: SVGElement) {
  const existingDefs = svg.querySelector<SVGDefsElement>(':scope > defs')
  if (existingDefs) {
    return existingDefs
  }

  const defs = document.createElementNS(SVG_NS, 'defs')
  svg.insertBefore(defs, svg.firstChild)
  return defs
}

export async function cloneSvgElement<T extends SVGElement>(
  node: T,
  options: Options,
): Promise<T> {
  const clone = node.cloneNode(true) as T
  const uses = Array.from(clone.querySelectorAll<SVGUseElement>('use'))
  if (uses.length === 0) {
    return clone
  }

  const processedDefinitions: Record<string, SVGElement> = {}
  await Promise.all(
    uses.map(async (use) => {
      const href = getUseHref(use)
      const parsed = href ? splitSvgHref(href) : null
      if (!href || !parsed?.id) {
        return
      }

      const localSelector = `#${CSS.escape(parsed.id)}`
      if (
        clone.querySelector(localSelector) ||
        processedDefinitions[parsed.id]
      ) {
        setUseHref(use, `#${parsed.id}`)
        return
      }

      const definitions = await fetchSvgDefinitions(href, options)
      definitions.forEach((definition) => {
        const id = definition.getAttribute('id')
        if (!id || processedDefinitions[id]) {
          return
        }

        const clonedDefinition = definition.cloneNode(true) as SVGElement
        normalizeSvgReferences(clonedDefinition)
        processedDefinitions[id] = clonedDefinition
      })

      setUseHref(use, `#${parsed.id}`)
    }),
  )

  const definitions = Object.values(processedDefinitions)
  if (definitions.length > 0) {
    const defs = ensureSvgDefs(clone)
    definitions.forEach((definition) => defs.appendChild(definition))
  }

  normalizeSvgReferences(clone)
  return clone
}
