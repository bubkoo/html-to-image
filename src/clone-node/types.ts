import type { Options } from '../types'

export type ClonableElement = HTMLElement | SVGElement

export type CloneNode<T extends ClonableElement> = (
  node: T,
  options: Options,
  isRoot?: boolean,
) => Promise<T | null>
