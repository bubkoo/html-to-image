# Preserve redirect identity beside bytes

An SVG request address is not necessarily its document base. Keep native Response.url alongside the exact resource cache entry and use that final address for file-relative CSS and references. Retain Blob-returning load semantics and stable pending Promise identity. Custom Blob resolvers have no final-response address, so use their individual requested addresses rather than attaching mutable URL state to a shared Blob.

Transport cache-busting nonces must not become document identity. Preserve real query parameters, clear address metadata with the loader, and keep late pending results from restoring cleared metadata. Register final SVG addresses as scope aliases so dependencies and cycles can reuse the loaded document.

Original native screenshots must validate an independent reference before accepting a fix. A queried SVG and unqueried paint URL were distinct documents in Chrome; initial native purple versus reference green invalidated that first fixture, even when candidate output matched the reference. Preserve both failed versions and isolate the valid same-document redirect control; keep query/identity checks in real HTTP resource tests.

A real iPhone also lacks crypto.randomUUID on its non-secure USB HTTP page. Owned fixture IDs should use crypto.getRandomValues. This is a fixture correction, not a production browser workaround.

Separate iPhone observations show fragment paint resolving to containing-page definitions and qualified paint falling back, differing from desktop WebKit. Neither clip hit-testing nor visiblePainted hit-testing has established a universal paint-capability rule. Do not collapse those unresolved cases into the redirect file-CSS fix.

Final source bafedeb: six final native controls 2 fail/4 pass before, six pass after; targeted 99; full 1108/989/156 (+4/+4 inherited skips); physical iPhone four comparisons/eight photos, four cancellation controls, smoke 36 PASS / 2 INFO. [Evidence](../docs/evidence/svg-response-bases/replay.md).

First PR 643 CI 43653658279: coverage 1108 passes; uninstrumented source 986 passes/3 Firefox GC failures/4 inherited skips, package not run, CodeQL passes. Preserve the ten artifacts and raw log. Isolated Mac Firefox 144 controls do not reproduce Linux CI, so do not claim a cause. Diagnostic 4aa8640 adds paired native frames and boolean/tree-only reports without retaining failed Documents; strict collection conditions and three primary GC calls stay unchanged. Local diagnostic coverage/source 1108/989 pass; production, generated package and device inputs are unchanged. This is stronger evidence collection, not a production GC fix.
