# V2 change-to-test map

Issue / PR 编号、原问题及可回复范围见 [v2-issue-pr-tracker.md](v2-issue-pr-tracker.md)。

Each behavior fix needs an observable regression case. These assertions check
the exported content, pixels, request flow, or package consumer outcome; a
successful Promise alone is insufficient.

| Behavior fixed | Regression case |
| --- | --- |
| Native ESM import and published entry files | `pnpm run test:package` installs the actual tarball in an isolated project and checks ESM/CJS/UMD and types; `test/browser/package.spec.ts` loads built ESM and UMD directly in Chromium, Firefox, and WebKit and checks rendered pixels |
| Style-property options leaking between captures | `renderer.spec.ts`: concurrent style selections and frozen options |
| Pseudo-element property selection leaking between captures | `renderer.spec.ts`: independent `::before` CSS declarations for two captures |
| Resource request deduplication and query identity | `renderer.spec.ts`: pending requests, separate captures, query variants |
| `cacheBust` bypassing a previous capture | `renderer.spec.ts`: fetches again for each capture |
| Blob MIME/quality and full scaled pixel buffer | `renderer.spec.ts`: Blob MIME with zero quality; non-unit pixel ratio |
| Clone transforms, exclusions, SVG descendant filtering | `renderer.spec.ts`: asynchronous transforms, excluded subtree, SVG styles and `filter`, including `foreignObject`; `test/browser-unit/capture.test.ts` cross-browser filter case |
| Iframe body cloned twice | `renderer.spec.ts`: same-origin iframe body exactly once |
| Relative CSS image URL and local fragment URL | `renderer.spec.ts`: relative CSS URL; fragment-only reference |
| Non-404 HTTP failures and resource diagnostics | `renderer.spec.ts`: status 500 rejection; missing resource warning |
| Image embedding error behavior | `on-image-error-handler.spec.ts`: awaited error callback and rejection without a handler |
| Font collection without live CSSOM mutation | `webfont.spec.ts`: used font and source stylesheet; grouped adopted stylesheet |
| Image decode rejection and animation-frame delay | `renderer.spec.ts`: usable decode rejection without animation frame |
| XML-invalid controls and literal textarea content | `renderer.spec.ts`: control characters; textarea markup |
| Nested vertical/horizontal scroll viewport | `scroll.spec.ts`: green visible row and unchanged source offsets; `test/browser-unit/capture.test.ts` and `test/browser/package.spec.ts` cross-browser pixel cases |
| Existing child transform lost during scroll correction | `scroll.spec.ts`: transformed green row visible and original transform retained |
| Scroll layout outside the supported translation case | `scroll.spec.ts`: mixed direct text remains unmodified |
| WebKit initial blank draw | `renderer.spec.ts`: simulated first blank draw; `test/browser/package.spec.ts`: large random image and stabilized pixel on three engines; `test/browser/smoke.html`: native Safari before/after sample |
| CI testing the wrong revision | `ci.yml`: runtime checkout SHA assertion before build and tests |
| Test harness silently accepts broken fixtures or blank PNG | `helper.spec.ts`: missing fixture, invalid image and mismatched size reject; `test/browser/package.spec.ts`: decoded PNG and UMD center pixels, plus large-image markers |
| Visual comparison ignores too much of a small image | `helper.spec.ts`: 20/1000 differing pixels reject, one differing pixel passes; `helper.ts` caps differences at both 100 pixels and 1% of image area |
| Select visual baseline changes with platform font rendering | `select.sepc.ts`: each fixture checks serialized selected option and nonblank pixels; the runtime selection test compares two exports made in the same browser |
| Runtime select changes and duplicate option values are lost during cloning | `select.sepc.ts`: changed `selectedIndex` updates SVG and PNG pixels without changing the source; duplicate values and filtered earlier options preserve the exact selected option |
| Previously skipped canvas, Shadow DOM and CSS failure cases | `basic.spec.ts`, `canvas.spec.ts`, `special.spec.ts`: actual pixels, SVG serialization and failed stylesheet; `test/browser-unit/capture.test.ts`: custom element on three engines |
| Cross-origin stylesheet cannot be read through CSSOM or fetch | `test/browser/package.spec.ts`: second local origin, CSSOM denied, output pixel and warning verified in three engines |
| Two nested scrollers lose combined visible position | `test/browser-unit/capture.test.ts`: combined visible green pixel and unchanged source offsets in three engines |
| A direct sticky header blocks scroll correction for all siblings | `test/browser-unit/capture.test.ts`: source header position, exported red header and green scrolled content in three engines; initially failed with a blue content pixel |

The complete test sequence passed in PR #600's `pull_request` run for a test
merge containing `853d76f`. The checkout assertion now also checks that the
merge's second parent is the PR head. The coverage upload must be verified in
a new run. Real iOS and other complex
sticky/fixed scrolling layouts remain release gates.
