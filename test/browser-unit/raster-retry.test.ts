import { expect, test } from 'vitest'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/raster-retry.mjs'

test('real embedded font retries agree with a fresh SVG decoding', async () => {
  const fixture = await import(/* @vite-ignore */ moduleURL)
  const result = await fixture.checkRasterRetryFont(api)
  expect(result.differentChannels).toBe(0)
  expect(result.sourceUnchanged).toBe(true)
})

test.each(['retry', 'single', 'healthy'])(
  'raster retry %s keeps frozen pixels and bounded attempts',
  async (mode) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const result = await fixture.checkRasterRetry(api, mode)
    expect(result.clones).toBe(1)
    expect(result.frozenUnchanged).toBe(true)
  },
)
