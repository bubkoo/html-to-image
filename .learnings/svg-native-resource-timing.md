## [LRN-20261124-001] knowledge_gap

**Logged**: 2026-11-24
**Priority**: medium
**Status**: pending
**Area**: testing

### Summary
Observed nested SVG requests appear in fresh-page resource timing, but this is not a reliable per-element resolution capability by itself.

### Details
The owned fetch positive appears in all three measured browsers. Native screenshots remain exactly unchanged. Multiple qualified-paint cases coexist, and timing entries contain resources for more than one source, so global history alone is ambiguous. Cached or missing history and restricted resource policies still need controls before any production branch.
The SDK-pinned Firefox executable was absent. The installed Firefox159 was explicitly selected for this read-only observation and cannot be reported as Firefox157 or a standard package gate. Preserve actual executable/version and initial setup failures.

### Suggested Action
Test fresh-context native HTTP probing with explicit request provenance, cache/CSP and resource-policy constraints before proposing runtime behavior. Keep the actual-browser appearance contract and do not substitute engine names or unrelated capability probes.

### Metadata
- Source: native controlled observation
- Related Files: docs/evidence/svg-resource-timing.json
- Tags: svg, resource-timing, native-oracle, browser-version
