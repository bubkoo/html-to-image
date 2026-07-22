import type { Options } from '../types'
import type { CloneNode } from './types'

export async function cloneIFrameElement(
  iframe: HTMLIFrameElement,
  options: Options,
  cloneNode: CloneNode<HTMLElement>,
) {
  try {
    if (iframe.contentDocument?.body) {
      return (await cloneNode(
        iframe.contentDocument.body,
        options,
        true,
      )) as HTMLElement
    }
  } catch {
    // Failed to clone a cross-origin iframe.
  }

  return iframe.cloneNode(false) as HTMLIFrameElement
}
