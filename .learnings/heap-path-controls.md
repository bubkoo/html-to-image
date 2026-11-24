## [LRN-20261119-001] best_practice

**Logged**: 2026-11-18T18:25:30.032160+00:00
**Priority**: high
**Status**: resolved
**Area**: testing

### Summary
Validate heap tooling against explicit ownership and independent controls before collecting a failing test; raw graph paths and pre-snapshot IDs are insufficient.

### Details
Firefox heap-file IPC requires parent DevTools registration. Without it the child dies with PHeapSnapshotTempFileHelper failure, even when OOM counters are zero. Register with official notifyDevToolsOpened only for capture and balance notifyDevToolsClosed; do not remove the guard.
Snapshot construction can move nursery objects. Preserve wrapper holds and obtain IDs after capture. A privileged wrapper ID is distinct from the content HTMLDocument ID; the census and direct proxy-target edge disambiguate it.
Raw shortest paths can traverse explicitly weak CacheIR edges, conditional WeakMap values and Debugger.Object referents. Preserve raw paths and label these cases; a bounded search with no unqualified path does not prove unreachability. Comparison/probe wrapper holds themselves introduce roots.

### Suggested Action
Use known member ownership and independent negative controls, record registration balance and exact browser/source hashes, preserve earlier tool failures, and run actual collection only after caching primary verdicts. Verify no-hook behavior separately. Restore the owned browser and tests when pausing.

### Metadata
- Source: diagnostic tool debugging
- Related Files: docs/evidence/gc-observer-controls/heap-tool-controls-summary.json
- Tags: firefox, heap-snapshot, weak-reference, debugger, positive-control

### Resume addendum
A stopped-engine note is not evidence that the old container/image still exists. Check current inventory, rebuild from pinned digests if absent, and establish a fresh baseline. Before a potentially crashing post-failure inspector request, persist only the cached primary booleans on the Node side so inspection errors cannot erase the original observation. Syntax-only hook checks are not runtime acceptance.
