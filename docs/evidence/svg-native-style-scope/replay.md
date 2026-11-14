# Native external SVG style verification

The user explicitly selected each current browser's live-page appearance on 2026-11-15. The verified source/fixture head is `56e8a22cf564d21af629d5bf874eec11d59ed691`. Production source and generated packages remain byte-identical to `2a94455aa99cf3da23c62be961a5492535409832`, as recorded separately in `runtime-inputs.json`. Later evidence-only commits must preserve `input-sha256.json`. This is a scoped follow-up to #585, not its full resolution.

## Desktop

Run `pnpm run test:browser` for lint, builds, types, coverage, all three source engines, tarball checks and built ESM/UMD package checks. The final result is 922 coverage (+4 inherited skips), 803 source (+4 inherited skips), and 147 package tests. Istanbul merges the existing Chromium regression fixtures and real three-engine behavior coverage into one LCOV; the three-engine source suite also runs without instrumentation.

The 28 style cases use real native element screenshots and compare every 8-bit RGBA channel. The independent HTTP `native-policy.svg` fixture selects authored package references, and those references are themselves compared to the actual source screenshots. Production behavior is measured separately with owned Blob URLs in a private document. Main-page geometry rules cannot affect that probe. Scripts and HTTP loads are denied throughout; Blob images are additionally denied before any fetched SVG is staged.

In a disposable checkout with the final fixtures, restoring only `src/svg-references.ts` from `a64b831` produces 55 failures / 32 passes in the same 87 style/dependency checks. Restore the final runtime before continuing. The final 87 pass, with 18 additional HTTP/Blob/script/abort, denied-probe, loaded-font and detached-cycle checks, for 105/105. Causal control logs retain the failures from missing resource isolation, missing Blob locking, invalid URLs, font ownership and source-page geometry.

## Physical iPhone

The archived capabilities identify an iPhone with `safari:useSimulator:false`, Safari/iOS 26.6.1. The legacy UA OS token is not used as the actual OS version.

`test/browser/svg-native-device.html` pauses each authored scene before capture. The archived `run-native.py.txt` obtains the original SafariDriver screenshot, locates the independently authored yellow control, samples CSS-pixel centers into 8-bit Canvas ImageData, and resumes capture. There is no palette replacement, resizing, pixel tolerance or synthetic native reference. The original full screenshots are 16-bit sRGB PNGs; the sampled source and exported PNGs are also preserved. All 28 ESM and 28 UMD comparisons pass.

`extra-device-controls.json` separately records default font embedding (both formats, no probe diagnostic) and CSP-denied probes (both formats, preserved existing green pixels plus one diagnostic). The latter checks prevent regression; they do not certify arbitrary stylesheet fidelity under that restriction. The full device smoke has 33 PASS / 2 INFO / 0 FAIL, with server receipt `4f75883d-ef8a-4b4a-b68c-bd72d66d950d` on the same source commit. The owned session and HTTP server were stopped after verification.

The archived controllers now read the current USB address on every navigation (interface en15 by default, override HTI_PHONE_INTERFACE). To replay them, start `test/browser/server.mjs` on 4373/4374 with `HTML_TO_IMAGE_SMOKE_HOST=0.0.0.0`, and save a new SafariDriver iOS session as the controllers' local `session.json`. Raw session identifiers and device identifiers are excluded from this evidence. This automatic navigation does not certify #398's still-open manual trusted-click/new-tab flow.

## Archive integrity and boundaries

Run `python3 docs/evidence/svg-native-style-scope/verify-archives.py`. Each readable index lists every archive member and SHA256; representative source/capture PNGs remain directly viewable. Packaging the raw evidence avoids GitHub's 300-file monolithic diff limit without removing measured data or changing test assertions. Initial Linux CSS-origin and size-label failures are retained; the fixture now provides a real second origin rather than relying on localhost address aliases.

When source CSP denies the Blob probe, the library retains existing definition embedding and emits a diagnostic. Native stylesheet/fragmentless-root fidelity in that mode remains open. Matching opaque stylesheet rules, external-file CSS imports/fonts, arbitrary font-relative SVG metrics, redirects/relative paint and broader nested-use support remain uncertified. The nested style fixture includes a visible fallback. No npm release or changes to old contributor discussions are included.

## Coverage gate evidence

The initial Chromium-only report on df34a14 failed Codecov patch 77.95% and project 85.15% against 86.12%. The real three-engine collector plus imported-CSS/disabled-sheet and detached cyclic-graph behavior controls pass on 56e8a22: patch 87.40%, project 86.33%. The target and pixel assertions are unchanged. Source CI 43630931196 tested merge c3e0eaf6fc3309e6814930910a95220f44acdc7e with that exact PR parent; CodeQL 43630931147 passed. See the archived original failure and source-check records.
