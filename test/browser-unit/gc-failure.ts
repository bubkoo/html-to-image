/// <reference lib="es2021.weakref" />
import { commands, server } from 'vitest/browser'
import { withinGCFailureBudget } from '../browser/gc-failure-budget.mjs'
import type {
  GCFailureRecord,
  GCFailureResult,
} from '../browser/gc-failure.mjs'

declare module 'vitest/browser' {
  interface BrowserCommands {
    captureGCFailureHeap(
      record: GCFailureRecord,
    ): Promise<GCFailureResult | undefined>
  }
}

// Run synchronously and return only a boolean: no strong DOM reference survives
// into the command await. The marker is diagnostic instrumentation added only
// after the original failure, and its edges must be labeled as such in analysis.
function mark(reference: WeakRef<Document>, marker: string) {
  const source = reference.deref()
  if (!source) return false
  return Reflect.defineProperty(source, marker, {
    value: { marker },
    configurable: true,
  })
}

function unmark(reference: WeakRef<Document>, marker: string) {
  const source = reference.deref()
  return !source || Reflect.deleteProperty(source, marker)
}

export async function recordGCFailure(
  reference: WeakRef<Document>,
  originalCollected: boolean,
  caseName: string,
) {
  if (originalCollected) return
  const id = crypto.randomUUID()
  const marker = '__hti_gc_failure_' + id.replace(/-/g, '_')
  const record: GCFailureRecord = {
    id,
    caseName,
    browser: server.browser,
    phase: 'snapshot',
    originalCollected,
    alive: reference.deref() !== undefined,
    marker,
    markerAttached: false,
    deadline: Date.now() + 2000,
    snapshotConfirmed: false,
  }
  try {
    record.markerAttached = mark(reference, marker)
    const snapshot = await withinGCFailureBudget(
      () =>
        commands.captureGCFailureHeap({
          ...record,
          deadline: record.deadline - 250,
        }),
      record.deadline - 250,
    )
    record.snapshotConfirmed = snapshot?.status === 'saved'
    record.snapshotFinishedUTC = snapshot?.snapshotFinishedUTC
  } catch (error) {
    // Artifact/protocol failure must not replace the original GC assertion.
    record.commandError = String(error)
  } finally {
    // This samples after our bounded await, which may have timed out while
    // native work remains in flight. Missing after on budget expiry is unknown.
    record.phase = 'after'
    record.observation = 'after-diagnostic-await'
    record.alive = reference.deref() !== undefined
    try {
      record.markerRemoved = unmark(reference, marker)
      // Send the final primitive sample even if the snapshot exhausted its
      // budget. Await only the remaining total budget, consuming late rejection.
      const after = commands.captureGCFailureHeap({ ...record })
      void after.catch(() => {})
      await withinGCFailureBudget(() => after, record.deadline)
    } catch {
      // Keep the caller's original primitive verdict authoritative.
    }
  }
}
