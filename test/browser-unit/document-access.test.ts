import { expect, test } from 'vitest'
import {
  hasDOMProperty,
  readDOMProperty,
  readOptionalDOMMethod,
  writeDOMProperty,
} from '../../src/dom'
import {
  readDocumentMethod,
  readDocumentProperty,
  readOptionalDocumentProperty,
} from '../../src/document'
import { toArray } from '../../src/util'

test('isolated accesses preserve existing proxy traps and their receiver', () => {
  function run(reflective: boolean) {
    const events: string[] = []
    const target = { value: 1 }
    const proxy = new Proxy(target, {
      get(object, key, receiver) {
        expect(receiver).toBe(proxy)
        events.push('get:' + String(key))
        return Reflect.get(object, key, receiver)
      },
      set(object, key, value, receiver) {
        expect(receiver).toBe(proxy)
        events.push('set:' + String(key))
        return Reflect.set(object, key, value, receiver)
      },
      has(object, key) {
        events.push('has:' + String(key))
        return Reflect.has(object, key)
      },
      getOwnPropertyDescriptor(object, key) {
        events.push('descriptor:' + String(key))
        return Reflect.getOwnPropertyDescriptor(object, key)
      },
    })
    const before = reflective ? readDOMProperty(proxy, 'value') : proxy.value
    const written = reflective
      ? writeDOMProperty(proxy, 'value', 2)
      : (proxy.value = 2)
    const present = reflective
      ? hasDOMProperty('value', proxy)
      : 'value' in proxy
    return { events, before, written, present, after: target.value }
  }
  expect(run(true)).toEqual(run(false))
  expect(run(true)).toEqual({
    events: ['get:value', 'set:value', 'descriptor:value', 'has:value'],
    before: 1,
    written: 2,
    present: true,
    after: 2,
  })
})

test('erased array-like reads preserve order, receivers and primitive coercion', () => {
  const events: string[] = []
  const target = {
    get length() {
      expect(this).toBe(target)
      events.push('length')
      return 2
    },
    get 0() {
      expect(this).toBe(target)
      events.push('0')
      return 'a'
    },
    get 1() {
      expect(this).toBe(target)
      events.push('1')
      return 'b'
    },
  }
  expect(toArray(target)).toEqual(['a', 'b'])
  expect(events).toEqual(['length', '0', '1'])
  expect(toArray('ab')).toEqual(['a', 'b'])
  const symbol = Symbol('source')
  expect(readDOMProperty(symbol, 'description')).toBe(symbol.description)
  expect(() => toArray(null)).toThrow(TypeError)
  expect(() => toArray(undefined)).toThrow(TypeError)
})

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

test('optional reflective calls skip arguments only for a nullish receiver', () => {
  const valid = {
    value: 5,
    method(argument: number) {
      return this.value + argument
    },
  }
  function run(reflective: boolean, target: typeof valid | null | undefined) {
    const events: string[] = []
    const argument = () => {
      events.push('argument')
      return 2
    }
    try {
      const result = reflective
        ? readOptionalDOMMethod(target, 'method')?.(argument())
        : target?.method(argument())
      return { events, result }
    } catch (error) {
      return { events, typeError: error instanceof TypeError }
    }
  }
  ;[null, undefined, valid].forEach((target) => {
    expect(run(true, target)).toEqual(run(false, target))
  })
  expect(run(true, null)).toEqual({ events: [], result: undefined })
  expect(run(true, valid)).toEqual({ events: ['argument'], result: 7 })
  const invalid = { ...valid, method: undefined } as unknown as typeof valid
  expect(run(true, invalid)).toEqual(run(false, invalid))
  expect(run(true, invalid)).toEqual({
    events: ['argument'],
    typeError: true,
  })
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

test('reflective writes preserve target and value evaluation before the setter', () => {
  function run(reflective: boolean) {
    const events: string[] = []
    const target = {
      get value() {
        events.push('getter')
        return 0
      },
      set value(value: number) {
        expect(this).toBe(target)
        events.push('setter:' + value)
      },
    }
    function receiver() {
      events.push('target')
      return target
    }
    function argument() {
      events.push('value')
      return 7
    }
    const result = reflective
      ? writeDOMProperty(receiver(), 'value', argument())
      : (receiver().value = argument())
    return { result, events }
  }
  expect(run(true)).toEqual(run(false))
  expect(run(true)).toEqual({
    result: 7,
    events: ['target', 'value', 'setter:7'],
  })
})

test('reflective writes propagate the original setter exception once', () => {
  function run(reflective: boolean) {
    const error = new Error('setter failed')
    let calls = 0
    const target = {
      set value(_value: number) {
        calls += 1
        throw error
      },
    }
    const invoke = () =>
      reflective ? writeDOMProperty(target, 'value', 1) : (target.value = 1)
    let caught: unknown
    try {
      invoke()
    } catch (failure) {
      caught = failure
    }
    expect(caught).toBe(error)
    return calls
  }
  expect(run(true)).toBe(run(false))
  expect(run(true)).toBe(1)
})

test('reflective writes retain strict assignment failure for a nonwritable property', () => {
  const target = Object.freeze({ value: 1 }) as { value: number }
  expect(() => {
    target.value = 2
  }).toThrow(TypeError)
  expect(() => writeDOMProperty(target, 'value', 2)).toThrow(TypeError)
  expect(target.value).toBe(1)
})

test('reflective DOM writes return the RHS when a native setter normalizes it', () => {
  const direct = document.createElement('canvas')
  const reflective = document.createElement('canvas')
  const directResult = (direct.width = 4.7)
  const reflectiveResult = writeDOMProperty(reflective, 'width', 4.7)
  expect(reflectiveResult).toBe(directResult)
  expect(reflectiveResult).toBe(4.7)
  expect(reflective.width).toBe(direct.width)
  expect(reflective.width).toBe(4)
})

test('reflective presence checks preserve key evaluation order without invoking getters', () => {
  function run(reflective: boolean) {
    const events: string[] = []
    const prototype = {
      get value() {
        events.push('getter')
        return 1
      },
    }
    const target = Object.create(prototype) as { value: number }
    function key() {
      events.push('key')
      return {
        [Symbol.toPrimitive]() {
          events.push('coerce')
          return 'value'
        },
      } as unknown as PropertyKey
    }
    function receiver() {
      events.push('target')
      return target
    }
    const result = reflective
      ? hasDOMProperty(key(), receiver())
      : key() in receiver()
    return { result, events }
  }
  expect(run(true)).toEqual(run(false))
  expect(run(true)).toEqual({
    result: true,
    events: ['key', 'target', 'coerce'],
  })
})
