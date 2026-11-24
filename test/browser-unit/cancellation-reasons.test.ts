import { expect, test } from 'vitest'
import { createRenderer } from '../../src'
import { createImage } from '../../src/util'

const reasons: Array<{ name: string; create: () => unknown }> = [
  { name: 'null', create: () => null },
  { name: 'false', create: () => false },
  { name: 'zero', create: () => 0 },
  { name: 'empty string', create: () => '' },
  { name: 'object', create: () => Object.freeze({ reason: 'cancelled' }) },
  {
    name: 'non-stringifiable object',
    create: () => ({
      toString() {
        throw new Error('Cancellation must not stringify its reason')
      },
    }),
  },
  { name: 'Error', create: () => new Error('Original cancellation reason') },
]

function barrier() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function observe<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  )
}

function expectReason(
  outcome: Awaited<ReturnType<typeof observe>>,
  reason: unknown,
) {
  expect(outcome.status).toBe('rejected')
  if (outcome.status === 'rejected') expect(outcome.reason).toBe(reason)
}

const imageURL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="green"/></svg>',
  )

reasons.forEach(({ name, create }) => {
  test(`public capture preserves ${name} when already cancelled`, async () => {
    const controller = new AbortController()
    const reason = create()
    controller.abort(reason)
    const renderer = createRenderer({ skipFonts: true, pixelRatio: 1 })
    const node = document.createElement('div')
    node.style.cssText = 'width:20px;height:20px;background:green'
    let transformed = false
    try {
      const outcome = await observe(
        renderer.capture(node, {
          signal: controller.signal,
          onClone: () => {
            transformed = true
          },
        }),
      )
      expectReason(outcome, reason)
      expect(transformed).toBe(false)
    } finally {
      renderer.dispose()
    }
  })

  test(`public capture preserves ${name} while a real transform is pending`, async () => {
    const controller = new AbortController()
    const reason = create()
    const renderer = createRenderer({ skipFonts: true, pixelRatio: 1 })
    const node = document.createElement('div')
    node.style.cssText = 'width:20px;height:20px;background:green'
    const entered = barrier()
    const gate = barrier()
    const exited = barrier()
    const result = observe(
      renderer.capture(node, {
        signal: controller.signal,
        onClone: async () => {
          entered.release()
          try {
            await gate.promise
          } finally {
            exited.release()
          }
        },
      }),
    )
    try {
      await entered.promise
      controller.abort(reason)
      // Cancellation must settle before the transform barrier is released.
      expectReason(await result, reason)
    } finally {
      gate.release()
      await exited.promise
      await result
      renderer.dispose()
    }
  })

  test(`image loading preserves ${name} when already cancelled`, async () => {
    const controller = new AbortController()
    const reason = create()
    controller.abort(reason)
    const image = new Image()
    const outcome = await observe(
      createImage(imageURL, { signal: controller.signal }, image),
    )
    expectReason(outcome, reason)
    expect(image.getAttribute('src')).toBe('')
  })

  test(`image loading preserves ${name} while native load awaits decoding`, async () => {
    const controller = new AbortController()
    const reason = create()
    const image = new Image()
    const entered = barrier()
    const gate = barrier()
    const exited = barrier()
    const original = Object.getOwnPropertyDescriptor(image, 'decode')
    // Override only this real image instance. Its native load still precedes
    // decode; the gate makes the asynchronous cancellation boundary explicit.
    Object.defineProperty(image, 'decode', {
      configurable: true,
      value: async () => {
        entered.release()
        try {
          await gate.promise
        } finally {
          exited.release()
        }
      },
    })
    const result = observe(
      createImage(imageURL, { signal: controller.signal }, image),
    )
    try {
      await entered.promise
      expect(image.naturalWidth).toBe(2)
      controller.abort(reason)
      expectReason(await result, reason)
      expect(image.getAttribute('src')).toBe('')
    } finally {
      gate.release()
      await exited.promise
      await result
      if (original) Object.defineProperty(image, 'decode', original)
      else Reflect.deleteProperty(image, 'decode')
    }
  })
})
