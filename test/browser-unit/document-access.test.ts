import { expect, test } from 'vitest'
import {
  readDocumentMethod,
  readDocumentProperty,
  readOptionalDocumentProperty,
} from '../../src/document'

test('reflective property reads preserve inherited getters and their receiver', () => {
  const prototype = {
    get value(): number {
      return (this as unknown as { own: number }).own
    },
  }
  const target = Object.assign(Object.create(prototype), { own: 42 }) as {
    own: number
    readonly value: number
  }
  expect(readDocumentProperty(target, 'value')).toBe(target.value)
  expect(readOptionalDocumentProperty(target, 'value')).toBe(target.value)
  const read = (value: typeof target | null | undefined) =>
    readOptionalDocumentProperty(value, 'value')
  expect(read(null)).toBeUndefined()
  expect(read(undefined)).toBeUndefined()
})

test('reflective calls resolve the method before arguments and keep its receiver', () => {
  function run(reflective: boolean) {
    const events: string[] = []
    const target = {
      value: 1,
      get method(): (argument: number) => number {
        events.push('getter:' + this.value)
        return function (this: { value: number }, argument: number) {
          events.push('call:' + this.value)
          return this.value + argument
        }
      },
    }
    function argument() {
      events.push('argument')
      target.value = 2
      return 3
    }
    const result = reflective
      ? readDocumentMethod(target, 'method')(argument())
      : target.method(argument())
    return { result, events }
  }
  expect(run(true)).toEqual(run(false))
  expect(run(true)).toEqual({
    result: 5,
    events: ['getter:1', 'argument', 'call:2'],
  })
})

test('a throwing method getter prevents argument evaluation', () => {
  function run(reflective: boolean) {
    const error = new Error('getter failed')
    let evaluated = false
    const target = {
      get method(): (value: boolean) => void {
        throw error
      },
    }
    const invoke = () =>
      reflective
        ? readDocumentMethod(target, 'method')((evaluated = true))
        : target.method((evaluated = true))
    expect(invoke).toThrow(error)
    return evaluated
  }
  expect(run(true)).toBe(run(false))
  expect(run(true)).toBe(false)
})

test('a noncallable method still evaluates arguments and throws', () => {
  function run(reflective: boolean) {
    let evaluated = false
    const target = { method: undefined } as unknown as {
      method(value: boolean): void
    }
    const invoke = () =>
      reflective
        ? readDocumentMethod(target, 'method')((evaluated = true))
        : target.method((evaluated = true))
    expect(invoke).toThrow(TypeError)
    return evaluated
  }
  expect(run(true)).toBe(run(false))
  expect(run(true)).toBe(true)
})

test('reflective DOM methods preserve overloads and the original document', () => {
  const source = document.implementation.createHTMLDocument('source')
  const destination = document.implementation.createHTMLDocument('destination')
  const input = readDocumentMethod(source, 'createElement')('input')
  input.value = 'value'
  const svg = readDocumentMethod(source, 'createElementNS')(
    'http://www.w3.org/2000/svg',
    'svg',
  )
  svg.setAttribute('viewBox', '0 0 20 20')
  const imported = readDocumentMethod(destination, 'importNode')(input, true)
  expect(input.ownerDocument).toBe(source)
  expect(svg.ownerDocument).toBe(source)
  expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
  expect(imported.ownerDocument).toBe(destination)
  expect(imported.value).toBe(input.value)
})
