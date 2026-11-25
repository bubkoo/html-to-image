## [LRN-20261124-001] best_practice

**Logged**: 2026-11-24 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: capture-lifecycle

### Summary
反射读取也可能缓存外来 DOM 的 getter；生命周期排查必须包含浏览器的自托管脚本，不能只搜索库源码。

### Details
Document 读取隔离后，原测试的失败图仍显示 Element getter/prototype 到源文档的路径；进一步隔离 Node/Window 后，又取得 17 个 CSS 声明相关缓存入口。补齐样式、集合、字体及四处 any 边界后，库源码直接缓存入口归零，但原 `font=true, opened=false` 断言仍失败。既有 WeakRef 唯一匹配 HTMLDocument `0xfdeaeeaa4d8`，原始日志中 `Reflect.get` 的 `self-hosted:2914` 经两个 GetElemSuper 缓存字段连接 FontFacePrototype、status getter，再到该文档。排除显式弱边、所有 weak 命名缓存边、调试器边界及穿过其他函数脚本的路径后仍存在。过滤后的原生 CC 日志不含目标和 holder，不能扩张为完整原生归因。

候选让反射的查找目标成为临时透明代理，处理器无原型、无陷阱且冻结，并显式保留原接收者；返回值仍是原对象，方法先读取再求值参数，不保存代理。类型擦除处仍保留字符串等原始值的属性读取语义。13 项行为对照在三引擎共 39 项通过，完整本地 1273 coverage / 1154 source / 162 构建包通过，4/4 既有跳过未变；415 个输入一致。当前源码 UMD 在真实 iPhone 的五 fixture 离线子集 112/112 通过，418 个输入一致，无 HTTP 请求。

独立的四构建入口持有控制、以及未加载 FontFace 的 getter 预热，均未产生有效的前后差异；不能用它们证明修复。观察器改变 WeakRef 构造器身份且在失败清理后采样，仍须保留副作用和原始失败。一次完整通过也不等于普遍稳定，准确远端门禁仍待验。

### Suggested Action
先锁定原断言与目标身份，再遍历全部脚本和原生所有权边界。静态类型审计要单列 any/动态访问；包装 DOM 方法须保留 getter、参数、接收者与异常顺序，写入须保留严格失败和 RHS 返回值。不要靠增加回收、等待或弱化断言取得通过。

### Metadata
- Source: actual failed lifecycle tests, raw heap/GC/CC graphs and behavior comparisons
- Related Files: ../src/dom.ts, ../src/document.ts, ../src/util.ts, ../test/browser-unit/document-access.test.ts, ../docs/evidence/document-property-lifetime/dom-access.json
- Pattern-Key: dom.foreign-realm.self-hosted-property-cache

### Context Maintenance
- Scope: pinned Firefox 157 / Playwright 1.64.1 and source 5c92de360a4e400f25502f2e3f254c0a4f8ec7ef; bounded native-interface audit
- Authority: unchanged original failure assertions and existing WeakRef identity; post-failure paths, not a unique pre-inspection cause
- Revalidation: browser/JIT versions, property helpers, generic DOM boundaries, compiler or bundler changes
- Validation: local full gates and current physical UMD subset pass; current-head remote pending; no device GC, HTTP, loaded-font or full external-SVG acceptance
- Last-Validated: 2026-11-24
