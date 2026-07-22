import { Cache } from '../../src'
import { fetchResource } from '../../src/fetch'

describe('resource cache', () => {
  it('does not retain resources unless a cache is provided', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(
        new Response(String(input), {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    const first = await fetchResource('/uncached.txt', undefined, {})
    first.asString()
    const second = await fetchResource('/uncached.txt', undefined, {})
    second.asString()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('reuses a cached string response', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(
        new Response(String(input), {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )
    const cache = new Cache()

    const first = await fetchResource('/asset.txt?version=1', undefined, {
      cache,
    })
    expect(first.asString()).toContain('version=1')

    const second = await fetchResource('/asset.txt?version=1', undefined, {
      cache,
    })
    expect(second.asString()).toContain('version=1')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('includes query parameters in cache keys by default', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()
    const options = { cache }

    const first = await fetchResource(
      '/asset.txt?version=1',
      undefined,
      options,
    )
    first.asString()
    const second = await fetchResource(
      '/asset.txt?version=2',
      undefined,
      options,
    )
    second.asString()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('strips query parameters from cache keys when disabled', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()
    const options = { cache, includeQueryParams: false }

    const first = await fetchResource(
      '/asset.txt?version=1',
      undefined,
      options,
    )
    expect(first.asString()).toContain('version=1')

    const second = await fetchResource(
      '/asset.txt?version=2',
      undefined,
      options,
    )
    expect(second.asString()).toContain('version=1')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('bypasses cache reads and writes when cache busting', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()

    const cached = await fetchResource('/asset.txt', undefined, { cache })
    cached.asString()
    const busted = await fetchResource('/asset.txt', undefined, {
      cache,
      cacheBust: true,
    })
    busted.asString()
    const reused = await fetchResource('/asset.txt', undefined, { cache })
    reused.asString()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.calls.argsFor(1)[0]).toMatch(/^\/asset\.txt\?\d+$/)
  })
})
