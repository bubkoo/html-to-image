/* eslint-disable promise/no-callback-in-promise */

import * as embeding from '../../src/embed-resources'

describe('embeding', () => {
  describe('parseURLs', () => {
    it('should parse urls', () => {
      expect(embeding.parseURLs('url("http://acme.com/file")')).toEqual([
        'http://acme.com/file',
      ])

      expect(embeding.parseURLs("url(foo.com), url('bar.org')")).toEqual([
        'foo.com',
        'bar.org',
      ])
    })

    it('should ignore data urls', () => {
      expect(embeding.parseURLs('url(foo.com), url(data:AAA)')).toEqual([
        'foo.com',
      ])
    })

    it('should keep local SVG fragments out of resource fetching', () => {
      expect(
        embeding.parseURLs(
          'clip-path: url(#clip); filter: url("#filter"); mask: url(\'#mask\'); background: url(image.svg#icon)',
        ),
      ).toEqual(['image.svg#icon'])
    })
  })

  it('should preserve fragment styles without making a fetch request', async () => {
    const fetchSpy = spyOn(window, 'fetch')
    const css = 'clip-path: url(#clip); filter: url("#filter")'
    expect(await embeding.embedResources(css, null, {})).toBe(css)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  describe('embed', () => {
    it('should embed url', (done) => {
      embeding
        .embed(
          'url(http://acme.com/image.png), url(foo.com)',
          'http://acme.com/image.png',
          null,
          {},
          () => Promise.resolve('AAA'),
        )
        .then((result) => {
          expect(result).toEqual('url(data:image/png;base64,AAA), url(foo.com)')
        })
        .then(done)
        .catch(done)
    })

    it('should resolve urls if base url given', (done) => {
      embeding
        .embed(
          'url(images/image.png)',
          'images/image.png',
          'http://acme.com/',
          {},
          (url) =>
            Promise.resolve(
              (
                {
                  'http://acme.com/images/image.png': 'AAA',
                } as any
              )[url],
            ),
        )
        .then((result) => {
          expect(result).toEqual('url(data:image/png;base64,AAA)')
        })
        .then(done)
        .catch(done)
    })
  })
})
