import { getStyleProperties } from '../../src/util'

describe('style property selection across captures', () => {
  it('honors different explicit lists on consecutive calls', () => {
    expect(getStyleProperties({ includeStyleProperties: ['color'] })).toEqual([
      'color',
    ])
    expect(
      getStyleProperties({ includeStyleProperties: ['display', 'width'] }),
    ).toEqual(['display', 'width'])
  })

  it('keeps custom lists separate from the default property cache', () => {
    const defaults = getStyleProperties()
    expect(defaults.length).toBeGreaterThan(0)
    expect(getStyleProperties({ includeStyleProperties: ['color'] })).toEqual([
      'color',
    ])
    expect(getStyleProperties()).toBe(defaults)
  })

  it('preserves an explicitly empty list without poisoning later calls', () => {
    expect(getStyleProperties({ includeStyleProperties: [] })).toEqual([])
    expect(getStyleProperties({ includeStyleProperties: ['display'] })).toEqual(
      ['display'],
    )
    expect(getStyleProperties().length).toBeGreaterThan(0)
  })
})
