# minimatch development dependency security follow-up

This candidate repairs Dependabot alert #192 in the explicit pnpm/ESLint dependency graph. It is an uncommitted two-file change based exactly on default master f8d1c4b1abb7decf143fdf418ad08fa8b22bd309. The latest local full default gate is failed, so the candidate is not described as fully green or ready to merge.

package.json changes only the compatible development lower bounds eslint ^10.14.0 -> ^10.15.0 and typescript-eslint ^8.72.1 -> ^8.73.0. Upstream ESLint/config-array0.23.6 and TypeScript-estree8.73 explicitly accept minimatch11; no major override is used. The canonical lock and clean installed pnpm graph resolve only minimatch11.0.9. All77 declared regular dependency ranges checked on the updated parents are satisfied. Thirteen unrelated version families refreshed by the first resolver attempt were restored to baseline. Runtime source, exports, scripts and production dependencies are unchanged.

## Advisory conditions and mechanism

GHSA-g3hv-75wg-m249 / CVE-2026-118764 covers >=7.0.0 <11.0.1, first fixed11.0.1. The advisory condition is an attacker-controlled glob at optimizationLevel>=2, with repeated globstar/parent/path portions such as **/../a/b. First-phase preprocessing can clone and revisit alternatives, then perform pairwise work. No adversarial long-running pattern was executed. The baseline default is optimizationLevel1 and the three reviewed direct parent call sites do not explicitly set that option; this limited static review is not proof that every consumer or configuration is unreachable. A dev-tool inventory match is not browser runtime exploitability.

The official fix commit77a0f5c bounds alternative generation by braceExpandMax and skips large quadratic deduplication sets. Installed11.0.9 contains additional cell/work budgets and throws before an overflowing first-phase edit. Exact source references, source SHA and differences from the historical first fix are in official-advisory-fix.json. Minimatch11 removes APIs/changes matching semantics, so the supported upstream parent upgrades are used rather than forcing an out-of-range major. First-fixed11.0.1 declares Node18||20||>=22; installed11.0.9 declares20||>=22. The actual local Node22.17.0 and configured CI Node24 satisfy the updated lint chain.

## Remaining bundled dependency

The release chain still installs npm11.21.1, which bundles minimatch10.2.5. This is an installed bundle on an active release dependency chain, unlike the old unreachable minimatch10.2.6 virtual-store directory that a clean frozen reinstall removed. npm11.21.3 and latest12.2.3 still declare/bundle minimatch^10.2.5 in the checked official manifests. No release-chain removal, major override, vendor patch or global system package change was made. A compatible official npm release carrying fixed minimatch or corresponding upstream repair remains needed. This candidate does not claim the entire physical dependency tree is advisory-free.

#574's obsolete Rollup3 lock bump and #540's removed pbkdf2 lock bump remain separate scoped historical conclusions. They never meant that the current tree had no other advisories.

## Validation and the retained failure

The first install passed local coverage1234/4skip, source1115/4skip and package162, plus lint/build/package consumers/types. After lock EOF normalization and a genuinely clean frozen install, the final lint/build/consumers/types passed; coverage was1233pass/1fail/4skip, independent source1115pass/4skip and package162pass. The default source phase was not run after coverage failed; the separate source command is explicitly identified. All283 inputs stayed unchanged during each full check batch.

The final Chromium failure is resource-resolver-cancellation probed=false: frame.evaluate: Frame was detached during collectGarbage(), before collection assertions. The original log and PNG are retained. The master helper captures a Frame before requestGC then evaluates it without revalidation; the provider first selects vitest-iframe, otherwise its fallback accepts the next frameattached without filtering. The original record has no actual selected frame identity, so neither dependency changes, owner retention nor concurrency is established as the cause.

The final rerun overlapped another root-authorized browser validation. No exclusive execution claim is made. Exact UTC windows and4197 cleanup are recorded; all owned commands exited,4173 was untouched, and further browsers/old-lock controls were stopped pending specific authorization. No retry was used to replace the latest failed gate with the earlier pass.

## Preserved material

Original alert/advisory and official manifest metadata; old/new lock and pnpm why/list; the77 constraint checks; two-field manifest allowlist; rejected unrelated refresh; initial lock-reduction and metadata-verifier failures; successful frozen installs; both check batches; source identities, failure PNG and UTC windows are preserved. No commit, push, PR, alert action or publication occurred. Remote checks on the eventual new head and separate failure diagnosis remain outstanding.

Official sources: [advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), [first fix commit](https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8), [minimatch11.0.1 manifest](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/package.json), [major API changes](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/changelog.md), [ESLint10.15 manifest](https://raw.githubusercontent.com/eslint/eslint/v10.15.0/package.json), [estree8.73 manifest](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/v8.73.0/packages/typescript-estree/package.json).

## Portable evidence

[JSON assessment](minimatch-dev-security-20261125.json) · [raw archive](minimatch-dev-security-20261125-raw.tar.gz) · [SHA index](minimatch-dev-security-20261125-index.json) · [verifier](minimatch-dev-security-20261125-verify.py) · [integrity receipt](minimatch-dev-security-20261125-verification.json).

The archive preserves72 raw files, including the original source index. Old and failed lock snapshots are evidence, not installation inputs. No credentials, signed download URLs or private service addresses are included; ordinary local test paths and public package metadata remain. The integrity verifier recomputes the findings from archived receipts without extraction, installation or browsers. Its success does not change the latest failed test gate. From repository root run python3 docs/evidence/minimatch-dev-security-20261125-verify.py --check-originals --check-working-candidate.
