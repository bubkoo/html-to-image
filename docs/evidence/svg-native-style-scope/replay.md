# Native external SVG style verification

The user explicitly selected each current browser's live-page appearance on 2026-11-15. The tested runtime and fixtures are `2a94455aa99cf3da23c62be961a5492535409832`; later evidence-only commits must preserve `input-sha256.json`. This is a scoped follow-up to #585, not its full resolution.

## Desktop

Run `pnpm run test:browser` for lint, builds, types, coverage, all three source engines, tarball checks and built ESM/UMD package checks. The final result is 385 coverage (+1 inherited skip), 797 source (+4 inherited skips), and 144 package tests.

The 27 style cases use real native element screenshots and compare every 8-bit RGBA channel. The independent HTTP `native-policy.svg` fixture selects authored package references, and those references are themselves compared to the actual source screenshots. Production behavior is measured separately with owned Blob URLs in a private document. Main-page geometry rules cannot affect that probe. Scripts and HTTP loads are denied throughout; Blob images are additionally denied before any fetched SVG is staged.

In a disposable checkout with the final fixtures, restoring only `src/svg-references.ts` from `a64b831` produces 53 failures / 31 passes in the same 84 style/dependency checks. Restore the final runtime before continuing. The final 84 pass, with 15 additional HTTP/Blob/script/abort, denied-probe and loaded-font checks, for 99/99. Causal control logs retain the failures from missing resource isolation, missing Blob locking, invalid URLs, font ownership and source-page geometry.

## Physical iPhone

The archived capabilities identify an iPhone with `safari:useSimulator:false`, Safari/iOS 26.6.1. The legacy UA OS token is not used as the actual OS version.

`test/browser/svg-native-device.html` pauses each authored scene before capture. The archived `run-native.py.txt` obtains the original SafariDriver screenshot, locates the independently authored yellow control, samples CSS-pixel centers into 8-bit Canvas ImageData, and resumes capture. There is no palette replacement, resizing, pixel tolerance or synthetic native reference. The original full screenshots are 16-bit sRGB PNGs; the sampled source and exported PNGs are also preserved. All 27 ESM and 27 UMD comparisons pass.

`extra-device-controls.json` separately records default font embedding (both formats, no probe diagnostic) and CSP-denied probes (both formats, preserved existing green pixels plus one diagnostic). The latter checks prevent regression; they do not certify arbitrary stylesheet fidelity under that restriction. The full device smoke has 32 PASS / 2 INFO / 0 FAIL, with server receipt `a83d42d2-d187-4446-b3f9-d1468d04c47c` on the same source commit. The owned session and HTTP server were stopped after verification.

To replay the archived controllers, use the current USB interface address, start `test/browser/server.mjs` on 4373/4374 with `HTML_TO_IMAGE_SMOKE_HOST=0.0.0.0`, and save a new SafariDriver iOS session as the controllers' local `session.json`. Raw session identifiers and device identifiers are excluded from this evidence. This automatic navigation does not certify #398's still-open manual trusted-click/new-tab flow.

## Archive integrity and boundaries

Run `python3 docs/evidence/svg-native-style-scope/verify-archives.py`. Each readable index lists every archive member and SHA256; representative source/capture PNGs remain directly viewable. Packaging the raw evidence avoids GitHub's 300-file monolithic diff limit without removing measured data or changing test assertions. Initial Linux CSS-origin and size-label failures are retained; the fixture now provides a real second origin rather than relying on localhost address aliases.

When source CSP denies the Blob probe, the library retains existing definition embedding and emits a diagnostic. Native stylesheet/fragmentless-root fidelity in that mode remains open. Matching opaque stylesheet rules, external-file CSS imports/fonts, arbitrary font-relative SVG metrics, redirects/relative paint and broader nested-use support remain uncertified. The nested style fixture includes a visible fallback. No npm release or changes to old contributor discussions are included.
