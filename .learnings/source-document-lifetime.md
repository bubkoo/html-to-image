## [LRN-20261111-011] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: capture-lifecycle

### Summary
快照完成后不要为延迟创建 canvas 持有源文档；释放回调也要避免捕获包含源节点的调用环境。

### Details
#560 的资源缓存复核只证明请求复用范围和 dispose 后拒绝操作，不能据此证明 DOM 可回收。持有已释放快照、移除源 iframe、请求 GC 后，Chromium 仍能通过 WeakRef 读取原文档；丢弃快照后才消失。fromSnapshot 的 render 闭包直接使用源 ownerDocument；改由库所在 document 创建 canvas 后，Chromium 通过，Firefox 仍保留源。将 renderer 的释放回调由捕获调用内的箭头改为外层 releaseTask 的 bind 后，Firefox 也通过。

三引擎的独立源文档 GC、延迟像素、已释放快照和 canvas 所属文档回归，加上 Chromium/Firefox 移除 iframe 的 GC 共 11 项，在旧源码全部失败，候选全部通过。WebKit 的无捕获 iframe 对照也保留文档，因此仅跳过该引擎的原生 iframe GC 断言；它的独立文档 GC 与移除 iframe 后输出仍验证。不要把此边界扩大为 WebKit 未验证内存，也不要宣称整个 SPA 压力场景已修复。

源文档引用与私有副本文档生命周期不同：#623 仍必须在资源嵌入期间持有 cloneDocument，直到序列化，不能为了释放源 DOM 而删掉该持有。

### Metadata
- Source: #560 follow-up, forced-GC controls and renderer closure isolation
- Related Files: ../src/capture.ts, ../src/renderer.ts, ../test/browser-unit/capture-lifetime.test.ts, clone-document-lifetime.md
- Pattern-Key: capture.snapshot-source-document-release

### Context Maintenance
- Scope: library loaded in the parent document; source documents and iframe snapshots without user callbacks intentionally retaining their source
- Authority: baseline 11 failures / candidate 11 passed and 1 scoped skip; native no-capture control
- Revalidation: canvas allocation, renderer release callbacks, browser GC protocol or clone/snapshot boundaries change
- Validation: targeted 11 passed; full local 208/266/114, 1 scoped source skip, build/types/tarball passed; native and remote pending
- Last-Validated: 2026-11-11
