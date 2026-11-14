import { expect, test } from 'vitest'
import { commands, server } from 'vitest/browser'
import * as api from '../../src'
import type { ResourceKind } from '../../src/types'

const moduleURL = '/test/browser/fixtures/svg-data-imports.mjs'
test.each([
  'basic',
  'nested',
  'media-active',
  'media-inactive',
  'supports-active',
  'supports-inactive',
  'layer',
  'layer-only',
  'layer-inline',
  'layer-inline-only',
  'wrong-mime',
  'style-type',
  'supports-header',
  'charset-header',
  'charset-rule',
  'charset-bom',
  'charset-utf16',
  'charset-invalid',
  'invalid-data',
  'paint-fragment',
  'paint-relative',
])('external SVG data CSS import %s preserves native pixels', async (name) => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  const result = await fixture.checkSVGDataImports(
    api,
    name,
    async (id: string) => {
      const png = await commands.screenshotScrollSource('#' + id)
      const image = new Image()
      image.src = 'data:image/png;base64,' + png
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d')!.drawImage(image, 0, 0)
      return canvas
        .getContext('2d')!
        .getImageData(0, 0, canvas.width, canvas.height)
    },
    (record: object) =>
      commands.recordScrollbarBoxEvidence(
        JSON.stringify({ ...record, engine: server.browser }),
      ),
  )
  expect(result.fullPixelMatch).toBe(true)
  expect(result.sourceUnchanged).toBe(true)
  const policy = await fixture.getSVGDataImportFixturePolicy()
  if (name === 'paint-relative')
    expect(
      result.requests.some((request: { url: string }) =>
        request.url.includes('/paint-target.svg'),
      ),
    ).toBe(false)
  const inactive = [
    'media-inactive',
    'supports-inactive',
    'style-type',
    'supports-header',
    'layer-inline',
    'layer-inline-only',
  ].includes(name)
  const layered =
    ['layer', 'layer-only'].includes(name) && policy.importLayers === 'none'
  const expected =
    policy.imports && !inactive && !layered ? (name === 'nested' ? 2 : 1) : 0
  expect(
    result.requests.filter(
      (request: { kind: ResourceKind }) => request.kind === 'stylesheet',
    ),
  ).toHaveLength(expected)
  if (name === 'invalid-data' && policy.imports)
    expect(
      result.diagnostics.some((item: { resource?: string }) =>
        item.resource?.startsWith('data:text/css'),
      ),
    ).toBe(true)
})
