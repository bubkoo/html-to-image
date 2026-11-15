import { expect, test, vi } from 'vitest'
import {
  createSVGStyleEnvironment,
  detectSVGFragmentPolicy,
  detectSVGStylePolicy,
} from '../../src/svg-style-scope'

test('cancelled fragment probes preserve the reason and release owned nodes and URL', async () => {
  const frames = Array.from(document.querySelectorAll('iframe')),
    environment = createSVGStyleEnvironment(document)
  try {
    const target = await environment.getDocument(true),
      markup = target.documentElement.outerHTML
    const create = vi.spyOn(URL, 'createObjectURL'),
      revoke = vi.spyOn(URL, 'revokeObjectURL'),
      reason = new Error('owned fragment probe cancellation')
    await expect(
      detectSVGFragmentPolicy(target, () => {
        throw reason
      }),
    ).rejects.toBe(reason)
    expect(target.documentElement.outerHTML).toBe(markup)
    expect(create).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith(create.mock.results[0].value)
  } finally {
    vi.restoreAllMocks()
    environment.dispose()
  }
  expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
})

test('invalid fragment hit controls preserve measured base stylesheet policy with a diagnostic', async () => {
  const frames = Array.from(document.querySelectorAll('iframe')),
    environment = createSVGStyleEnvironment(document)
  try {
    const target = await environment.getDocument(true),
      expected = await detectSVGStylePolicy(target, () => {}),
      markup = target.documentElement.outerHTML
    const now = Date.now
    let expired = false
    vi.spyOn(target, 'elementFromPoint').mockImplementation(() => {
      expired = true
      return null
    })
    vi.spyOn(Date, 'now').mockImplementation(() => now() + (expired ? 6000 : 0))
    const errors: unknown[] = []
    const actual = await detectSVGStylePolicy(
      target,
      () => {},
      undefined,
      (error) => errors.push(error),
    )
    expect(actual.fragment).toBeUndefined()
    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toMatch(/fragment scope clipping controls/)
    expect({
      file: actual.file,
      page: actual.page,
      whole: actual.whole,
    }).toEqual({
      file: expected.file,
      page: expected.page,
      whole: expected.whole,
    })
    expect(target.documentElement.outerHTML).toBe(markup)
  } finally {
    vi.restoreAllMocks()
    environment.dispose()
  }
  expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
})

test('a tiny fragment viewport exits without leaking a URL or changing the private document', async () => {
  const frames = Array.from(document.querySelectorAll('iframe')),
    environment = createSVGStyleEnvironment(document)
  try {
    const target = await environment.getDocument(true),
      frame = target.defaultView!.frameElement as HTMLIFrameElement
    frame.style.setProperty('width', '10px', 'important')
    expect(target.defaultView!.innerWidth).toBeLessThan(16)
    const markup = target.documentElement.outerHTML,
      create = vi.spyOn(URL, 'createObjectURL')
    await expect(detectSVGFragmentPolicy(target, () => {})).rejects.toThrow(
      /larger active viewport/,
    )
    expect(create).not.toHaveBeenCalled()
    expect(target.documentElement.outerHTML).toBe(markup)
  } finally {
    vi.restoreAllMocks()
    environment.dispose()
  }
  expect(Array.from(document.querySelectorAll('iframe'))).toEqual(frames)
})
