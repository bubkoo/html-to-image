# V2 change-to-test map

Issue / PR 编号、原问题及可回复范围见 [v2-issue-pr-tracker.md](v2-issue-pr-tracker.md)。

Each behavior fix needs an observable regression case. These assertions check
the exported content, pixels, request flow, or package consumer outcome; a
successful Promise alone is insufficient.

| Behavior fixed | Regression case |
| --- | --- |
| Native ESM import and published entry files | `pnpm run test:package` installs the actual tarball in an isolated project and checks ESM/CJS/UMD and types; `test/browser/package.test.ts` loads built ESM and UMD directly in Chromium, Firefox, and WebKit and checks rendered pixels |
| Style-property options leaking between captures | `renderer.test.ts`: concurrent style selections and frozen options |
| Pseudo-element property selection leaking between captures | `renderer.test.ts`: independent `::before` CSS declarations for two captures |
| Resource request deduplication and query identity | `renderer.test.ts`: pending requests, separate captures, query variants |
| Repeated response `Content-Type` corrupts embedded data URLs | `renderer.test.ts`: failing-before-fix Blob and repeated `Response` header; `test/browser-unit/capture.test.ts`: image and extensionless CSS background pixels across three engines; `test/browser/package.test.ts`: built ESM with an HTTP server sending duplicate header fields, checking joined header, embedded MIME, pixels and unchanged source |
| `cacheBust` bypassing a previous capture | `renderer.test.ts`: fetches again for each capture |
| Blob MIME/quality and full scaled pixel buffer | `renderer.test.ts`: Blob MIME with zero quality; non-unit pixel ratio |
| Clone transforms, exclusions, SVG descendant filtering | `renderer.test.ts`: asynchronous transforms, excluded subtree, SVG styles and `filter`, including `foreignObject`; `test/browser-unit/capture.test.ts` cross-browser filter case |
| Per-node clone and computed-style customization | `renderer.test.ts`: child-first callback order, excluded nodes, SVG descendants, source immutability, style list/empty/full, pseudo styles and errors; `test/browser-unit/capture.test.ts`: clone output pixel and selected CSS in three engines; built ESM smoke and installed tarball type smoke |
| Iframe body cloned twice | `renderer.test.ts`: same-origin iframe body exactly once |
| Relative CSS image URL and local fragment URL | `renderer.test.ts`: relative CSS URL; fragment-only reference |
| Absolute or root-relative same-document clip-path URL breaks after SVG serialization | `renderer.test.ts`: copied attribute/style and unchanged source; `test/browser-unit/clip-path.test.ts`: SVG attribute, inline style and stylesheet cases check serialized local fragment, output pixels and unchanged source across three engines; different path/query/origin stay unchanged; `test/browser/package.test.ts` checks built ESM pixels across three engines |
| Non-404 HTTP failures and resource diagnostics | `renderer.test.ts`: status 500 rejection; missing resource warning |
| Image embedding error behavior | `on-image-error-handler.test.ts`: awaited error callback and rejection without a handler |
| Font collection without live CSSOM mutation | `webfont.test.ts`: used font and source stylesheet; grouped adopted stylesheet |
| Image decode rejection and animation-frame delay | `renderer.test.ts`: usable decode rejection without animation frame |
| Data URL image resolves before decode is ready | `renderer.test.ts`: deferred `decode()` keeps `embedImages` pending, then completes without replacing the image method; built-package random large-image pixels cover the real raster path |
| XML-invalid controls and literal textarea content | `renderer.test.ts`: control characters; textarea markup |
| Nested vertical/horizontal scroll viewport | `scroll.test.ts`: green visible row and unchanged source offsets; `test/browser-unit/capture.test.ts` and `test/browser/package.test.ts` cross-browser pixel cases |
| Existing child transform lost during scroll correction | `scroll.test.ts`: transformed green row visible and original transform retained |
| Scroll layout outside the supported translation case | `scroll.test.ts`: mixed direct text remains unmodified |
| WebKit initial blank draw | `renderer.test.ts`: simulated first blank draw; `test/browser/package.test.ts`: large random image and stabilized pixel on three engines; `test/browser/smoke.html`: native Safari before/after sample |
| WebKit canvas clone is transparent with async image decoding | `test/browser/package.test.ts`: actual UMD package exports a red/blue canvas at CSS size across Chromium, Firefox and WebKit; `test/spec/canvas.test.ts` also checks the source path. The WebKit package case failed with both output pixels transparent before using synchronous decoding for the detached snapshot image, then passed five successive WebKit runs. |
| CI testing the wrong revision | `ci.yml`: runtime checkout SHA assertion before build and tests |
| Test harness silently accepts broken fixtures or blank PNG | `helper.test.ts`: missing fixture, invalid image and mismatched size reject; `test/browser/package.test.ts`: decoded PNG and UMD center pixels, plus large-image markers |
| Broken image placeholder was hidden in a commented-out test | `test/browser-unit/capture.test.ts`: a real 404 falls back to a red SVG placeholder, the exported pixel is red in all three engines, and the source image URL remains unchanged |
| Mobile smoke page has no collectable result on the Mac | `test/browser/package.test.ts`: full page runs all eight cases in each browser, waits for `REPORT SAVED`, reads the persisted JSON and checks verdict count, browser identity and commit SHA; unauthorized POST is rejected by the local server |
| Visual comparison ignores too much of a small image | `helper.test.ts`: 20/1000 differing pixels reject, one differing pixel passes; `helper.ts` caps differences at both 100 pixels and 1% of image area |
| Select visual baseline changes with platform font rendering | `select.test.ts`: each fixture checks serialized selected option and nonblank pixels; the runtime selection test compares two exports made in the same browser |
| Runtime select changes and duplicate option values are lost during cloning | `select.test.ts`: changed `selectedIndex` updates SVG and PNG pixels without changing the source; duplicate values and filtered earlier options preserve the exact selected option |
| Previously skipped canvas, Shadow DOM and CSS failure cases | `basic.test.ts`, `canvas.test.ts`, `special.test.ts`: actual pixels, SVG serialization and failed stylesheet; `test/browser-unit/capture.test.ts`: custom element on three engines |
| Cross-origin stylesheet cannot be read through CSSOM or fetch | `test/browser/package.test.ts`: second local origin, CSSOM denied, output pixel and warning verified in three engines |
| Two nested scrollers lose combined visible position | `test/browser-unit/capture.test.ts`: combined visible green pixel and unchanged source offsets in three engines |
| A direct sticky header blocks scroll correction for all siblings | `test/browser-unit/capture.test.ts`: source header position, exported red header and green scrolled content in three engines; initially failed with a blue content pixel |

The complete sequence passed in [PR #600's `pull_request` run](https://github.com/bubkoo/html-to-image/actions/runs/41381570219)
for a test merge containing `f72704e`. The checkout assertion checks that the
merge's second parent is the PR head. CodeQL v4 and both Codecov checks passed.
Real iOS and other complex sticky/fixed scrolling layouts remain release gates.
