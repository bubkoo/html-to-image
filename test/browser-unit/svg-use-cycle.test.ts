import { expect, test } from 'vitest'
import * as api from '../../src'
const moduleURL = '/test/browser/fixtures/svg-use-cycle.mjs'
test('cyclic external uses close a detached source graph without duplicate identities', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  expect(await fixture.checkSVGUseCycle(api)).toEqual({
    symbols: 2,
    requests: 2,
    closedReferences: true,
    sourceUnchanged: true,
  })
})
