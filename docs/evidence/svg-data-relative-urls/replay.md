# SVG import readiness and opaque stylesheet URLs

Production and fixture source: `7206ada2cea83f9c6fcf3141bab608dfeec0d08c`, based on #640 merge `8f39d751133941a806672cf215d95be28df86151`. Preserve the current browser's live-page appearance. This is a scoped #585 follow-up, not whole-SVG parity.

## Why this follow-up is needed

#640's exact PR head passed CI/CodeQL/Codecov, but its subsequent master CI `43645977092` failed Chromium's supports-active scene during coverage: 1059 passes / 1 failure / 4 inherited skips. Source and package stages did not run. Master CodeQL `43645977070` passed. The retained original artifact reports an import-probe-not-ready diagnostic, 800 differing channels, identical source markup and before/after source pixels, and an independent reference matching native pixels. The failed case took 413 ms, rather than exhausting the five-second deadline. Its original message did not record load state or geometry, so those exact internal values are not inferred from the artifact.

The old probe treated a use load event as sufficient readiness, sampled geometry once afterward, and rejected without retrying if it was still zero. It also waited for that event even when both owned CSS imports had already produced the measured effects. Controlled regressions cover both orderings. With notifications suppressed, the diagnostic-only old implementation reports `load=false; widths=1,1,21,1,21,21` yet discards the valid capability result. Another regression makes the first import geometry sample zero; old code discards that result too. The candidate waits for valid geometry and accepts positive effects from both imports without requiring a notification. The original 5000 ms limit, cancellation check, and expired-probe base-policy fallback remain intact. Failure diagnostics now include load state and measured widths.

A separate real pixel defect affected qualified relative URLs in imported data CSS. That stylesheet has an opaque base, so its relative paint URL is invalid and native Chrome uses the declared purple fallback. Replaying the unresolved text in the private HTTP document incorrectly gave it the page base, fetched a red paint server and exported red instead. Preserve an unresolvable imported URL as `about:invalid`; keep valid absolute URLs and the already-fixed same-fragment behavior. The new input deliberately provides a valid red HTTP target, making accidental rebasing observable. A resource trace permits only an explicit positive-control fetch, not an automatic or library-triggered target request.

## Reproduce

Run `SCROLLBAR_BOX_EVIDENCE=1 pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/svg-data-imports.test.ts test/browser-unit/svg-data-import-resources.test.ts test/browser-unit/resource-resolver-cancellation.test.ts test/browser-unit/svg-import-probe.test.ts test/browser-unit/svg-style-resource-policy.test.ts test/browser-unit/svg-font-units.test.ts test/browser-unit/svg-style-import-parser.test.ts`.

The same final 150 controls produce 4 failures / 146 passes when the two changed runtime files are restored from `8f39d75`; candidate: 150/150. Runtime restoration uses finally blocks. The 21 native import scenes in each desktop engine retain exact RGBA, independent reference, source markup and source before/after pixel checks. Fault controls preserve real unsupported/inactive behavior in Firefox/WebKit. No tolerance, skip, deadline increase or coverage reduction is introduced.

`pnpm run test:browser` passes lint, ESM/CJS/UMD builds, types, tarball/consumer checks, 1072 coverage tests (+4 inherited skips), 953 uninstrumented source tests (+4 inherited skips), and 153 package tests. Final-head remote checks and merge state belong to the current PR's checks and description, not the local report.

## Real iPhone and integrity

Real USB iPhone Safari/iOS 26.6.1, simulator disabled, repeats all 21 import scenes through ESM and UMD: 42 actual native-source comparisons with 84 before/after original photographs. Every channel, source markup and independent reference agrees. The new relative input also makes no paint-target resolver request. Four cancellation controls and full smoke 35 PASS / 2 INFO / 0 FAIL pass. Device session and owned server were ended.

Safari's file CSS remains inactive in these scenes; this is acceptance of that native behavior, not proof of active external stylesheet imports on Safari. Positive active-import corrections are measured in Chromium. No device GC claim is made, and the previous 56 native style comparisons are not recounted as new measurements in this run.

Run `python3 docs/evidence/svg-data-relative-urls/verify-archives.py`. Four SHA256-indexed archives preserve 817 measured files: 252 baseline, 252 candidate, 303 device and 10 original master-failure files. The controller needs a freshly created local session file; no raw device/session identifier is archived. Input hashes cover source, fixtures, configuration and generated packages.

Qualified relative SVG presentation/inline-style URLs in Firefox/WebKit, redirect final-response bases, native compositor differences, opaque matching rules, restricted CSP, HTTP file CSS/fonts and broader combinations remain open. The measured differences between declaration origins rule out a uniform rewrite of every URL to the final SVG address. No npm release or old contributor PR comment/closure is included.
