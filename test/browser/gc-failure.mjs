import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { withinGCFailureBudget } from './gc-failure-budget.mjs'

// Never let a timed-out diagnostic disable another diagnostic's Heap session.
const heapOwners = new WeakMap()

/**
 * Test-only, post-failure diagnostics. No source DOM object crosses this API.
 * @param {unknown} page
 * @param {import('./gc-failure.mjs').GCFailureRecord} record
 */
export async function captureGCFailureHeap(page, record) {
  if (!/^[a-z0-9-]{1,80}$/.test(record.id))
    throw new Error('Invalid GC diagnostic artifact ID')
  if (record.phase !== 'snapshot' && record.phase !== 'after')
    throw new Error('Invalid GC diagnostic phase')
  if (!Number.isFinite(record.deadline))
    throw new Error('Invalid GC diagnostic deadline')
  const folder = resolve('.vitest/attachments/gc-heap', record.id)
  const bounded = (operation) =>
    withinGCFailureBudget(operation, record.deadline)
  await bounded(() => mkdir(folder, { recursive: true }))
  const write = (name, value) =>
    writeFile(
      resolve(folder, name + '.json'),
      JSON.stringify(value, null, 2) + '\n',
    )
  if (record.phase === 'after') {
    await bounded(() =>
      write('after', { ...record, atUTC: new Date().toISOString() }),
    )
    return
  }
  await bounded(() =>
    write('before', { ...record, atUTC: new Date().toISOString() }),
  )
  const result = { startedUTC: new Date().toISOString() }
  await bounded(() =>
    write('after-pending', { status: 'not-yet-sampled', alive: 'unknown' }),
  )
  await bounded(() => write('transport', { ...result, status: 'pending' }))
  const identity = {
    pageURL: page?.url?.(),
    frames: page
      ?.frames?.()
      .map((frame) => ({ name: frame.name(), url: frame.url() })),
  }
  if (record.browser !== 'webkit') {
    const unsupported = {
      ...result,
      ...identity,
      status: 'unsupported',
      reason: 'Native Heap protocol is WebKit-only',
    }
    await bounded(() => write('transport', unsupported))
    return unsupported
  }
  let session
  let enabling
  let disabling
  let enabled = false
  let abandoned = false
  const owner = { id: record.id }
  const release = () => {
    if (heapOwners.get(session) === owner) heapOwners.delete(session)
  }
  const disable = () => {
    disabling ||= Promise.resolve().then(() => session.send('Heap.disable'))
    // Retain ownership until actual acknowledgement, even after our budget ends.
    void disabling.then(release, () => {})
    return disabling
  }
  try {
    // Playwright 1.64.1's in-process WebKit provider; feature detect the private API.
    session = page?._connection?.toImpl?.(page)?.delegate?._session
    if (!session)
      throw new Error('Playwright WebKit native Heap session unavailable')
    if (heapOwners.has(session)) {
      result.status = 'busy'
      result.owner = heapOwners.get(session).id
      return result
    }
    heapOwners.set(session, owner)
    enabling = Promise.resolve().then(() => session.send('Heap.enable'))
    void enabling.then(() => {
      enabled = true
      if (abandoned) void disable()
    }, release)
    await bounded(() => enabling)
    const snapshot = await bounded(() => session.send('Heap.snapshot'))
    result.snapshotFinishedUTC = new Date().toISOString()
    const raw = JSON.stringify(snapshot, null, 2) + '\n'
    await bounded(() => writeFile(resolve(folder, 'heap.json'), raw))
    result.status = 'saved'
    result.bytes = Buffer.byteLength(raw)
    result.sha256 = createHash('sha256').update(raw).digest('hex')
  } catch (error) {
    result.status = 'error'
    result.error = { message: String(error), stack: error?.stack }
  } finally {
    abandoned = true
    if (enabled) {
      try {
        const stopped = disable()
        void stopped.catch(() => {})
        await bounded(() => stopped)
      } catch (error) {
        result.disableError = { message: String(error), stack: error?.stack }
      }
    }
    await bounded(() =>
      write('transport', {
        ...result,
        ...identity,
        completedUTC: new Date().toISOString(),
      }),
    )
  }
  return result
}
