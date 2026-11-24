# Paired observer controls: investigation, not a fix

Master 901c4bc failed CI 43664877371: coverage 1225 pass / four inherited skips; uninstrumented source 1102 pass / four failures / four inherited skips; packages did not run. The three Firefox private-environment/cancellation failures remain, and WebKit frozen SVG source-document collection also failed. CodeQL 43664877309 passed. The accepted PR merge 09e9055 and master have exactly the same Git tree db3c38deb9d40948966cd268d321c228fce3a55f. Both use Ubuntu 26.04 runner image 20261111.196.1. This rules out missing merged files and an image-version mismatch; it does not establish an event, timing, helper or production cause.

The prior request/frame acknowledgement gap was independently measured and corrected by #645. This negative master result proves that correction is insufficient to resolve every lifecycle failure. The original log, all twelve uploaded files, accepted PR metadata and four exact inputs are preserved in the 24-file master-failure archive.

## What the new controls observe

Each original test still samples and asserts the result of its first three collection commands. The two original async helper bodies are byte-identical, checked by primary-helper-identity.json. Diagnostics run only after the primary boolean has been captured; a later successful collection cannot turn an original failure into a pass. No primary assertion, deadline or inherited skip changes.

Compare the same environment under three observer forms: WeakRef(await Document), mapping the document Promise to a WeakRef before awaiting, and explicitly clearing a temporary Document variable. Owners are the actual library and a smaller native iframe owner, with and without a cleared five-second readiness timer. This locates a family of retaining paths; differences alone do not isolate every native configuration difference. Frozen-source controls retain a capture/renderer and compare the original helper with one that clears its source local. Results include an unreachable simple-object canary, a held strong-object control, loaded source font names/status, native font-sharing error names and restored frame counts.

Each supplemental matrix requests three diagnostic collections after the primary snapshot. The existing pending-font failure diagnosis may already perform three native-control collections; that separate phase is explicitly recorded. These are extra observations, not added chances to satisfy the primary gate. Only booleans, strings and numeric execution metadata reach the reporter; no Document/Element/FontFace is stored in the record.

The branch temporarily enables paired observations in both its direct-head push run and PR merge run. Records whitelist event, head, run ID, runner image, platform, Node version, CPU and memory, without dumping the process environment. Coverage and uninstrumented source have distinct filenames. Temporary branch triggers and always-record flags must be removed before any final merge; this is not a production fix or a merge-ready PR.

## Local evidence and replay

Mac focused lint/types pass and twelve existing tests pass. Nine original collection samples and sixty supplemental observations are recorded; all collect locally, with no observer errors, and the held-object/frame controls remain valid. These are passing local controls, not sixty new tests or a Linux reproduction.

Run `GC_OBSERVER_DIAGNOSTICS=1 pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/resource-resolver-cancellation.test.ts test/browser-unit/svg-fragment-lifetime.test.ts`. Inspect .vitest/attachments/gc-observers, keeping each run separate. The complete CI pipeline still runs the unchanged original gates; no step is configured to ignore their failures. Run `python3 docs/evidence/gc-observer-controls/verify-archives.py` for 36 raw files in the failure and local-control archives.

Production src and ESM/CJS/UMD bytes have not changed. Physical-phone acceptance has not been repeated or expanded. No npm publication or old contributor PR comment/closure. The independently reproduced relative SVG paint-base defect remains deferred while these lifecycle checks are investigated.

## First paired Linux runs at 2a0cc805

Direct-head push CI 43667097221 passes all 1225 coverage / 1106 source / 159 package cases, with the four inherited skips in each source suite. PR CI 43667274475 passes coverage but fails three Firefox source cases (1103 pass, four inherited skips); packages do not run. CodeQL 43667274484 passes. All uploaded files, logs, run metadata and the five exact diagnostic inputs are preserved in first-pair-raw.tar.gz (63 files). first-pair-summary.json explicitly retains the coverage/browser filename prefix: those suites must never be combined into an unlabelled result.

In the failing PR's uninstrumented Firefox environment-false case, the primary native document collects, the primary library document does not, and the latter collects after diagnostics. For environment-true, both primary native and library documents remain; all three supplementary native timed/untimed observer forms collect while all three library forms remain. Pending-font cancellation likewise retains all three supplementary library forms while native forms collect. Every simple-object canary collects and the strong/frame controls remain valid. The failing environment-true document has no source fonts. Thus changing the observer expression or a generic readiness timer does not by itself explain persistent probed-library retention. The primary native control is not uniformly collected; grouped failure messages must not be treated as per-case evidence.

Both suites in the push run and coverage in the PR pass. Push uses image 20261111.196.1 / AMD EPYC 7763; PR uses 20261111.82.6 / Intel Xeon 6975P-C. Event, image and CPU are confounded, so these runs do not prove an event-specific cause. The WebKit frozen-source failure from master does not recur in this pair, which does not invalidate the earlier failure.

## Next controlled observations, still no production change

The expanded matrix adds a native readiness timer whose callback explicitly captures its iframe, and an existing capture helper with timeout=0 only as a supplementary counterfactual. Original primary timeouts and collection counts remain unchanged. A paired instrumentation wraps library SVG removal in both branches: both read the same weakly tracked use references; only one clears owned href attributes before removal. Cloned, unattached control uses are included. If both instrumented branches collect where the plain library retains, instrumentation/timing has changed the result and href cleanup cannot receive causal credit. Order and age at sampling are recorded because construction is sequential, not simultaneous.

Local focused lint/types and the same twelve existing tests pass. Nine primary samples and 117 supplementary observations all collect; no local failure is reproduced. In probed Firefox controls, both instrumented forms see ten use nodes / five SVG removals, with zero versus eight cleared hrefs. This proves the intervention ran, not that it fixes Linux retention. Expanded-local preserves sixteen raw inputs/records/logs separately from the original sixty-observation archive. All four archives total 115 measured files and pass verify-archives.py. Production source and built packages remain unchanged; this PR stays draft.

## Expanded pair at b746718: cleanup hypothesis rejected as sufficient

PR CI 43668914513 again passes coverage 1225 / four inherited skips but source fails three Firefox cases (1103 pass / four inherited skips). Push CI 43668909662 passes the same coverage gate, then source fails those three plus the WebKit frozen-source case (1102 pass / four inherited skips). Neither runs packages. Both use image 20261111.196.1, with different AMD CPUs. PR CodeQL 43668914467 passes. The complete expanded pair preserves 67 files, including all artifacts, logs, run metadata and exact five inputs; five archives now verify 182 files.

