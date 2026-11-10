## [LRN-20261111-008] error

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: inert-document-lifecycle

### Summary
异步嵌入期间必须显式持有私有克隆文档，不能假定脱离页面的节点会保留文档和 base URI。

### Details
#623 首轮 Linux CI 在 WebKit 的相对资源计数失败。实际请求追踪表明同一个 loader 收到绝对 URL 和根相对 URL；后者 new URL 失败时，图片 baseURI 和 ownerDocument.baseURI 都已是 about:blank，原 base 元素也消失。对应两个捕获实际多发一次请求。Mac 上 12 轮场景也复现，说明不是只在 Linux 发生。

只移除捕获阶段的文档强引用作为对照，三引擎 36 次中有 2 次失败；保留文档并作为参数交给 SVG 序列化后，36 次全部通过，连同字体 42 项共 78 项通过。副本 base URI 在资源阶段结束时也必须保持初值。此证据支持文档生命周期问题；不需要通过猜测基地址或放宽请求次数绕过。克隆文档仅由单次创建操作持有到序列化，不进入冻结快照或全局缓存。

### Suggested Action
私有文档/离屏树的异步操作显式管理 Document 生命周期。计数回归失败时记录每个捕获的缓存键、URI 与阶段计数，区分真正重复加载和浏览器缓存策略；保留失败对照。

### Metadata
- Source: CI and local reproduction
- Related Files: ../src/capture.ts, ../src/util.ts, ../test/browser/fixtures/resource-policy.mjs
- Pattern-Key: capture.retain-inert-document-until-serialization

### Context Maintenance
- Scope: 当前 WebKit 的异步图片嵌入，Chromium/Firefox 对照，以及已验证的 relative HTML/CSS/SVG 资源
- Authority: PR #623 CI run 42904242209；去掉持有 2/36 失败、恢复后 36/36；请求键与 about:blank 有运行时追踪
- Revalidation: 变更克隆文档创建/释放、异步资源阶段、序列化所有权或浏览器版本时
- Validation: verified locally; verified locally and on real iPhone (204/255/111 + 21); PR/master CI and CodeQL plus PR Codecov passed
- Last-Validated: 2026-11-11
- Evidence: ../docs/v2-regressions.md


### Final candidate validation
最终源码 `f4ab94e` 完整本地 204/255/111 与真实 iPhone Safari 21/21 通过，报告为 `docs/evidence/ios-safari-document-ownership-f4ab94e.json`；相对资源的文档 base URI、实际请求次数与八种字体场景均通过。受测源码 SHA 与报告一致，远端检查在合并前核验。


### Integration
#623 已合入 master（a360c43）；最终候选的 PR CI/CodeQL/Codecov 与主分支 CI/CodeQL 均通过。最终真机证据仍对应 f4ab94e，合入后源文件树一致。
