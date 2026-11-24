import { expect, test } from 'vitest'
import { createSVGStyleEnvironment } from '../../src/svg-style-scope'

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

function observe<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  )
}

function frameCount() {
  return document.querySelectorAll('iframe[aria-hidden="true"]').length
}

const phases = [
  'before starting',
  'while loading',
  'before locking resources',
  'after loading',
]

phases.forEach((phase) => {
  reasons.forEach((item) => {
    test(`SVG style environment preserves ${item.name} cancellation ${phase}`, async () => {
      const frames = frameCount()
      const controller = new AbortController()
      const reason = item.create()
      if (phase === 'before starting') controller.abort(reason)
      const environment = createSVGStyleEnvironment(document, controller.signal)
      try {
        const abortOnReady =
          phase === 'before locking resources'
            ? environment.getDocument(true).then(() => controller.abort(reason))
            : undefined
        if (phase === 'after loading') {
          const ownedDocument = await environment.getDocument()
          expect(
            ownedDocument.querySelector('meta[data-svg-style-policy]'),
          ).not.toBeNull()
          controller.abort(reason)
        }
        const result = observe(environment.getDocument())
        if (phase === 'while loading') {
          // The real frame has been appended, but its asynchronous srcdoc load
          // has not been allowed to run before this native abort.
          expect(frameCount()).toBe(frames + 1)
          controller.abort(reason)
        }
        await abortOnReady
        const outcome = await result
        expect(outcome.status).toBe('rejected')
        if (outcome.status === 'rejected') expect(outcome.reason).toBe(reason)
        expect(frameCount()).toBe(frames)
      } finally {
        environment.dispose()
        environment.dispose()
        expect(frameCount()).toBe(frames)
      }
    })
  })
})

test('disposing a pending SVG style environment rejects and removes its real frame', async () => {
  const frames = frameCount()
  const environment = createSVGStyleEnvironment(document)
  const result = observe(environment.getDocument())
  expect(frameCount()).toBe(frames + 1)
  environment.dispose()
  environment.dispose()
  const outcome = await result
  expect(outcome.status).toBe('rejected')
  if (outcome.status === 'rejected')
    expect((outcome.reason as DOMException).name).toBe('AbortError')
  expect(frameCount()).toBe(frames)
  const subsequent = await observe(environment.getDocument())
  expect(subsequent.status).toBe('rejected')
  if (subsequent.status === 'rejected')
    expect((subsequent.reason as Error).message).toContain('disposed')
})

test('disposing after frame load cannot deliver the document to a pending untrusted consumer', async () => {
  const frames = frameCount()
  const environment = createSVGStyleEnvironment(document)
  try {
    const disposal = environment
      .getDocument(true)
      .then(() => environment.dispose())
    const result = observe(environment.getDocument())
    await disposal
    const outcome = await result
    expect(outcome.status).toBe('rejected')
    if (outcome.status === 'rejected')
      expect((outcome.reason as Error).message).toContain('disposed')
    expect(frameCount()).toBe(frames)
  } finally {
    environment.dispose()
  }
})

test('a removed SVG style frame rejects at the original readiness deadline and is cleaned up', async () => {
  const existingFrames = Array.from(
    document.querySelectorAll('iframe[aria-hidden="true"]'),
  )
  const environment = createSVGStyleEnvironment(document)
  const result = observe(environment.getDocument())
  const frame = Array.from(
    document.querySelectorAll('iframe[aria-hidden="true"]'),
  ).find((candidate) => !existingFrames.includes(candidate))
  expect(frame).toBeDefined()
  frame!.remove()
  try {
    const outcome = await result
    expect(outcome.status).toBe('rejected')
    if (outcome.status === 'rejected')
      expect((outcome.reason as Error).message).toBe(
        'SVG style environment did not become ready',
      )
    frame!.dispatchEvent(new Event('load'))
    expect(frameCount()).toBe(existingFrames.length)
  } finally {
    environment.dispose()
    expect(frameCount()).toBe(existingFrames.length)
  }
})
