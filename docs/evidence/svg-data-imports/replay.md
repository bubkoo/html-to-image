# Native external SVG data stylesheet imports

Production source: `577243a58a39435db87fdc86872dc60c829e71d0`, based on merged #639 (`270ecb4`). Final fixture source: `cfa7d02b6a63deb0b01da89ad8f5cfa79112d13d`. The contract is each current browser's live-page appearance. This addresses a bounded part of #585 and cancellation ownership related to #560; neither original PR is wholly resolved.

Chrome's native external SVG uses data-URL CSS imports, but a constructed stylesheet discards them. Native Chrome also flattens file/import layer priority in the measured inputs. Expanding imports under standard layer priority therefore still changes the actual picture. The library measures these capabilities using owned SVG probes, parses fetched CSS in an inert document, and expands only active data imports through the existing stylesheet resource resolver. Media, supports, layers, MIME, nested imports, cycles, charset metadata, @charset and BOM decoding are covered. Firefox/WebKit retain their native inactive-file-style behavior. Optional import-probe failure retains the separately measured base style policy and reports a diagnostic.

Private probe CSP allows only owned Blob images and data CSS/fonts, then denies images and autonomous CSS imports before fetched SVG trees are staged. HTTP children of imported data CSS cannot bypass the resource boundary. Caller resolver failures retain their cause. This does not introduce HTTP stylesheet activation or broader file-font support.

Cancellation previously removed neither a pending private frame nor the awaiting continuation when a custom resolver did not settle. The frame now listens for the capture signal throughout its lifetime; resolver awaiting also races that signal and removes its listener afterward. Removing the frame alone is insufficient: with only the resolver race reverted, Chromium and Firefox still retain the private document. Their forced-GC assertions pass with both changes while the foreign promise remains unresolved. WebKit checks cancellation reason, source equality and DOM removal; its native removed-frame GC limitation remains explicit. No device-GC or full SPA-memory claim is made.

## Reproduce

Run `SCROLLBAR_BOX_EVIDENCE=1 pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/svg-data-imports.test.ts test/browser-unit/svg-data-import-resources.test.ts test/browser-unit/resource-resolver-cancellation.test.ts test/browser-unit/svg-import-probe.test.ts test/browser-unit/svg-style-resource-policy.test.ts test/browser-unit/svg-font-units.test.ts`.

The same final 93 controls produce 21 failures / 72 passes with the three changed existing runtime files restored from `270ecb4`; candidate: 93/93. Restore candidate runtime files in a finally block before further work. The 19 new scenes in three engines check exact native-source pixels, independently authored pixels, unchanged source markup and before/after source pixels. Additional controls cover resource ownership, optional-probe failure, cancellation and existing fonts/isolation. No pixel tolerance or new skip is introduced.

The complete local run on production source passes lint/build/types/tarball/consumers, 1015 coverage tests (+4 inherited skips), 896 uninstrumented source tests (+4 inherited skips), and 153 package tests. The final paint-readiness fixture is separately rechecked with the same 93 controls and all 153 package tests; final remote full-suite gates belong to the PR's exact head.

The first remote Linux CI on PR head `48599c0` failed Firefox's uninstrumented cancellation-GC assertion (895 passes / 1 failure / 4 inherited skips); the instrumented coverage stage passed. `remote-ci-first-failure.log` preserves that run. Follow-up diagnostics keep the same strict assertion and inspect native plain frames, shared-font frames, probe-only private frames and the retained document's remaining nodes. This is an unresolved remote discrepancy until the final PR gates and diagnosis establish otherwise.

## Real iPhone

Real USB iPhone Safari/iOS 26.6.1, simulator disabled: repeat the existing 56 actual native-photo comparisons on production source. Final fixture head adds 38 comparisons (19 scenes in each of ESM/UMD), each using before/after native photos: 76 new original photos. All exported RGBA channels and both source photographs agree, as do source markup and the independent references. There are 94 scene comparisons in total, not 132 comparisons; 132 is the number of original photographs. Four separate abort/dispose controls pass while the custom font callback remains pending. Full final smoke: 35 PASS / 2 INFO / 0 FAIL. The owned device session and server were ended.

The first device run exposed a fixture-readiness bug: SVG geometry was available before its first paint, so the first source sample was white and the second red while markup was identical. The fixture now waits two animation frames after the geometry predicate, matching the existing native screenshot fixture; it keeps every source-equality assertion. The first failure log is retained, but its original photos/diagnostic JSON were overwritten by controller filename reuse and are not claimed as archived raw evidence. An attempted universal SVG-use load-event gate timed out in Firefox, and an intermediate marker-edit error also failed desktop tests; both logs are retained. These fixture failures are distinct from the old-runtime 21-failure product baseline.

## Integrity and scope

Run `python3 docs/evidence/svg-data-imports/verify-archives.py`. Baseline, candidate and iPhone archives have per-file byte lengths and SHA256 indices. `input-sha256.json` links final source, fixtures, configuration and generated packages. The device helper requires a locally created session file; no device/session identifier is archived. Controllers resolve the current USB interface address when navigating.

Relative paint/redirect URL bases, native image/compositor differences, opaque matching rules, restricted-CSP full fidelity, HTTP file CSS/fonts and broader combinations remain open. No npm release or old contributor PR comment/closure is included.
