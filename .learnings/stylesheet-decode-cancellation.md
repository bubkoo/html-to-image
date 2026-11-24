## [LRN-20261125-009] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: resource-cancellation

### Summary
把abort race放在不再拥有source文档的解码边界，可让外层collector及时退出，而无需等待不可控Blob字节Promise。

### Details
同一真实Blob子类gate、默认Task超时、MessageChannel竞争和三次GC配对脚本前后字节完全相同，生产源码只变clone-scrollbars的decodeStylesheet边界。旧源码在公开Task拒绝后仍让内部collector pending，Chromium源文档在gate未释放时保留；新源码在gate释放前已reject/finally，Chromium原生/被测文档均回收，强持有和弱canary控制有效。

独立released cohort前后均通过；WebKit原生控制仍不回收，不能扩成其GC修复，Firefox仍legacy入口unsupported。该结果验证隔离Task/collector组合与受限owner释放，完整createCapture、构建包及远端门禁仍须独立验证。底层Blob解码本身没有被强行终止，后续完成仍由Promise race消费。

### Suggested Action
遇到取消只改公开Promise状态时，同时验证内部finally和借用owner是否在外部工作settle前释放；沿原次数使用native/strong/canary对照。将取消等待和清理放在叶边界，避免继续让source-owning调用帧等外来Promise，保留原reason与失败断言。

### Metadata
- Source: same-script before/after source-function execution and paired WeakRefs
- Pattern-Key: css.abortable-decode-releases-source-owning-frames
- Related Files: src/clone-scrollbars.ts, output/playwright/stylesheet-cancellation-20261125-after/comparison.json

### Context Maintenance
- Scope: Playwright1.64.1 Chromium156; WebKit native GC and Firefox unsupported boundaries retained
- Authority: identical default-timeout script, one source-file diff, explicit internal-finally and gate-pending owner control
- Revalidation: Recheck integrated capture API and current source hashes after further changes
- Validation: isolated composition and bounded Chromium owner pass; full acceptance separate
- Last-Validated: 2026-11-25
- Evidence: output/playwright/stylesheet-cancellation-20261125-after/assessment.json

### Integration checkpoint

完整capture的cancel-decode模式同时通过：门面保持exact reason，late byte settlement后没有hooks/stage继续；它仍不代替完整capture owner GC证据。修前与修后隔离GC记录分别保存，不覆盖旧失败。 见 docs/evidence/scrollbar-stylesheet-resources.json；后续完整门禁的严格失败另列，未称整体修复。
