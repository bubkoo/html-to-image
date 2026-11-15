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