Each job records nine primary samples and 117 supplementary observations in each of coverage/source. In each failing source suite seven supplementary documents remain: all six probed-library removal-control/cleared-href forms, plus the Firefox original await-capture helper. The paired href-clearing form clears eight references but still retains documents, so clearing hrefs is not a sufficient explanation or supported fix. Plain library forms, constructed earlier, now collect; timing and instrumentation matter. All canaries collect, with no observer errors. The primary unprobed document collects only after its original failed sample; the probed primary also collects later. Pending-font primary remains after diagnostics in PR but collects later in push. Every original failed gate remains a failure.

The supplementary Firefox capture with timeout=0 and cleared source local collects in both jobs, while the original supplementary capture retains; the original primary Firefox capture passes. This is a possible timer/helper retaining path, not proof of a production defect or the WebKit cause. No timeout change is made to production or the primary test.

## Reference graph trace, separate diagnostic execution

The next temporary branch-only step runs only after a normal gate fails. It runs the Firefox source suite with Mozilla content-process GC/CC graphs enabled, stores per-request graph-file sequences and places observer records under root-trace so normal failing records cannot be overwritten. Its result cannot replace the preceding normal gate. Logging and file-system round trips perturb timing; a passing trace is not evidence that the ordinary failure was fixed. Original primary helpers/assertions and three collection requests are unchanged. The graph files are compressed for upload, with the original names preserved. This entire diagnostic step and collection metadata must be removed before any eventual merge.

Locally the trace plumbing passes lint/types and four existing Firefox tests, with 24 collection commands and no incomplete graph files at completion. It generates 75 GC and 75 CC files (roughly 1.1 GB uncompressed); these passing Mac graphs are local investigation output, not Linux root evidence or a committed full-graph archive. No production/package/device acceptance is expanded.

## Negative trace reproduction at 1e9da66; high-cost tracing removed

Normal PR CI 43669494382 passes coverage 1225 / four inherited skips, then source has 1100 pass / six Firefox failures / four inherited skips. These are the three environment/cancellation cases, removed-iframe capture lifetime, and opened SVG source lifetime with and without a font. Normal push CI 43669490573 has 1101 pass / five Firefox failures / four inherited skips: the same set except removed-iframe capture lifetime. Neither runs package tests. This is broader than the previous pair and is preserved as such.

Both separate Firefox-only traced reruns pass 368 / two inherited skips; all four recorded primaries and their supplementary rows collect. The traced process differs in logging/file-system activity, engine concurrency, browser lifetime and execution order. No failed retained object is captured in this trace, so it establishes neither a retaining root nor a production fix. The roughly 463 MB PR and 535 MB push ZIPs advertise nested compressed graph archives, but those full graph archives were not downloaded. A range reader instead extracts and CRC-checks all other entries: PR 84 selected entries using 186867 network bytes; push 82 entries using 190043 bytes. ZIP indexes, selected-file SHA256s, ordinary and traced records/logs, per-collection filename sequences, exact five inputs and the range reader are preserved in the 178-file root-trace-pair-selected archive. Six archives now verify 360 files. Do not call this a full-graph archive.

The temporary high-cost tracing step and per-request tracing metadata are removed after this negative reproduction, returning those two files byte-for-byte to b746718. The smaller branch-only paired observations remain draft investigation settings, still requiring removal before any eventual merge. Production and package bytes remain unchanged. The ordinary failures remain unresolved; the goal is active, and #585 qualified paint bases and other independently reproducible boundaries remain open.

## No-new-collection checkpoint

The next diagnostic samples the original weak reference at helper entry, after a Promise microtask, and after one zero-delay timer task boundary, before creating supplementary owners or asking for further collection. It makes zero explicit GC requests. The original primary boolean was already cached and remains the assertion gate. Entry itself can differ from that earlier sample because command/module loading can cross task boundaries. If an object observed at entry survives a microtask, that is the WeakRef kept-object control; a later change without a new explicit request would support delayed cleanup/sampling, not necessarily identify which native collection ran. Natural GC is not disabled, and elapsed time/order are not held constant. A negative result cannot rule out cleanup after more tasks.

Mac lint/types and the same twelve existing tests pass. All nine originals are already collected at all three samples. Held-object controls survive, microtask results match entry, and freshly allocated canaries remain in the absence of a requested collection. No Linux inference is drawn. The seventeen-file no-collection-local archive preserves exact inputs, nine records and three logs; seven archives now verify 377 measured files. Runtime source, built packages, primary helpers/counts/timeouts and inherited skips remain unchanged.

## Zero-new-GC Linux result at 31e2952

Both jobs still fail the three Firefox environment/cancellation cases. Every affected original remains at helper entry, after the microtask and after one timer task, with zero explicit GC requests; canaries remain, held controls survive. This does not support adding one task delay as a fix. Source PR CI 43670467884 is 1103 pass / three Firefox failures / four inherited skips; push CI 43670464573 is 1100 pass / six failures / four inherited skips, adding two opened-source Firefox cases and WebKit frozen source. Both coverage suites pass 1225 / four inherited skips; packages do not run. The previous 1e4c799 push CI 43670168332 passes the full 1225/1106/159, while PR CI 43670171072 fails the three Firefox cases. The checkpoint-runs archive preserves all four runs' artifacts/logs/metadata and exact inputs, in 134 files.

## Lower-overhead CC-only trace with explicit configuration control

The actual installed Firefox accepts MOZ_CC_DISABLE_GC_LOG=1: a local three-engine focused run writes only CC graphs, no full GC graphs. Without the graph-writing configuration, local sandboxed Firefox writes no graphs; this failed plumbing attempt is not a successful collection. Therefore the next separate branch-only execution first runs the unchanged three-engine source suite with that configuration but no logging. Only if it still fails does a second three-engine run add CC-only logging. Ordinary records, configuration-control records and CC-trace records use distinct directories. The original normal gate remains authoritative, and all three engines retain their original assertions and concurrency. There is no per-collection file I/O; graph inventory/timestamp are added only when reporting a completed diagnostic sample. Logging/configuration/process-order differences remain limitations, and a passing diagnostic is never a fix claim.

