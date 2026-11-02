The Karma investigation below describes the former `codex/open-pr-triage` checkout. The current `master` uses Vitest Browser Mode; only the toolchain and package consumer findings were carried forward.

## [LRN-20261102-016] solution

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: test-infrastructure

### Summary
保留 Jasmine/Karma 断言，分别替换类型检查、模块打包和覆盖率，可以解除旧编译链对依赖升级的阻碍。

### Details
旧 `karma-typescript` 在 TS5 升级试验中执行 0 个用例（见 LEARNINGS.md 的 LRN-20261102-013）。此次改用独立 `tsc --noEmit`、`karma-esbuild` 和逐源码模块的 Istanbul 插桩，原 112 项回归全部通过。LCOV 包含全部 14 个可执行 TS 模块，行号在原文件范围内，HTML/LCOV/Cobertura 均生成。ES2020 测试产物减少了 ES5 转译辅助代码，覆盖率计数不能直接与旧链比较。另行强制试用 Jasmine 7 时，旧适配器报 `jasmineRequire is not defined`；已恢复适配器支持的 Jasmine 4.6.1。

### Suggested Action
测试依赖升级分别核验编译、打包、断言数量和源码覆盖率；保留已验证断言，替换已定位的失败层。不要通过强制跨主版本覆盖适配器依赖来假定兼容。

### Metadata
- Source: dependency upgrade investigation
- Related Files: ../karma.conf.js, ../tsconfig.karma-tests.json, ../scripts/karma-instrument.cjs
- Pattern-Key: infra.separate-types-bundling-coverage
- Validation: verified locally with Node 22.21.1, TS 5.9.3, Karma 6.4.4; remote CI pending

## [LRN-20261102-017] knowledge_gap

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: packaging

### Summary
升级编译器可能无意提高生成的公开类型声明对消费端 TypeScript 的要求。

### Details
TS5.9 将 `toPixelData` 推断为 `Promise<Uint8ClampedArray<ArrayBufferLike>>`。TS4.9 消费真实压缩包时，声明文件报 TS2315；旧检查的 `skipLibCheck` 会掩盖该问题。显式标注公开返回值为 `Promise<Uint8ClampedArray>` 后，TS4.9 和 TS5.9 都能在不跳过声明检查的条件下消费隔离安装后的包。`typescript-compat` 4.9.5 仅用于该消费端验证，不参与构建和运行。

### Suggested Action
库的压缩包检查同时使用当前和最低兼容编译器；不要跳过库自身声明文件的类型检查。

### Metadata
- Source: failing installed-package consumer check and fix
- Related Files: ../src/index.ts, ../scripts/check-package.mjs, ../test/package-smoke.mts
- Pattern-Key: packaging.compiler-upgrade-public-declarations
- Validation: TS4.9 failed before explicit public annotation; TS4.9 and TS5.9 passed afterward

## [LRN-20261102-019] project_pattern

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: test-infrastructure

### Summary
合并旧分支的依赖升级时，以现行测试架构为准逐项移植，不能复制旧分支的整份 `package.json` 或测试配置。

### Details
旧检出目录已验证 TypeScript 5.9、Rollup 4、ESLint 10 和类型兼容检查，但其 `package.json` 仍调用 Karma。当前 `master` 已把回归迁至 Vitest。移植时保留升级后的构建、检查和类型兼容机制，移除 Karma/Jasmine 专用依赖、配置与脚本。新配置的 lint 暴露一处无用赋值和七处过时禁用注释，修复后本地覆盖率回归 138/138、三引擎源码行为 69/69、三引擎构建包 39/39；实际压缩包通过 TypeScript 4.9 与 5.9 消费检查。

### Suggested Action
跨分支移植基础设施时，先确认目标分支的现行入口和验收矩阵，再搬运可复用的原因修复；构建、真实压缩包和浏览器测试都通过后再清理旧检出目录。

### Metadata
- Source: old worktree to master integration
- Related Files: ../package.json, ../scripts/check-package.mjs, ../docs/test-architecture.md
- Pattern-Key: infra.port-toolchain-with-current-test-runner
- Validation: verified locally; remote CI pending
