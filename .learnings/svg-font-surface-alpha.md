## [LRN-20261125-015] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
SVG 字形输出全不透明，也不能推出不透明 Canvas 中转会匹配真实页面；必须保留实际合成上下文的反例。

### Details
#651 的准确 head `08d35a1` 在 Linux CI 中仅 Chromium 字形失败：源、手写和重复 SVG 比较差 214 通道，HTML 原生对照相同。相同浏览器版本的已有隔离容器复现 CI PNG 和原夹具，两者逐通道相同；alpha:false 及中转后复制回 alpha:true Canvas 均可令该输入零差。

仅给普通白底文字 div 增加 translateZ(0) 即得到反例：RGBA 仍全为 255，原透明 Canvas 路径与真实源零差，opaque 中转却新增 1380 通道差，最大差 91。最终 Canvas 的 alpha 属性仍为 true，说明仅保存最终透明语义不够。实际像素边缘颜色分量不同，但未直接读取浏览器内部 LCD/layer 标志，不把机制猜测当测量。

### Suggested Action
否决按所有输出 alpha==255 自动切换及全局 alpha:false。新绘制路径必须同时通过原例和合成上下文反例；不因一个修复正例跳过透明、变换和字体平滑控制。保留 source、native PNG、冻结 SVG 与最终 Canvas 属性。

### Metadata
- Source: exact remote artifact and isolated Docker browser reproduction
- Pattern-Key: svg.font-raster-surface-alpha-compositing-counterexample
- Related Files: test/browser/fixtures/native-scroll.mjs

### Context Maintenance
- Scope: Playwright1.64.1 Chromium156 Linux；11 个已执行控制，反例出现后停止
- Authority: CI 摘要校验、真实源截图、相同输入各渲染路径与零差对照
- Revalidation: 浏览器、字体或绘制后端变化后重测
- Validation: automatic opaque route disproved; no runtime repair
- Last-Validated: 2026-11-25
- Evidence: output/playwright/linux-font-alpha-20261125/assessment.json
