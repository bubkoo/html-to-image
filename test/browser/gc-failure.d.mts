export interface GCFailureRecord {
  id: string
  caseName: string
  browser: string
  phase: 'snapshot' | 'after'
  observation?: 'after-diagnostic-await'
  snapshotConfirmed?: boolean
  snapshotFinishedUTC?: string
  originalCollected: boolean
  alive: boolean
  marker: string
  markerAttached: boolean
  deadline: number
  markerRemoved?: boolean
  commandError?: string
}

export interface GCFailureResult {
  status: string
  snapshotFinishedUTC?: string
}

export function captureGCFailureHeap(
  page: unknown,
  record: GCFailureRecord,
): Promise<GCFailureResult | undefined>
