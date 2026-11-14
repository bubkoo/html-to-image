import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import * as api from '../../src'
import type { Options } from '../../src/types'

const moduleURL = '/test/browser/fixtures/svg-data-imports.mjs'

test.each(['cycle', 'reject', 'http-child', 'opaque-relative'])(
  'SVG data import %s retains resource ownership and isolation',
  async (mode) => {
    const fixture = await import(/* @vite-ignore */ moduleURL)
    const policy = await fixture.getSVGDataImportFixturePolicy()
    const marker = 'svg-import-safety-' + crypto.randomUUID()
    const httpURL = new URL(
      (mode === 'opaque-relative'
        ? '/test/browser/fixtures/svg-data-imports/paint-target.svg?scope='
        : '/test/browser/fixtures/svg-styles/unrelated.css?scope=') + marker,
      location.href,
    ).href
    const reason = new Error('owned CSS resolver rejection')
    const calls: string[] = []
    const options: Options = {
      resources: {
        resolve: ({ url, kind }) => {
          if (kind !== 'stylesheet') return undefined
          calls.push(url)
          if (mode === 'reject') throw reason
          if (mode === 'opaque-relative') {
            const target = new URL(httpURL)
            return new Blob(
              [
                `.shape{fill:url("${target.pathname + target.search}#paint") green!important}`,
              ],
              { type: 'text/css' },
            )
          }
          const target = mode === 'cycle' ? url : httpURL
          return new Blob(
            [`@import url("${target}");.shape{fill:green!important}`],
            { type: 'text/css' },
          )
        },
      },
    }
    const frames = Array.from(document.querySelectorAll('iframe'))
    const trace = mode === 'http-child' || mode === 'opaque-relative'
    if (trace) await commands.startSVGStyleResourceTrace(marker)
    let stopped = false
    try {
      const result = fixture.checkSVGDataImports(
        api,
        'basic',
        undefined,
        undefined,
        options,
      )
      if (mode === 'reject' && policy.imports)
        await expect(result).rejects.toMatchObject({ cause: reason })
      else expect((await result).fullPixelMatch).toBe(true)
      expect(calls).toHaveLength(policy.imports ? 1 : 0)
      if (trace) {
        const control = new URL(httpURL)
        control.searchParams.set('control', '1')
        await fetch(control, { cache: 'no-store' })
        const network = await commands.endSVGStyleResourceTrace(marker)
        stopped = true
        expect(network).toEqual([control.pathname + control.search])
      }
      expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
    } finally {
      if (trace && !stopped) await commands.endSVGStyleResourceTrace(marker)
    }
  },
)
