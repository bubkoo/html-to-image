## [LRN-20261111-005] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: browser-resource-loading

### Summary
脱离页面的 DOM 副本仍可能发原生图片请求；资源统一加载必须同时控制副本所属文档和 URL 解析。

### Details
WebKit 在活动文档中修改副本计算样式、loading/srcset/crossOrigin 时，重复图片和背景场景额外发出 3 次未带库标记的请求，绕过 capture 的 Promise 缓存。受控实验在活动文档复制时多 3 次，私有 HTMLDocument 多 0 次；后者 defaultView 为 null，图片不能自行 decode。采用同一私有文档复制，并用活动文档的临时 data URL 图片解码；副本保留 sync decoding 和 anonymous crossOrigin，避免 Firefox 丢失像素。相对 CSS URL 通过私有文档锚点解析时，WebKit 返回相对地址，与图片的绝对 URL 形成两个缓存键；改用 URL 解析。SVG href.baseVal setter 又只更新 xlink 属性而留下现代 href，导致相对地址未嵌入；显式读取现代/旧属性，副本统一写现代 href 并移除旧属性。

### Suggested Action
用真实 HTTP 的带标记 fetch 与无标记原生请求分别计数，避免只 mock fetch 而漏掉浏览器请求。跨文档图片保留源解析地址；transform 创建节点用 copy.ownerDocument。测试缓存策略时不要求浏览器默认命中缓存，直接核对 no-cache 的新请求、请求指令和新内容。

### Metadata
- Source: investigation
- Related Files: ../src/clone-node.ts, ../src/embed-images.ts, ../test/browser/fixtures/resource-policy.mjs
- Pattern-Key: capture.inert-document-resource-ownership

### Context Maintenance
- Scope: 当前 Chromium/Firefox/WebKit 的 HTML 图片、CSS 背景、iframe 与 SVG 图片，公开/私有双源资源
- Authority: 修复前 UMD WebKit 额外原生请求为 3；私有文档实验为 0，HTTP 回归还验证相对地址去重、选项不变和源不变
- Revalidation: 克隆文档、图片解码、资源键或浏览器版本改变时重跑实际 HTTP 和真机页
- Validation: verified locally; pending device and remote checks
- Last-Validated: 2026-11-11
- Evidence: ../docs/v2-regressions.md

### Boundaries
完整检查曾出现 SVG 图片空白，不能先归为首次绘制问题。新增冻结 SVG 断言发现实际 href 仍为相对地址、只有 xlink 被更新；修正属性后继续验证默认单次绘制，未增加重绘次数。库 dispose 释放引用，不等于浏览器缓存清空或强制 GC。

## [LRN-20261111-006] error

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: iframe-adapter

### Summary
iframe 文档访问异常的回退必须仅包住访问，不可吞掉递归克隆或用户回调错误。

### Details
原 cloneIFrameElement 的 try/catch 包含 await cloneNode，导致同源 iframe 内 onCloneNode 抛错后静默回退。三引擎修复前均不能得到原始 Error。缩小 catch 到 contentDocument.body 读取后，递归异常正常拒绝，不改变不可读文档的回退语义。

### Suggested Action
适配器的可恢复访问与用户扩展执行分开，回归核对同一错误对象及源 DOM 未变。

### Metadata
- Source: investigation
- Related Files: ../src/clone-node.ts, ../test/browser-unit/resource-policy.test.ts
- Pattern-Key: capture.iframe-access-catch-boundary

### Context Maintenance
- Scope: 可访问的同源 iframe 内同步克隆回调
- Authority: 修复前三引擎各 1 项失败；修复后原始错误对象断言
- Revalidation: iframe 文档访问或克隆回调顺序改变后
- Validation: verified locally; pending device and remote checks
- Last-Validated: 2026-11-11
- Evidence: ../docs/v2-regressions.md
