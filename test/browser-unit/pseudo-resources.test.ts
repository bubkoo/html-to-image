import { expect, test } from 'vitest'
import * as api from '../../src'

const moduleURL = '/test/browser/fixtures/pseudo-resources.mjs'

;[true, false].forEach((skipFonts) => {
  test(`generated and injected style rules embed images with skipFonts=${skipFonts}`, async () => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    expect(await fixture.checkPseudoResources(api, { skipFonts })).toEqual({
      backgrounds: true,
      injectedMask: true,
      libraryRequests: 1,
      sourceUnchanged: true,
    })
  })
})
