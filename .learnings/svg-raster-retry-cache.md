# SVG 重绘的解码缓存

日期：2026-11-14。分支：codex/svg-raster-retry-cache。关联：#498，历史 #478/#591。

- 新建 Image 不等于重新解码 SVG；相同 data URL 可保留首次不完整结果。真实字体输入中，旧 stabilizationAttempts=3 仍与独立新解码相差 243 通道。
- 重试使用不同解码地址，但必须保持冻结内容不变。SVG 文档根之前的唯一 XML 注释不改变元素、选择器、片段引用或视觉内容；不要改源 DOM，不用元素属性制造新样式匹配，也不切到有不同画布安全语义的 Blob URL。
- 默认第一次不变，只有额外尝试使用新地址；toSvg 返回值保持字节相同，仍只克隆一次，完成的栅格结果继续缓存。
- 回归同时包含真实字体与可控的首次 URL 不完整缓存。裁剪与渐变对照按同一浏览器的健康 SVG 解码逐通道比较，不用 PNG 字符串或跨渲染路径的硬编码色值替代像素证据。默认单次、无故障、源后续变化及片段引用均有正对照。
- 旧源码 4 失败 / 8 通过，候选三引擎 12/12；完整本地 coverage/source/package 为 341/665/138，另 1 项既有 WebKit iframe GC 跳过。
- 这不解决所有 WebKit 绘制问题。原生滚动原型仍保留 21 个通道各差 1 的文字边缘，以及 234 通道内阴影差异；不把重绘等价于原生逐字节保真，也不因两幅错误图相同而提前停止。
- #591 作者已报告旧 V2 在其 iPhone 11 原始夹具上 16/16 完整并关闭自己的 PR；须与本候选的新真机验收区分。UA 的 OS token 也不是系统实际版本证明。

证据：[svg-raster-retry-cache.json](../docs/evidence/svg-raster-retry-cache.json)。

## [LRN-20261115-001] best_practice

**Logged**: 2026-11-15T00:06:07+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
组合回归须保留原失败记录、核对输入字节与完整服务器回执。

### Details
组合首轮 WebKit 多项透明后连接关闭；同样输入的新 WebKit 选择 234 通过、完整三引擎 701 通过，未确定最初异常根因，不据此改库或增加跳过。组合 smoke 为 31 PASS + 2 INFO，超过旧 32 条上限，64 条有界上限保存全部 33 条记录。DONE 后还需确认 REPORT SAVED；只复制已知 receipt。

### Suggested Action
出现浏览器连接关闭时归档失败日志并独立复核；区分完整报告落盘和页面断言完成。

### Metadata
- Source: investigation
- Related Files: docs/evidence/svg-raster-retry-cache.json
- Pattern-Key: tests.composed-mobile-receipt-and-input-identity

### Context Maintenance
- Scope: Vitest 5.0.5 / Playwright 1.64.1 / SafariDriver iPhone Safari 26.6.1
- Authority: 本次完整日志、208 个输入 hash、33 条原始服务器回执
- Revalidation: 测试框架、服务上限、fixture 或运行时变化后重新执行
- Validation: verified
- Last-Validated: 2026-11-15
- Evidence: docs/evidence/svg-raster-retry-cache.json
