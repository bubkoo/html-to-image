# External SVG font-unit measurement

Measured source and built packages: `7a436c2d5736da563e318d7ed8d27962fc47c3f9`, based on merged #638 (`2aa3cda`). The output rule remains the current browser's live-page appearance. This fixes a font-measurement subset of #585; it is not full SVG or native compositor parity.

CSS-connected FontFace objects cannot be added to another document's font set in Firefox and WebKit. Previously the optional style probe survived that ownership error, but measurement then used a fallback font. A green external rectangle with `width="1ex"` changed width even though its original page font was already loaded. The library now obtains embedded font CSS from the source document through the existing resource loader, permits only data fonts in the isolated measurement document, waits for the requested faces, and evaluates a fresh SVG tree after they load. The fresh tree avoids stale fallback metrics on non-rendering symbols. Source-page font families are identified from the already-loaded set; fetched SVG @font-face declarations are not activated by this preparation. Raw CSS font-face rules are removed from the measurement sheet.

`skipFonts` still avoids font downloads. Explicit `fontEmbedCSS` retains precedence, including when `skipFonts:true`. Font decoding failures produce `external-svg-font-metrics` diagnostics; resolver failures retain their cause and reject. Cancellation, HTTP/Blob/script isolation and removal of the private document remain covered.

## Reproduce

Run `pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/svg-font-units.test.ts test/browser-unit/svg-style-resource-policy.test.ts test/browser-unit/svg-style-loaded-font.test.ts`. Set `SCROLLBAR_BOX_EVIDENCE=1` to save the PNGs and measurement JSON. The same final 33 cases on the old three runtime files from `2aa3cda` produce 11 failures / 22 passes. Restore the candidate files before further work; the baseline execution used `finally` restoration. Candidate: 33/33.

The three font-unit inputs are a loaded 20px original face, that face at 30px, and a system serif control. Each records actual before/after native screenshots, checks source DOM/geometry equality, compares every exported RGBA channel with an independently authored SVG image containing the same original font bytes, and compares use.getBBox width with the serialized rectangle width at CSSOM precision (0.001px). The loaded 20px input additionally requires exact actual-page pixels in all three desktop engines.

Keep the WebKit boundary visible: its 30px and system inputs differ from the native page by 40 and 20 channels respectively, but the independently authored SVG image has exactly those same differences. The library matches that image in every channel. These two inputs are image-reference/geometry controls, not native-page pixel passes. No tolerance, skip or color substitution was introduced. Chrome and Firefox have no such difference in these inputs.

Run `pnpm run test:browser` for all gates. The measured final source passes lint, ESM/CJS/UMD builds, types and tarball/consumer checks, 943 coverage tests (+4 inherited skips), 824 uninstrumented source tests (+4 inherited skips), and 150 built-package tests. ESM and UMD package smoke both include the new scene. A previous full source run timed out in Firefox's explicit-CSS/skipFonts case; its stage was not established. The failure is retained. Global document-font readiness and fixture RAF waits were removed in favor of requested-face promises and bounded resource predicates; the final full run passed without increasing timeouts or relaxing assertions.

## Real iPhone

The same source passed on real USB iPhone Safari/iOS 26.6.1, simulator disabled. The existing 28 native-source screenshot scenes were repeated through ESM and UMD: 56 actual native-photo comparisons pass. Separately, the three new font inputs and two explicit-CSS modes passed through each format: 10 full independent-image pixel controls and real source-width comparisons at CSSOM precision. These 10 are not additional native-screen pixel passes for fractional edges. Default 20px widths were 10.65999984741211 in the native source and 10.66 in serialized CSS; 30px was 15.989999771118164 versus 15.99; system serif was 8.9453125 versus 8.945313.

The complete device smoke is 34 PASS / 2 INFO / 0 FAIL, server receipt `e749911b-2d4f-4eae-8586-82d66a08202a`. Session and server were ended after testing. Actual system version comes from capabilities, not the legacy UA token. The archived controllers resolve the current USB interface address at navigation time. No raw session identifier is included.

## Integrity and other boundaries

Run `python3 docs/evidence/svg-font-units/verify-archives.py`. All 268 raw measured files remain in three deterministic archives with per-file SHA256 indices; representative failed/passing PNGs are directly viewable. `input-sha256.json` ties source, fixtures, configuration and generated packages to this measurement. Remote gates and merge state are recorded in the PR checks and description rather than inferred from local results.

`file-css-observation` independently checks file @import, inline file CSS, file @font-face and a yellow control on the same built runtime. All three exports match their native source and both source screenshots remain identical. Chrome does not load the imported CSS/font in this scene; Firefox requests them but the file rules do not affect the instance; desktop WebKit does not request them. This is a bounded negative control against activating file declarations that the native page did not use, not certification of all external CSS/font loading.

The native SVG-image/compositor gap above, relative paint/redirect bases from #638, opaque matching styles, restricted-CSP full fidelity and broader external SVG/font/iframe/animation combinations remain open. No npm release or comments/closures on old contributor PRs are included.
