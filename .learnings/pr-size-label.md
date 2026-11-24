## [LRN-20261124-005] best_practice

**Logged**: 2026-11-24
**Priority**: high
**Status**: resolved
**Area**: ci

### Summary
Count PR changes from complete paginated file metadata, not aggregate diff text.

### Details
The size-label v0.1.1 action fails with HTTP406 above GitHub's 20000-line diff limit. On the same #646 head, JSON file metadata returns all 106 files and 25590 changed lines without downloading that diff. Upstream v0.5.7 uses file metadata but still requests only one default page, so upgrading alone can undercount PRs with more than 30 files.

The replacement preserves thresholds, lockfile exclusion, .gitignore inclusion and both sides of renames. It compares the paginated count with changed_files before writing labels, detecting GitHub's 3000-file cap or an incomplete read. Its exact embedded script is exercised by CI and a local live-read-only adapter; label mutations remain stubbed in that replay. pull_request_target uses the base workflow, so a new PR's legacy size-label result does not prove activation of the replacement.

### Suggested Action
Keep aggregation independent of patch contents and preserve real large-PR before/after evidence. Verify actual workflow activation after merge; do not equate dry-run plans or the old workflow's green check with a newly deployed action.

### Metadata
- Source: real size-label API406 and same-head metadata replay
- Related Files: .github/workflows/pr-label-patch-size.yml, scripts/check-pr-size-label.mjs, docs/evidence/pr-size-file-metadata.json
- Tags: github-actions, pagination, diff-limit, labels
