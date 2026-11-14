import { expect, test, vi } from 'vitest'
import { ResourceLoader } from '../../src/resource-loader'

test.each([false, true])(
  'redirect metadata keeps semantic URLs and cached identity with cacheBust=%s',
  async (cacheBust) => {
    const base = new URL(
      '/test/browser/svg-response-url/' + crypto.randomUUID() + '/',
      location.href,
    )
    const url = new URL(
      'chain.svg?token=original&_htmlToImage=caller#icon',
      base,
    ).href
    const expected = new URL(
      'assets/sprite.svg?token=original&_htmlToImage=caller',
      base,
    ).href
    const loader = new ResourceLoader(
      { cacheBust },
      { signal: new AbortController().signal },
    )
    expect(loader.responseURL(url, 'image', 'image/svg+xml')).toBe(url)
    const first = loader.load(url, 'image', 'image/svg+xml')
    expect(loader.load(url, 'image', 'image/svg+xml')).toBe(first)
    const blob = await first
    expect(await blob.text()).toContain('stop-color="green"')
    expect(loader.responseURL(url, 'image', 'image/svg+xml')).toBe(expected)
    expect(loader.responseURL(url, 'stylesheet', 'text/css')).toBe(url)
    loader.clear()
    expect(loader.responseURL(url, 'image', 'image/svg+xml')).toBe(url)
    expect(loader.load(url, 'image', 'image/svg+xml')).not.toBe(first)
    await loader.load(url, 'image', 'image/svg+xml')
    loader.clear()
  },
)

test('custom resolvers sharing a Blob retain each requested base', async () => {
  const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' })
  const resolver = vi.fn(() => blob)
  const loader = new ResourceLoader(
    { resources: { resolve: resolver } },
    { signal: new AbortController().signal },
  )
  const first = 'https://custom.invalid/one/source.svg',
    second = 'https://custom.invalid/two/source.svg'
  expect(await loader.load(first, 'image')).toBe(blob)
  expect(await loader.load(second, 'image')).toBe(blob)
  expect(loader.responseURL(first, 'image')).toBe(first)
  expect(loader.responseURL(second, 'image')).toBe(second)
  expect(resolver).toHaveBeenCalledTimes(2)
  loader.clear()
})

test('query-omitting legacy cache keeps metadata with the bytes actually reused', async () => {
  const base = new URL(
    '/test/browser/svg-response-url/' + crypto.randomUUID() + '/',
    location.href,
  )
  const first = new URL('entry.svg?token=one', base).href,
    second = new URL('entry.svg?token=two', base).href
  const loader = new ResourceLoader(
    { includeQueryParams: false },
    { signal: new AbortController().signal },
  )
  const pending = loader.load(first, 'image')
  expect(loader.load(second, 'image')).toBe(pending)
  await pending
  expect(loader.responseURL(second, 'image')).toBe(
    new URL('assets/sprite.svg?token=one', base).href,
  )
  loader.clear()
})

test('clearing an in-flight fetch does not restore stale response metadata', async () => {
  let release!: (response: Response) => void
  const response = new Response('<svg/>', {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
  Object.defineProperty(response, 'url', {
    value: 'https://final.invalid/assets/source.svg',
  })
  vi.spyOn(window, 'fetch').mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  const url = 'https://requested.invalid/source.svg'
  const loader = new ResourceLoader(
    {},
    { signal: new AbortController().signal },
  )
  const pending = loader.load(url, 'image')
  loader.clear()
  release(response)
  await pending
  expect(loader.responseURL(url, 'image')).toBe(url)
})

test('failed HTTP loads leave no response base and remain retryable', async () => {
  const url = new URL(
    '/test/browser/svg-response-url/' + crypto.randomUUID() + '/missing.svg',
    location.href,
  ).href
  const loader = new ResourceLoader(
    {},
    { signal: new AbortController().signal },
  )
  const first = loader.load(url, 'image')
  await expect(first).rejects.toThrow(/404/)
  expect(loader.responseURL(url, 'image')).toBe(url)
  const second = loader.load(url, 'image')
  expect(second).not.toBe(first)
  await expect(second).rejects.toThrow(/404/)
  loader.clear()
})
