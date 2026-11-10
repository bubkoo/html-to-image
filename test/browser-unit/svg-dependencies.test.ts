import { expect, test } from 'vitest'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/svg-dependencies.mjs'

test('external SVG dependency graphs preserve scoped references and resources', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  expect(await fixture.checkSVGDependencies(api)).toEqual({
    nested: true,
    collision: true,
    relativeImage: true,
    filterImage: true,
    wholeDocument: true,
    emptyReference: true,
    excluded: true,
    crossFile: true,
    overlap: true,
    cycle: true,
    frozen: true,
    sourceUnchanged: true,
  })
})
