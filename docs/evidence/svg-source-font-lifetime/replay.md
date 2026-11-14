# Disposed SVG environments must release borrowed source fonts

Source `404798ddc679d70735011840b0c57e6cd8c4e657`, based on #641 merge `648443e964126c115857084abc264c296f3bd0f0`. This is a scoped #560 lifecycle fix. #641's post-merge master CI 43649156211 and CodeQL 43649156200 both passed on that exact merge (1072 coverage / 953 source / 153 package); #640's earlier master failure 43645977092 remains preserved in the preceding evidence.

## Cause and controls

Removing the private iframe and clearing its document Promise does not release the array of already-loaded source FontFace wrappers. A retained disposed environment still closes over those wrappers, which can keep their source document alive. Disposal now empties that private array. It does not remove faces from the source document's FontFaceSet, clear a browser cache, or change resource/output options.

The standalone five-mode probe compares native removed frames, no-font retained owners, loaded-font native frames, loaded-font retained disposed owners, and dropped owners. Chromium and Firefox collect every control except the loaded-font retained owner before; all five collect after the single-variable compiled array-clear experiment. That temporary experiment restored the original generated module in finally (SHA256 d536ecddf23579cab09968fff9147228b6eef3974b824dd615b0f1ffaabcdc7a) before the final source build. WebKit retains its native removed-frame controls too, so it provides no GC attribution.

The final source test covers loaded/unloaded fonts and opened/unopened private documents while keeping the disposed owner reachable. It checks original markup/font-set state, iframe removal and rejection after disposal. Chromium/Firefox keep the same three explicit collections and paired native controls. WebKit performs the other assertions without a new skip or a GC claim. Boolean WeakRef assertions avoid retaining a failed Document in the test report.

`pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/svg-style-source-lifetime.test.ts` passes 12/12 after. Reverting only the array clear produces 5 failures / 7 passes in the combined before run, including sequence-sensitive/native-control failures; do not count all five as independent proof of this root. Fresh isolated `-t 'font=true and opened=false'` and `-t 'font=true and opened=true'` runs each fail the retained-owner assertion in Chromium and Firefox while native controls pass (2 fail, 1 WebKit lifecycle pass, 9 CLI-filtered cases). The isolated no-font opened control passes in all three engines. All raw before logs are preserved. CLI-filtered cases are not added project skips.

The targeted lifetime/cancellation/font group passes 59 (+1 inherited skip). `pnpm run test:browser` passes lint, ESM/CJS/UMD builds, types, installed tarball consumers, 1084 coverage (+4 inherited skips), 965 source (+4 inherited skips), and 153 package tests. No deadline, GC-count, coverage or pixel threshold was relaxed. Final-head remote gates belong to the new PR checks and description.

## Device and integrity

Real iPhone Safari/iOS 26.6.1, simulator disabled, on the same source: ESM/UMD pass ten loaded/large/system/explicit-font controls, four cancellation controls, and smoke 35 PASS / 2 INFO / 0 FAIL. Font controls compare actual source getBBox width at CSSOM precision and full pixels against an independently authored SVG image. They do not certify native-screen compositor parity at fractional edges. No device GC claim or recount of the previous 42/56 native SVG scenes is made. The owned session and server were ended.

Run `python3 docs/evidence/svg-source-font-lifetime/verify-archives.py` to verify both measured archives. Input hashes cover source, tests, configuration and generated packages. Phone controller copies need a newly created local session.json; session/device identifiers are excluded from the archive.

Original 20 MB SPA pressure, browser HTTP/native font caches, WebKit/device frame GC, relative SVG paint bases and final redirect addresses remain open. No npm publication or old contributor PR comment/closure.