Local lint/types and twelve original tests pass. The actual phase run generates only CC files, with no incomplete files; the eighteen-file cc-only-local-selected archive retains input bytes, nine records, three logs and a complete SHA256 graph manifest. The full passing Mac graphs remain local output, not a committed graph archive. The nine archives now verify 529 measured files. Both new workflow steps, reporting phases and branch-only diagnostic settings are temporary and must be removed before any eventual merge. No production or package change, device acceptance expansion, npm publication or old contributor action.

## 20b841a configuration control passes; order confound now measured

Normal PR CI 43671204701 fails three Firefox source cases (1103 pass / four inherited skips); normal push CI 43671201382 fails those plus two opened-source Firefox cases (1101 pass / four inherited skips). Both coverage suites pass 1225 / four inherited skips; packages do not run. Both subsequent three-engine, no-log graph-writing-configuration controls pass all 1106 / four inherited skips, and both CC-only steps are skipped. No graph is generated remotely in this pair. The 92-file cc-configuration-pair archive preserves all artifacts/logs/metadata and exact inputs, plus the installed sequencer excerpt/identity and observed per-engine completion sequences.

The installed Vitest 5.0.5 BaseSequencer sorts cached failures before cached duration. In both normal runs the resource cancellation file completes fifth in Firefox, while in both controls it completes first. These logs measure completion order, not exact start order, but together with the installed sorting code they expose a confound: the later run does not receive the same sorting inputs. Neither configuration nor CC logging can receive causal credit for passing retries.

## Restore identical sorting inputs before any control

On this investigation branch only, the normal step still runs coverage followed by source, with a snapshot of Vitest results.json between them. Before any later source phase, restore only those result-cache files and verify their SHA256s. Optimized bundles are untouched. First repeat the same source configuration without changing the graph-writing flag; only if it still fails does the graph-writing configuration control run, and only its failure enables CC-only logging. All source phases use the identical package script. Records remain separated, and normal failures remain authoritative. This controls the sorting input, not wall-clock, process lifetime, or every scheduling difference; no fix is claimed.

Local lint/types and twelve original three-engine tests pass; the cache snapshot/restore round trip matches SHA256 and the new report namespace works. The 23-file order-cache-local archive preserves six exact inputs, five logs, cache snapshot/receipt and nine observations. Eleven archives verify 644 files. The original GC command and two primary test files remain byte-identical. The helper, diagnostic phases/steps and branch settings are all temporary and must be removed before eventual merge.

The additional order-cache-real-restore.json receipt verifies a real mutation: the focused Vitest execution changes results.json, then the helper restores its exact original SHA256. This supplements the earlier unchanged-cache round trip without replacing its raw archive.

## Identical sorting inputs preserve the failure; tracing still changes it

At 6b6150a, ordinary PR CI 43672198368 is 1225 coverage pass, then 1103 source pass / three Firefox failures; direct-head push CI 43672195617 is 1225 coverage pass, then 1102 source pass / four failures, adding WebKit frozen SVG source. Four existing skips in each suite remain unchanged; neither runs packages.

For each event separately, the pre-source sorting manifest, saved bytes and all three restore receipts match their SHA256s. The same-configuration repeat and sandbox-configuration-only repeat both fail the three Firefox cases (1103 pass / four skips), while CC-only logging passes 1106 / four skips in both events. Therefore the earlier green configuration retry cannot establish a fix; restored sorting inputs remove that particular confound, and logging still perturbs the outcome. The 149-file frozen-order-pair archive contains all non-graph artifacts, logs, cache bytes/receipts, exact inputs, analysis and two selected complete CC graphs.

The full PR inner gzip was downloaded, read to EOF and indexed: 150 CC files, 458889508 uncompressed bytes, no full GC files. This repository retains its complete manifest and two selected graphs, not all 150 graph bytes. Push graph bytes were not downloaded; its selected non-graph extraction and ZIP index are preserved. The parser reports 1006 private-document observations, 34 not marked garbage, including twelve srcdoc observations in two logs. These are observations, not counts of distinct leaks. WantAllTraces is false, and unsupported WeakMapEntry value=(nil) lines limit root reconstruction.

One selected transient srcdoc is reached through an orphan SVG use with an unknown refcount edge; another is reached through ImageData, a scrollbar-fixture module/global and a document wrapper. Every original primary in the logged execution collects, and no identity ties these roots to a failed ordinary primary. The unprobed case also fails in the ordinary runs, so an SVG-only hypothesis cannot explain the full failure set.

## Native controls for the unprobed failure

Six extra native owners are created only after the unprobed primary has been sampled: sandbox only, the production resource-policy document (CSP meta plus its minimal base style), both, fulfilled-Promise reaction only, reaction with both, and that last variant with the post-load image lock. Existing native/library owners and all three observation helpers remain. The policy-document case groups the CSP and base style; a failure there would require a separate style control before crediting CSP alone. These comparisons change no production function, a primary test file, the collection command, three primary requests, timeout, assertion or skip.

The Mac focused twelve tests and full lint/build/types/packed consumers, 1225 coverage / 1106 source / 159 package tests pass (four/four existing skips). Eighteen full-run records hold 306 supplemental observations, including 36 new native observations in each suite; all observed supplemental documents and canaries collect, with no observer errors. There is no Mac reproduction or new WebKit/device GC claim. The 31-file native-controls-local archive includes the full logs, all eighteen records, exact seven inputs and 96 production/runtime hashes. Thirteen archives verify 824 raw files.

The automatic sandbox-only and CC-only workflow steps are now removed after their negative causal result. Ordinary runs and one repeat with identical sorting inputs remain, preserving failures and three-engine concurrency. The new native-owner results still require ordinary Linux execution. All branch-only diagnostics must be removed before any eventual merge. No production fix, npm publication or old contributor PR action is claimed.

## Ordinary Linux results for the native controls

At exact head 9a391dc, PR CI 43677392127 and push CI 43677387222 both pass 1225 coverage / four skips, then fail three Firefox source cases (1103 pass / four skips); packages do not run. Restored sorting bytes match in each event. The same-configuration repeat still fails those three cases in PR but passes all 1106 / four skips in push. Across both events and phases, the 216 new native observations all collect without errors. Therefore those configuration/Promise mechanisms alone do not reproduce the original retention. This does not isolate one root or rule out interactions with other execution state.

