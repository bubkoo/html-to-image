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

## [LRN-20261124-002] best_practice

**Logged**: 2026-11-24
**Priority**: high
**Status**: resolved
**Area**: testing

### Summary
Inspect an existing WeakRef through its heap edge instead of adding a strong target hold, and preserve raw observer paths when qualifying graph controls.

### Details
V5 passes only the existing WeakRef, capture and negative sample after the original verdict. The privileged reference wrapper has a proxy-target edge to the WeakRef, whose WeakRefObject::target edge identifies the actual document without a second dereference or an explicit raw document hold. Positive controls validate this identity and the existing ownership member; the actual failing run preserves nativeCollected=true / capturedCollected=false and balanced DevTools registration.

The complete GC log reveals paths hidden by bounded shortest-path queries. A raw independent negative can reach the deliberately held positive through realm debugger, privileged global and remote-object ownership. Keep these paths; distinguish privileged wrapper and unwrapped content starts, then label a separate observer-qualified view. An initial raw-negative-unreachable assertion failed and must not be reported as a pass.

Names alone do not define edge strength. The pinned CacheIR compiler traces WeakShape/Object/etc. strongly for IonICStub, even when their labels contain cacheir-weak. Keep undecorated CacheIR edges conservative. The CC TraversalTracer explicitly requests weak edges, and all-traces visits black JS nodes; native all-traces output alone is not proof of original application ownership. Gray native preserved-wrapper roots and unmodeled conditional WeakMap semantics remain unresolved. Identical measured source/built inputs do not prove entire cache/process/timing identity.

### Suggested Action
Preserve full GC/CC logs, cached verdicts, explicit exclusion policies and contradicting runs. Check ordinary CC without target dereference next; never relax the original gate or infer a production fix from the diagnostic graph.

### Metadata
- Source: actual native-holder and WeakRef-only experiments
- Related Files: docs/evidence/gc-observer-controls/native-holder-summary.json
- Tags: weakref, cacheir, ion, cycle-collector, debugger, graph-controls

## [LRN-20261124-003] best_practice

**Logged**: 2026-11-24
**Priority**: high
**Status**: resolved
**Area**: testing

### Summary
Read Firefox settings after Playwright applies them and verify the content engine; ordinary CC omissions and post-inspection paths are not root-cause proofs.

### Details
Playwright's Firefox driver applies firefoxUserPrefs in Browser.enable after Juggler startup. A startup log with default true values led to an incorrect ignored-setting interpretation; after-enable logging and content getJitCompilerOptions corrected it. D3 verifies ion/baseline/blinterp enable=0 and passes; restored defaults E1/E2 verify enable=1 but pass/fail respectively. Treat configuration, early preference readings and actual engine state separately. Temporary profile files were unavailable during attempted reads, so those attempts provide no effective-state proof.

Ordinary CC omits both an actual retained target and an explicitly held positive; omission is not collection or a garbage verdict. Full GC logs show black source-document paths through compiled module accessors: explicit CacheIR shape paths in px/cloneSingleNode and an ambiguous cacheir-weak-shape path in cloneCSSStyle. Explicit dimensions still fail. Native eval and HTTP module getter-only controls all collect, rejecting a universal getter-only cause.

The inspection still unwraps capture and negative objects. Transitive ungraying/observer effects can affect graph coloring even without directly holding the target. These post-verdict paths are witnesses, not a unique pre-inspection root. Do not turn them into a runtime getter rewrite merely to pass the test.

### Suggested Action
Remove application-object exposure from the next probe, use only the existing WeakRef to identify the target, and preserve full GC roots, ordinary CC coverage, effective engine settings and contradicting controls. Minimize the real module/inert-document/coverage context before diagnosing an engine limitation or changing production behavior.

### Metadata
- Source: ordinary CC and effective-JIT controls
- Related Files: docs/evidence/gc-observer-controls/ordinary-cc-summary.json
- Tags: playwright, firefox, preferences, jit, cacheir, observer-effect

## [LRN-20261124-004] knowledge

**Logged**: 2026-11-24
**Priority**: high
**Status**: resolved
**Area**: testing

### Summary
The compiled px/source-document witness persists when the probe carries only the existing WeakRef.

### Details
Reference-only tool controls identify an explicitly held member and reject a separately sampled collected reference, without unwrapping capture/negative/source objects. F1 passes 1225/four skips, while G1 preserves the original Firefox failure at 1224/one/four. Its complete GC graph still has a black HTMLDocument and module -> px -> explicit CacheIR shape -> source Window -> Document witnesses. Direct capture-object unwrapping is therefore not necessary for this observed path; other debugger/WeakRef/snapshot/ordinary-CC effects remain possible.

### Suggested Action
Retain the post-verdict limitation and original gates. Use actual realm/accessor paths to guide further reduction, rather than equating any one witness with the complete cause or rewriting getters to pass.

### Metadata
- Source: existing-WeakRef-only failure capture
- Related Files: docs/evidence/gc-observer-controls/reference-only-summary.json
- Tags: weakref, cacheir, module, observer-effect
