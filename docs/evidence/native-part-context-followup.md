# Native-part context follow-up evidence

This is a research archive, not a production fix or a generic selector filter.

The static DTO prototype matched 24 of 24 real source-target scrollbar controls in Chromium 156.0.8078.4 and WebKit 27.2. It keeps the original native selector, part/suffix and CSS nesting/media/supports/layer rule path. Source snapshots are synchronous primitives; the source is removed before asynchronous execution. Sibling and nested-scroller controls show target isolation within the tested static trees. Another 32 unsupported snapshots remain unknown.

The lifecycle controls preserve 26 cancellation reasons by identity, including cancellation while the iframe load or actual CSP wait is pending. The 12 CSP-wait cancellations happen after part/positive events and before the fence; late events do not resume completion. Repeated disposal, script/onerror negatives, malicious DTO rejection and zero final frames/listeners/timers are retained. These controls do not prove arbitrary source ownership or browser GC behavior.

Twelve visibility controls show why zero source pixels cannot mean non-membership: zero-size/hidden root and transparent-ancestor cases can retain part resource events; ancestor display:none remains unknown. Button/track-piece and unproved state combinations are outside the bounded prototype. There is no general proof that a missing CSP event means a rule does not apply, nor that its finite fence protocol completes arbitrary resource scheduling. CSP console messages also prevent treating this prototype as an accepted runtime mechanism.

The passive alternative is unknown. Both browsers decode valid local transparent 1x1 PNG Blob/data images and run the callback control, yet private ResourceTiming/Observer/takeRecords expose no records, including ordinary image/context positives. The [Resource Timing draft](https://w3c.github.io/resource-timing/#resources-included-in-the-performanceresourcetiming-interface) describes HTTP(S) timing entries; the observation does not supply a local-URL selector signal. open/write/close reaches complete without the expected Window load callback in these controls, so neither readyState nor timeout is used as a completion proof. The native-part matrix was not expanded after the basic observability prerequisite failed.

## Files and verification

- [JSON findings](native-part-context-followup.json)
- [Raw archive](native-part-context-followup-raw.tar.gz)
- [Per-member SHA-256 index](native-part-context-followup-index.json)
- [Verifier](native-part-context-followup-verify.py)
- [Verification receipt](native-part-context-followup-verification.json)

The original indices count 84 and 19 payload files while excluding themselves. The archive therefore contains 105 raw files: 103 indexed payloads plus both original index.json files. All are preserved byte for byte, including original failures and safety/cancellation evidence. No old archive or main source/test/generated package is replaced.

Run python3 docs/evidence/native-part-context-followup-verify.py to check gzip CRC, tar members, every size/SHA-256, embedded indices and JSON-summary values without extraction. Add --check-originals from repository root to compare the archive bytes with the original output directories.

The public-data review found no credentials, signed download URLs, personal contact data or external device IPs. Loopback URLs, generated local identifiers, public W3C namespace/specification links and two ordinary local worktree paths in original failure stacks remain as provenance. Test screenshots contain only the constructed scrollbar fixtures. No anonymization or substitution of raw failure bytes was performed.