The 93-file native-controls-linux archive retains all uploaded artifacts, both full CI logs and metadata, exact five inputs, parsing helper, phase records, cache restore receipts and summary. Fourteen verified archives now preserve 917 raw files. The production source and original conditions remain unchanged. Local Docker Desktop has been started for a separate Linux control; no container reproduction is claimed before its own verified result.

## Local Linux reproduction and rejected simple controls

A separate Docker Desktop Linux VM on Apple Silicon runs the official linux/amd64 image `mcr.microsoft.com/playwright@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f` (amd64 manifest ee15712262f017b8157421b212b12099146645f44b1bc5c0514cbbe6a229b1d0). This is emulation, not the GitHub runner. Exact checkout 9a391dc uses Node 24.22.2 / pnpm 10.34.9 / Playwright 1.64.1, matching the remote tool versions. Effective parallelism is four under a four-CPU quota, though os.cpus lists fourteen; RAM limit is 6 GiB and shared memory 1 GiB. Browser versions are Chromium 156.0.8078.80, Firefox 157.0 and WebKit 27.2.

First baseline passes lint/build/package entries/types, then coverage fails one Firefox removed-iframe snapshot lifetime check: nativeCollected=true, capturedCollected=false; 1224 pass / one fail / four skips. The source and package-browser steps do not run. A separate focused run passes eleven / one inherited skip. A separate full source run passes 1106 / four skips after restoring the cache saved after failed coverage. That is a diagnostic, not the CI path after passing coverage, and does not replace the failed baseline.

Resetting only results.json reproduces the exact coverage failure. With identical empty sorting input and retained optimized bundles, a shared diagnostic config then tests: no added synchronization, a pre-GC Frame round trip, and a pre-GC MessageChannel task. All fail the same check. A timeout:0 option only in captureFrame also fails; harmless whitespace preserves its test-file byte length, avoiding size-sort changes. Finally, changing only the clone document creator from source.implementation to the library document.implementation also fails. All seven complete coverage runs report 1224 pass / one failure / four skips. Original assertion conditions and three collection requests remain; no delay, retry-based pass or production fix is claimed. All experimental source/config/test files are restored to 9a391dc afterwards.

The 321-file local-linux-controls archive includes all seven full logs, the two separate passing diagnostics, phase-specific artifacts, sort receipts, actual variant inputs/diffs, restored input hashes, exact baseline sources, official image manifest, container limits/runtime and setup logs. Fifteen verified GC archives now retain 1238 raw files. The separate native style/font archives are not counted in that GC total.

To replay, create an isolated container from the pinned image, fetch exact commit 9a391dc, install Node 24.22.2 in a separate prefix and put its bin directory first in PATH, install pnpm 10.34.9, then use `pnpm install --frozen-lockfile --ignore-scripts`. With GC_OBSERVER_DIAGNOSTICS=1, run the baseline lint/build/package-entry/types/coverage scripts in order. Coverage failure must stop the baseline. The archived config, reset helper and explicit controller inputs reproduce each separate diagnostic; preserve each failure and restore the original sources between ownership/timeout controls. Do not overwrite the baseline with a later green result.

