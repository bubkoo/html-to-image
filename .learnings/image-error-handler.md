## [LRN-20261111-002] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: image-error-handling

### Summary
图片错误回调的 Promise 必须等待并传播拒绝，否则快照会在恢复前冻结，还会丢失调用者的异常。

### Details
V2 在 catch 中调用 `onImageErrorHandler.call(...)` 后直接返回。核对 #504/#482 时，三引擎各 2 项失败：受控异步回调未完成，capture 已完成；回调返回拒绝 Promise，capture 却成功。等待回调返回值后，源码和实际 UMD 验证恢复的绿色像素、失败图片作为回调 this、源图片不变，以及同步/异步原始异常传播。测试给预期拒绝附独立观察者，以便旧实现仅暴露契约失败，不引入无关未处理异常。

### Suggested Action
将用户回调作为异步流程的一部分，保留其 this 和返回值；用受控未完成回调、输出像素和原始异常验证，不用全局 catch 吞掉用户代码错误。

### Metadata
- Source: investigation
- Related Files: ../src/embed-images.ts, ../src/types.ts, ../test/browser-unit/image-errors.test.ts, ../test/browser/package.test.ts, ../test/browser/smoke.html
- Pattern-Key: capture.await-error-handler-before-snapshot

### Context Maintenance
- Scope: V2 图片加载/解码失败后的用户回调，包含同步和 Promise 返回
- Authority: 修复前三引擎各 2 项失败；修复后定向 9/9、覆盖率 169/169、三引擎源码 150/150、构建包 69/69
- Revalidation: 改动图片错误处理、捕获冻结或回调调用方式时重跑同组回归
- Validation: verified locally
- Last-Validated: 2026-11-11
- Evidence: ../docs/v2-issue-pr-tracker.md

### Resolution
独立候选 `2e8731e` 的真实 iPhone Safari 完整页 14/14 通过；原始报告归档于 `docs/evidence/ios-safari-image-handler-2e8731e.json`。同时核对 `v1.11.13` 的源码：旧实现用 `resolve(handler(...))`，会吸收返回 Promise；V2 的直接调用丢失了此行为。应在重构回调调用方式时验证返回值语义，而不只验证回调曾被调用。
