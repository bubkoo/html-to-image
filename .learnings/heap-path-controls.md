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

## [LRN-20261124-001] best_practice

**Logged**: 2026-11-24
**Priority**: high
**Status**: resolved
**Area**: testing

### Summary
Preserve the TypeScript contract in size-matched fixtures and classify weak edges by semantics, including edges without a literal weak prefix.

### Details
The initial compact fixture used a TS-to-JS transform and saved the emitted JavaScript with a .ts extension. It removed BrowserCommands module augmentation and Promise type annotations, so browser types failed before the measured suite started. The final generator preserves declarations with the TypeScript printer/scanner and compares normalized emitted JavaScript to establish executable equivalence; raw emitted formatting is not a semantic comparison. Corrected browser types pass before V1 runs.

Actual U1 and V1 coverage both retain the same original failure. V1 paths include the post-verdict global probe, debugger references, explicit wrapper holds and WeakRefObject::target. The pinned upstream WeakRefObject trace emits that target for traceWeakEdges, and construction can preserve DOM wrappers. The absence of a [weak] prefix does not make it a strong ownership edge. An unresolved native preserved-wrapper holder requires a native CC graph; it is not a unique application holding root. Keep raw paths and inspection-introduced roots explicit.

### Suggested Action
Run types before fixture execution; compare normalized emitted code, not stripped source formatting. Preserve the cached failure and exact input hashes. Reduce probe roots only with fresh tool controls and inspect native ownership after resume. Restore owned browser files and stop the owned container when pausing.

### Metadata
- Source: actual failing-suite heap capture and fixture generator type failure
- Related Files: docs/evidence/gc-observer-controls/heap-actual-summary.json
- Tags: typescript, module-augmentation, weakref, native-wrapper, observer-effect