The pinned Playwright type declaration at playwright-core@1.64.1/types/types.d.ts:4401 and the [official API contract](https://playwright.dev/docs/api/class-page#page-request-gc) describe collection as best-effort. This does not establish a library root or justify discarding a failure. Next inspect actual retaining paths after caching a failed primary, without enabling heap logging before collection. No new physical-device acceptance or npm release.

## Recovered post-failure evidence, 2026-11-19

The 93-file recovered-postfailure archive retains complete F1/G1/H1 logs, bounded version-2 graph (54 nodes / 195 edges, no target match/error), positive-control scripts/results and an interrupted native I2 log. A fresh native I3 complete coverage run passes 1225 / four skips with the archived 4520-byte native-style.test.ts at source 9a391dc, original config, pristine Firefox and an empty sorting cache with optimized bundles retained. It replaces only the failed helper's capture operation with native computed-style copying/XML serialization and retains the empty renderer; original three GC requests, assertion and output checks remain. This narrows the next paired experiment, not a production fix or a causal isolation. The graph starts from capture/renderer after the cached primary failure; its comparison target is held only afterwards and excluded from roots. Missing host-only Firefox patch sources/ZIP cannot be recovered from this archive, so full graph replay is not claimed.

Replay the native subset in the already documented isolated 9a391dc environment: preserve the previous inputs/cache and replace only test/browser-unit/capture-lifetime.test.ts with the archived native-style.test.ts (4520 bytes). With results.json absent and optimized bundles retained run GC_OBSERVER_DIAGNOSTICS=1 pnpm run test:coverage; preserve complete log and artifacts, then restore the original test. A restored-library run in the same current environment is still required; do not substitute older baseline failures or weaken GC assertions.

## Matched clone reduction

The matched-clone archive preserves complete J1 library / K1 clone-only / L1 native-pseudo coverage runs. J1 and K1 each fail only the original Firefox removed-iframe GC assertion (1224 pass / four inherited skips), nativeCollected=true and capturedCollected=false; L1 passes all 1225 / four skips. All fixtures remain 4520 bytes. J1 differs from the previous native I3 fixture only in captureFrame(false) and padding, K1 calls cloneNode directly and serializes before returning a native string-backed result, and L1 reads both computed pseudo contents in the otherwise native copy. K1 fails before its image output assertion; this is no image-output pass. L1 omits redundant xmlns assignment to retain byte length, so its result alone is not a one-variable causal proof.

Replay separately at exact 9a391dc in the documented isolated container: preserve current inputs/artifacts; install one archived stage fixture at test/browser-unit/capture-lifetime.test.ts, record config SHA, save/remove only the Vitest results.json, retain optimized bundles, then GC_OBSERVER_DIAGNOSTICS=1 pnpm run test:coverage. Save the terminal result before the next stage, and restore the original test afterwards. The archived input receipts preserve previous sorting bytes. These local emulated coverage reductions are not remote/current-branch or iPhone gates and establish no production fix.

## Native document context controls

The native-operations archive contains M1 source.implementation.createHTMLDocument().importNode(node,false), O1 main document.implementation plus importNode, and P1 source.implementation.createHTMLDocument().body without importNode. Each fixture is 4520 bytes.
M1/P1 fail only the original Firefox iframe GC assertion (1224 pass / one failure / four skips), nativeCollected=true, capturedCollected=false; O1 passes 1225 / four skips, including output. M1/P1 output assertions after the primary failure are not reached.
These are native result builders without library clone/capture in the measured scene; an empty renderer remains. Earlier full-library creator-change E1 still fails, so this subset does not establish a library fix or a universal native leak.

Replay in the pinned isolated exact-9a391dc environment: install one archived fixture as test/browser-unit/capture-lifetime.test.ts, preserve current inputs/config hashes/artifacts and sorting results, remove only results.json, retain optimized bundles, then GC_OBSERVER_DIAGNOSTICS=1 pnpm run test:coverage.
Save the complete terminal log and artifacts before changing stages and restore the original test afterwards. Do not change assertions, three requests, timeouts or inherited skips.
The archive also preserves complete logs/metadata/uploads for a94c02d PR CI 44364243412 success and 93d83ee PR CI 44365244006 failure. These remote executions are separate from the emulated controls and neither establishes a GC fix.

## Native baseline counterexample

Q1 adds an unused source.implementation property read to the native I3 helper; S1 restores the exact bytes of the previously passing I3 fixture. Both complete coverage runs fail the same original Firefox iframe GC assertion (1224 pass / one failure / four inherited skips), nativeCollected=true, capturedCollected=false. Output assertions after this failure are not reached.
Consequently earlier creator/import/read contrasts are individual observations, not stable isolation of a necessary or unique cause. No production root or fix is established. Inspect native-copy and test/Promise retaining contexts, not only the renderer/capture roots of the earlier bounded graph.

The native-baseline archive preserves both full logs/artifacts, 4520-byte stage fixtures and input/cache receipts. Replay each in the pinned exact-9a391dc isolated environment using the same reset-only-results procedure and GC_OBSERVER_DIAGNOSTICS=1 pnpm run test:coverage; restore original test afterwards. No additional requests or relaxed conditions are required.
Pinned upstream source revision fdd757a2e09c9471cddf383e64e631e4ce178499 comes from the Playwright v1.64.1 UPSTREAM_CONFIG.sh. Document caches implementation, and implementation owns document; both participate in native CC traversal/unlink. Source ownership edges explain a cycle but do not identify a rooted path or why this patched binary failed collection. Original source/license headers and download hashes are preserved.

## Heap tool controls only, pause checkpoint

The 30-file heap-tool-controls archive contains the final Runtime/Juggler source patch, ZIP rebuild script, positive driver, before/after hashes, raw positive heap snapshot and JSON, failed tool attempts and cleanup receipt. Full omni ZIPs are excluded; rebuild from the original official-image hash and archived source using build.py. The final driver needs /work/node_modules/playwright in the isolated pinned container. Install the patched omni only into that owned container, copy positive.cjs into /work/.codex-linux-control and execute with the documented Node24 PATH; capture JSON/raw snapshot before browser cleanup and restore the original omni afterwards.
The parent passive IPC handler calls official notifyDevToolsOpened/Closed only during explicit snapshot creation and balances false/true/false in the control. It does not remove the parent guard. Snapshot-time object movement requires post-snapshot IDs; direct proxy-target/census mapping resolves the HTMLDocument rather than its privileged wrapper.
Positive capture ownership includes knownOwnedDocument. The independent negative has three returned paths, all classified with explicit weak/conditional WeakMap/Debugger.Object referent labels. Keep raw paths and their maximum-20 limit; no complete unreachability or unique retaining-root claim follows. The known strong positive survives that classification.
No actual failing suite has been captured by this tool. Before future use verify patched-browser/no-hook behavior separately, cache original primary verdict first and record observer-introduced target/probe/wrapper roots. This checkpoint restores pristine Firefox/source/config/test, stops the owned container and pauses at the user's request.

## Resume with a cold engine, 2026-11-24

The heap-resume archive contains complete d75d622 PR/push failure logs/metadata/uploads plus a proposed after-verdict hook. PR CI 44369692907 passes 1234 coverage then fails five Firefox source checks (1110 pass); push CI 44369678841 fails three (1112 pass). Both retain four/four skips and do not run browser-package tests.
The former Docker container/images are absent in the resumed engine. The original pinned amd64 image pull is still live; the archived image-pull log is only a partial checkpoint. Do not treat old environment outcomes as a rebuilt baseline.
The hook generator reads exact 9a391dc original source/config, keeps its original assertions/three requests and 4520-byte test size, and invokes the heap tool only after capturedCollected=false is cached. The Node command writes a before-heap receipt containing those booleans before inspector work; tool errors must be recorded separately. Probe/target references are introduced after the primary and remain explicit limitations.
Only esbuild syntax parsing has passed. The hook is not runtime/type validated and has not captured an actual failure. Finish the pinned image pull, install the previously recorded Node24.22.2/pnpm10.34.9/frozen dependencies, verify browser/pristine hashes and a patched/no-hook baseline before trying the hook. Keep new cold-environment results separate from historical runs.


## Actual failed-suite capture, then pause

See [heap-actual-summary.json](heap-actual-summary.json), its index and raw archive. This is a historical source checkpoint 9a391dc5639ab80085d73e411ffea5738279d201,
not current master acceptance. The original library, built outputs, primary
assertions, three collection requests, timeout and inherited skips are unchanged.
U1 is patched-browser/no-hook; V1 adds inspection only after the primary diagnosis
is cached. Both complete coverage executions fail the same removed-iframe case:
1224 pass / one failure / four inherited skips. The Node before-heap receipt is
preserved. The initial type-stripping generator failed types before testing;
the corrected generator preserves declarations, and types pass before V1 runs.

To reconstruct in a separate owned environment, fetch the pinned source into
source-seed.git with a shallow exact checkout, then use rebuild.sh as the recorded
bootstrap recipe. That script expects its original output/playwright path; adapt
paths to your extraction location. The 54MB Git seed is intentionally excluded.
Pull the exact amd64 manifest recorded in rebuilt-provenance.json. Install frozen
dependencies with ignored scripts and the recorded Node/pnpm. Verify pristine
Firefox omni.ja hash before using tool/build.py; copy it alongside the archived
original Runtime/Juggler sources, rebuild, and verify patched-manifest.json.
No 44MB original/patched omni binaries are included; they are recoverable from
the pinned image and deterministic ZIP replacement recipe.

Runtime and controls are runtime.cjs and tool/positive.cjs. U1 uses pristine source
fixture/config with only the passive browser patch. V1 copies the final typed
capture-lifetime-hook.test.ts and vitest-heap-hook.config.mts. Run types before
coverage, clear only previous sort-result bytes using reset-container-sort.mjs,
and retain its cache/input receipt. Do not run builds or edits during a measured
suite. Full source and browser-package suites were not run after coverage failed;
rebuilt-entries.log is package entry/consumer validation, not browser packages.

The snapshots are rebuilt-positive.fxsnapshot and
v1-artifacts/heap-path/coverage-firefox.fxsnapshot. JSON contains raw shortest
paths (max 20 per start), including weak and inspector edges. The separate
classification preserves every returned path. WeakRefObject::target is weak even
without a literal [weak] prefix, per the pinned upstream source. The global
__codex_heap_probe and explicit raw-wrapper holds are introduced after the primary
failure. A native preserved-wrapper root remains unresolved and requires a
native CC graph; it is not evidence of a unique library holding root.

v1-logs was copied before the final input rehash: its inherited final-input file
is the U1 baseline. Use v1-inputs-sha256.json and u1-v1-input-comparison.json for
the actual V1 hashes. Across 103 measured inputs only fixture and config differ.
No new remote CI or physical-device result is credited to these local runs.
pause-cleanup.json confirms tracked source/config/fixture and original Firefox
bytes restored, owned container stopped, and no system Safari/device operation.


## Native holder and WeakRef-only capture

See [native-holder-summary.json](native-holder-summary.json) and its raw archive.

Historical exact source 9a391dc, not latest-master acceptance. Six complete
coverage runs are preserved separately: W1/X1/Y1/Z1 pass 1225 with four skips;
identical measured input repeats X2/Z2 fail the same original removed-iframe
case (1224/one/four). Production and built inputs do not change. Input hashes do
not claim whole process/cache/timing identity. Source and browser-package suites
were not run in this experiment. Remote 913014e failures are independent.

V4 removes the probe's direct target member but explicitly holds raw target.
V5 carries only the existing WeakRef, capture and negative. Its heap graph finds
the actual HTMLDocument through the two-edge wrapper/WeakRef target path; no
new target dereference or strong hold is introduced. Extra CC logging follows
the cached primary failure and heap, and never substitutes for the assertion.

Build tool variants from the original Firefox omni.ja supplied by the pinned
image and verified by original-manifest.json; build.py replaces Runtime/Juggler
entries. Binaries and original Git seed are excluded. See heap-actual archive
for environment bootstrap. Each variant's passive/no-hook control precedes its
typed hook runs. Scripts positive.cjs provide known ownership and an independent
negative; all uploaded remote artifacts and actual GC/CC logs are preserved.

Replay offline analyses with analyze-cc.py or analyze-gc.py: each takes heap JSON,
matching CC/GC log and output JSON. Complete ordinary rows parse with zero unknown
rows and matching node IDs. WeakMap records are retained separately, not assumed
to be ordinary edges. A finite graph is not a complete runtime proof.

Important parser control: the raw independent negative DOES have a path through
realm debugger/remote-object ownership to the deliberately held positive. The
initial negative-none assertion failed. Raw privileged and content starts remain
in the report; a separately labelled observer-qualified view finds known member
ownership and no application-member path from negative. Never present the raw
negative as unreachable. Undecorated cacheir-weak-* fields remain conservative:
the pinned compiler traces those fields strongly for IonICStub, so their names
alone cannot justify filtering. Known [weak], WeakRef target and conditional
WeakMap edges have explicit separate policies.

For actual Z2, both conservative capture/negative paths are absent under that
policy; five gray native preserved-wrapper roots remain. The exact native holder
is the source Document, RC=6, with window/font/fragment/DOMImplementation/node-info
cycle edges. AllTraces traverses weak edges and black nodes and affects visibility;
these graphs do not identify a unique original retaining root. Ordinary CC and
conditional/native ownership need further evidence. Do not call this a fix.

The original browser, tracked config and fixture are restored. Container is left
idle, all measured processes terminal; goal active. No phone/system Safari used.


## Ordinary CC and compiled-accessor witnesses

Historical source 9a391dc, not current-master acceptance. Eight complete coverage
runs preserve four failures (A1/B1/C1/E2:1224/one/four skips) and four passes
(D1/D2/D3/E1:1225/four skips). Original gates unchanged. Source/browser packages
not run. See input-comparison.json for 103 exact source/built/config hashes;
these do not prove entire cache/process/timing or browser-tool identity.

Base ordinary tool creates a CC logger without allTraces after cached verdict and
JS heap. B1's target and holder are absent from ordinary CC; known-held positive
is also absent. Do not call absence collection success. The full JS GC log has
a black target and concrete module -> px -> property CacheIR shape -> source
Window -> source Document path. E2 has an analogous cloneSingleNode path; C1's
explicit dimensions still fail with an ambiguous cacheir-weak-shape path through
cloneCSSStyle. root-witnesses.json saves exact addresses, script URLs and paths.
Parsers keep undecorated CacheIR fields conservative and preserve raw observer
paths/qualified views, as described by the previous native-holder archive.

Crucial timing correction: Playwright sets Firefox userPrefs in Browser.enable
after initial Juggler startup. Startup true values are not proof off settings were
ignored. D1 has only launch configuration, D2 only early startup values. Final
pref-tool logs after Browser.enable and also records actual content engine JIT
options. D3 verifies three enable flags=0 and passes; E1/E2 verify flags=1, with
E1 pass and E2 failure. No deterministic iff claim or source fix follows.

The probe never dereferences the target again but still unwraps capture/negative;
transitive ungraying/observer effects remain. Graph witnesses are after cached
failure, not proof of pre-inspection cause. Next remove these application-object
exposures before promoting a retaining path to a root-cause diagnosis.

Two native simplifications (eval and HTTP ESM) load no library. Cold/warm/default/
disabled cases all collect native and read-probed documents; simple/strong
controls valid. This negative evidence rejects a universal getter-only cause.
Eval onload resolves Event; HTTP ESM uses the void callback matching the original.
Neither reproduces full-suite module/inert-document/coverage context. Their
servers/pages/browsers close, and no failure heap exists because all collect.

Rebuild browser patches from pinned pristine omni.ja and build.py, preserving
the original ZIP entries, Runtime/Juggler and optional BrowserHandler replacement.
No original/patched 44MB ZIP binaries are committed. Base tool hash/source and
final pref-tool hash/source are explicit; D2's intermediate binary hash is a
recorded gap, not inferred acceptance. Build-post-enable.py preserves the
intermediate recipe; default-positive-control preceded that addition. Use
pref-tool/current build for D3/E1/E2. All use ordinary Runtime version6 semantics.

Actual suite configurations: vitest-heap-hook.config.mts for B1/C1/E1/E2 and
vitest-no-jit.config.mts for D1/D2/D3. C1 copies only explicit-size fixture; its
generator's extra config is unexecuted. Types pass before changed typed variants.
Reset only previous sort results with the archived helper, preserve receipts,
and never edit/build while a measured suite is running. Source/built bytes
unchanged, full coverage runs distinct; normal package/device gates not claimed.

Source-inputs are exact 9a files matching measured hashes. Provenance is shared
with the pinned heap-actual/native-holder environment. Remote exact 53de33f PR
and push both fail three Firefox source checks (1234 coverage /1112 source,
four/four skips, packages not run); complete logs/artifacts/check readback saved.
No npm or old contributor PR mutation. Original Firefox and tracked source/test/
config restored; owned container idle, all measured processes terminal; goal active.


## Existing-WeakRef-only capture

Historical exact9a source, not current master acceptance. F1 passive/no-hook passes
1225/four inherited skips; G1 fails the original Firefox removed-iframe primary,
1224/one/four. Types pass before G1. All production/built inputs are unchanged,
fixture remains4520bytes; original three requests/assertions/timeouts/skips remain.
Full source and browser-package suites were not run.

The hook exposes only {__codexHeap:true,reference}. The browser patch unwraps only
that existing WeakRef, not capture/renderer/negative/source. Target identity uses
the recorded two-edge wrapper/WeakRef path. Primary failure is cached before
inspection; extra ordinary CC is diagnostic only. Positive known member ownership
and a separately collected WeakRef validate identity; the latter has zero direct
document target candidates. Raw graphs and prior sampled booleans are retained.

Full ordinary-edge GC search parses all rows/IDs and retains undecorated CacheIR
fields conservatively. G1 has a black source HTMLDocument and86 module-root
witnesses, including px -> explicit property CacheIR shape -> source Window ->
Document. It persists without capture-object unwrapping. This is not a unique
pre-verdict cause or a proof every observer effect is absent. Parsers preserve
conditional WeakMap records separately and raw roots without asserting runtime
unreachability. Application object starts are intentionally not inspected.

Rebuild from pinned original Firefox omni.ja with build.py and preserved original
Runtime/Juggler/BrowserHandler entries; no44MB ZIP binaries are included. Version7
uses ordinary CC and current pref/engine metadata as in ordinary-cc. Generate the
typed hook with build-hook.mjs; use the checked-in archive's final config, which
copies primary/heap/GC/CC artifacts. Environment/hash/reset helpers are preserved.
Do not build/edit during a measured suite. Helper controls run before baseline.

Exact896416a PR CI fails three Firefox source cases after1234 coverage passes
(1112source/four-four skips/packages not run), complete artifacts saved. Push is
still downloading browser engines at its recorded readback: no terminal result
or complete push log is claimed. The separate size-label action fails with HTTP406
on the full diff's20000-line API cap. Its independent repair is the next action.

Firefox and tracked config/fixture/source restored, container idle, all measured
local processes terminal; no system Safari/phone used. Goal active, no GC fix.


## Remote existing-WeakRef probe, 2026-11-24

The investigation branch now carries its reversible Linux/Playwright1.64.1
installer and known-held/collected-reference controls. Run the installer before
starting measured browsers, then the controls:

```sh
python3 scripts/firefox-gc-reference-probe.py install
node scripts/firefox-gc-reference-controls.cjs
```

`GC_REFERENCE_PROBE=1` enables the BrowserCommands handler. It persists the
cached primary receipt first, then inspects only the existing WeakRef and copies
the raw heap and ordinary GC/CC files. Environment hooks precede the older
supplemental observer controls; pending-font hooks precede retainedTree and its
extra diagnostic collections. Removed-iframe capture has the same failure-only
hook. Primary booleans, assertions, three collection requests, timeouts and skips
are unchanged. Later supplemental observations can be affected by this extra
inspection/CC and must not be treated as untouched originals. No production
runtime change is included. Readable hooks change test byte lengths: this is not
an identical ordering/process/timing control.

Artifacts use separate coverage/browser, case and primary/repeat names beneath
`.vitest/attachments/gc-reference-probe/`. Inspection errors are separate files;
a diagnostic repeat cannot replace the original failed CI step. CI installs the
probe only on the owned investigation branch, explicitly uploads hidden artifact
paths and always restores the browser before upload:

```sh
python3 scripts/firefox-gc-reference-probe.py restore
```

The installer checks the original browser and all three source-entry hashes,
preserves archive metadata and verifies every unchanged entry byte. It uses
Firefox's official balanced parent DevTools registration, not a removed guard.
Local standalone controls and a test-frame positive integration both pass,
including copied raw graphs, known owner member and balanced registration. The
existing two test files pass20/skip1 across three engines; they did not reproduce
a failure. Full remote CI is still required. See
[preflight](../gc-reference-remote-preflight.json). The temporary integration test
was removed, tracked container inputs restored and Firefox restored before stop.


### Parent analysis after the remote preflight failure

At8d398dc both PR45333796763 and push45333790744 fail at the tool's child
readHeapSnapshot, despite matching patched browser/source hashes and valid
held/collected primary controls. No measured project suite starts. Both restore
original Firefox. Version8 reads/analyzes saved content-runtime bytes in parent
via primitive file/ID IPC; content retains snapshot creation and ordinary CC.
Standalone controls alone check child read access and persist detailed errors.
No sandbox/JIT setting or original lifetime assertion changes. The repeat source
control now requires the original source step to have actually begun and failed,
avoiding the unrelated absent-cache error after a failed tool preflight. Local
positive/negative and test-frame integration pass, including known member/raw
files, but remote acceptance remains required. Parent analysis does not establish
the application failure's cause. See [preflight](../gc-reference-parent-preflight.json).


### Native parent-opened child log sinks

The571a9ba push45334546135 confirms parent snapshot analysis succeeds and preserves
the known owner edge; the child read check reports NS_ERROR_FILE_ACCESS_DENIED
(2152857621). Direct child forceCC yields no file paths, so the strict tool member
check fails before project suites. PR45334553916 is not called terminal while
browser installation is still live. Version9 uses the native parent
nsIMemoryInfoDumper.dumpGCAndCCLogsToFile(identifier,false,true,callback), selecting
the actual content PID's log pair. Its native IPC sends parent-opened descriptors
to the child without changing sandbox/JIT policy. The normal non-all-traces
collection remains after primary and snapshot; it may affect later state and
other content processes. Original primary assertions/three requests stay fixed.
Local held/collected controls, test-frame integration and complete raw GC parsing
pass; target identity and explicit member join are verified. Snapshot IDs must be
verified in each later GC graph before joining across the extra collection.
See [preflight](../gc-reference-native-logs-preflight.json) and the referenced
[Firefox implementation](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/xpcom/base/nsMemoryInfoDumper.cpp).


### Actual remote source failures captured

At4a70ef0 PR45335352750 tests mergef8028b2. Tool controls/static/build/entry/types
pass, coverage1234/four skips passes, source1112/three Firefox failures/four skips
fails; browser packages do not run. The diagnostic same-configuration source
repeat is also1112/three/four. Original failure remains authoritative; CodeQL
45335352731 passes. The live push45335344685 and older PR45334553916 remain browser
installation at saved readback, with no terminal claim.

All six primary/repeat owner targets are identified without capture/environment
unwrapping. GC rows parse completely and IDs join the pre-CC snapshots. Unprobed
paths run through createSVGStyleEnvironment/nested lockResources script; probed
and pending-font through detectSVGStylePolicy. Each ordinary GC log has an
explicit GetProp cacheir-shape path through private Window/Document. Snapshot
weak-named fields are conservative candidates, not automatically strong edges.
Unknown native ownership and observer effects remain; these are post-primary
witnesses, not a unique original cause or accepted runtime fix. Later native
control retention is preserved, not described as library-only failure.

The offline snapshot parser decodes gzip/length-delimited protobuf with separate
one/two-byte intern tables and the source deserializer's stack/property order.
Complete frames/IDs/referents, document census and all provided Firefox path
steps are cross-checked; actual six files verify374 native paths in total. It
adds no live observation or collection. The full original images/API results and
complete emitted GC graph remain authoritative. See the indexed
[254-file archive](remote-reference-summary.json), including observer versions,
failed remote tool preflights, controls, raw files, complete logs and cleanup.
A future counterfactual must change only the observed private-document access
sites, retain output/primary-lifetime contracts and all full CI/device gates.


### LockResources-only operation-group counterfactual

Five library-free native cold/warm/borrowed/replayed-direct controls all collect
both documents and preserve weak/strong controls, including20000 direct calls.
This is no independent native reproduction or proof of a required JIT tier.
The runtime candidate changes only lockResources: caller/module-document detached
meta creation, module Document head getter and Element append. Policy text/order,
style detector, ownership fields and original test gates remain unchanged.
Local full static/build/package/type gates pass; eight existing focused files
pass149/one inherited skip across three engines with407 measured inputs unchanged
during the run. This does not reproduce the actual remote failures or establish
a necessary accessor/fix. See [preflight](../gc-lock-operations-preflight.json).
Compare normal exact-head remote primary results/paths and keep any repeat
separate; do not infer causality from a lone passing candidate on unstable
baselines. Before acceptance, all output/full package/CI/device requirements and
the broader original issue scope still apply.


### B outcome and A reversal

At1995c32 PR45338308309 tests merge bbe7ad9. Static/tool/coverage1234/four gates
pass; all three original Firefox lifecycle primaries pass in both normal source
and the separate control. Both environments sample nativeCollected=true and
ownerCollected=true; pending-font samples ownerCollected=true with no extra native
diagnostic collection. Normal source nevertheless fails one WebKit frozen SVG
source test (1114pass/onefail/four skips), packages not run; CodeQL45338308376
passes. WebKit collects only after extra diagnostic collection; separate source
passes1115/four but cannot substitute for the failed normal pipeline.

Because unchanged baselines have varied, restore only lockResources to exact
1e5117b/4a70ef0 bytes for an A-B-A reversal; retain B in1995c32 and all original
failure data. Tests/observer/config/three primary requests/deadlines/skips remain
unchanged. Compare actual Firefox results/cache witnesses before attribution;
no single passing B, later WebKit collection or passing repeat is a fix claim.
See [reversal preflight](../gc-lock-operations-reversal-preflight.json).


### A-B-A reversal and the remaining public-source access

B1995c32's original three Firefox private-document primaries pass in both PR/push
normal source and their independent controls. Full PR45338308309 still fails
WebKit frozen SVG source (1114/one/four); push45338301619 fails Firefox removed
iframe plus WebKit frozen detached source (1113/two/four). PR control passes1115/
four; push control still fails removed-iframe Firefox1114/one/four. No package
acceptance or primary-failure waiver follows.

A7e69042 restores exact1e5117b/4a70ef0 runtime bytes. PR45339609829 and its separate
source control fail original three cases1112/three/four after1234/four coverage;
CodeQL45339609828 passes. Six collected targets/GC IDs/snapshots and374 native API
paths verify with no observation/native log errors. Same A push45339605085 fully
passes1234/1115/162, four/four skips. Keep the inconsistent baseline: cross-job
ordering/process/timing is not identical and this is not a deterministic iff.

B's normal/repeat actual removed-iframe graphs both retain the source through
util.px -> explicit GetProp CallNativeGetterResult/shape -> Window/Document; the
saved snapshot agrees, excluding only named observer/explicit weak boundaries.
This accesses Document.defaultView at the site. Do not ignore this separate
failure or the two different WebKit failures merely because private owners pass.

The [342-file archive](lock-counterfactual-summary.json) preserves exact native
cold/warm controls, A/B/reversal source, complete selected run logs/uploads and
all new graphs/analyses.28 archives verify3170 files. A runtime is restored; B
remains recoverable at1995c32. Next test reflective Document access that preserves
original property/method/creation semantics and covers observed defaultView
accesses. Full gates/device/original issue scope still apply; no accepted fix.
