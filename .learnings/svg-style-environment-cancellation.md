## [LRN-20261125-017] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: svg-style-environment

### Summary
取消原因允许任意值；Promise 已取得底层文档，也不代表后续消费者仍可接收该文档。

### Details
旧环境以 `signal.reason || fallback` 和错误值真值分类，丢失 null、false、0、空字符串。另一个独立时序是 raw frame Promise 已完成，排在资源锁回调前的消费者先 dispose/abort，旧的默认回调仍返回已移除文档。

以明确 outcome 区分成功/失败，按 signal.aborted 选择原 reason，在资源锁与交付前重新检查生命周期。固定最终测试/配置、只替换一个生产文件，三引擎由60失败/33通过变为93通过。独立的51项实验还验证NaN、-0、Symbol、BigInt、带抛错then getter的对象、revoked Proxy与原生默认reason；不将拒绝原因字符串化或当作成功值同化。

底层可信 Promise 若已完成，随后取消不能追溯反转其结果；已完成默认交付也同理。测试必须明确取消发生在哪个 continuation 前后。原5000ms期限和CSP/sandbox不变。首次完整覆盖率另有两项Firefox原生参考准备超时，未到库导出；后续原样检查通过不证明其根因。

### Suggested Action
异步资源交付在实际消费边界检查 owner 生命周期；所有错误通道显式表达，不以 truthiness 判断是否存在错误。原始失败和通过结果同时保留。

### Metadata
- Source: fixed-source before/after and independent native iframe controls
- Pattern-Key: svg-style.environment-cancellation-reason-and-delivery
- Related Files: src/svg-style-scope.ts; test/browser-unit/svg-style-environment.test.ts

### Context Maintenance
- Scope: SVG style environment creation, resource lock and disposal; no global capture cancellation or GC claim
- Authority: 93 fixed regression cases and51 independent controls across3desktop engines
- Revalidation: resource-lock/Promise/lifetime behavior changes
- Validation: scoped fix locally verified; current-head remote/device gates recorded separately
- Last-Validated: 2026-11-25
- Evidence: docs/evidence/svg-style-environment-cancellation.json
