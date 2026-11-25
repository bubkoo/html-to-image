import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/root-layout.mjs'

async function readNative(id: string) {
  const png = await commands.screenshotScrollSource('#' + id)
  const image = new Image()
  image.src = 'data:image/png;base64,' + png
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

const nativeCases = [
  'zero-margin',
  'margin-top16',
  'margin-left16',
  'margin-top-left16',
  'margin-auto-horizontal',
  'margin-auto-flex',
  'margin-left-percentage',
  'margin-top-percentage',
  'collapse-through-parent',
  'collapsed-child-zero-root-margin',
  'collapsed-child-root-margin16',
  'contained-child-margin-control',
  'negative-margin-control',
  'columns',
  'content-visibility-hidden',
  'content-visibility-auto',
  'flex-through-contents',
  'grid-item',
  'contained-relative-child',
  'empty-prefix',
  'fieldset-content',
  'important-root',
  'important-child',
  'nested-fieldset',
  'zero-height-image',
  'nonzero-bottom',
  'selected-logical-bottom',
  'selected-priority-bottom',
  'policy-logical-bottom',
]

nativeCases.forEach((kind) => {
  test(`root layout ${kind} matches its source border box`, async () => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkRootLayout(api, kind, readNative)
    expect(result.sourceUnchanged).toBe(true)
    expect(result.differentChannels).toBe(0)
    if (kind.endsWith('-bottom')) expect(result.preservedBottom).toBe('12px')
    if (kind === 'selected-priority-bottom')
      expect(result.preservedPriority).toBe('important')
    if (kind === 'policy-logical-bottom')
      expect(result.policyCalls).toEqual([1, 1, 1])
  })
})

const intents = [
  'style-margin',
  'clone-margin',
  'node-margin',
  'style-zero',
  'transform-scale(0.5)',
  'transform-scale(2)',
  'transform-translateX(8px)',
  'border-dimensions',
  'clone-zero',
  'node-zero',
  'style-logical',
  'clone-logical',
  'node-logical',
  'child-physical',
  'child-logical',
  'child-logical-zero-root',
  'clone-physical-important',
  'clone-new-style',
]

intents.forEach((kind) => {
  test(`root layout preserves explicit ${kind}`, async () => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkRootLayoutIntent(
      api,
      kind,
      readNative,
      async (record: unknown) => {
        await commands.recordScrollbarBoxEvidence(JSON.stringify(record))
      },
    )
    expect(result.sourceUnchanged).toBe(true)
    expect(result.differentChannels).toBe(0)
    expect(result.alphaDifferentPixels).toBe(0)
    if (kind.endsWith('margin')) expect(result.topLeftAlpha).toBe(0)
  })
})
