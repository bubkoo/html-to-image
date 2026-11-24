## [LRN-20261125-003] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
WebKit 原生滚动候选的高 DPR 分数坐标失败可在无库、无滚动的 HTML 盒到 SVG 图像中重现；SVG 字体首绘还受到独立 URL 缓存层影响。

### Details
40×40 绿盒内 (4.5,4.5) 的 4×4 蓝盒，在 DPR1 的 Chromium/Firefox/WebKit SVG foreignObject→Canvas 对照均为零差。DPR2 时 Chromium/Firefox 为零差，WebKit 差60通道/max255；同一原型实际 fractional fixture 的原生 SVG img 截图也差60，80×80 源设备截图与 pixelRatio2 导出仍差60，排除了“只有 Canvas 读取”或“仅 source CSS 截图降采样”的解释。

把蓝盒表示成整数 left/top 加 0.5px translate 可让 WebKit DPR2 为零，但会让 WebKit DPR1 和 Chromium DPR1/2 出现32/60通道差异；identity transform 在 Firefox DPR2 也引入60通道差。不能全局增加 transform，尤其它还会改变 fixed 包含块。

在每个模式使用全新 browser context 的字体控制中，HTML CSS 真实文字绘制、FontFace URL/ArrayBuffer 预载均不能改变原冻结 SVG 的首幅264通道差。一个独立且实际引用同字体 URL 的最小 SVG 只需 decode 后等待20ms、不必 drawImage，即可让后续目标首次解码降到21（software Canvas 为零）；仅声明未用字体或使用 serif 不生效。同字体字节换一个等价 URL 后不生效，换 font-family 名称但保留 URL 则生效。字体 URL 两个版本均 FontFace.load 成功、1120字节和 SHA256 相同。支持继续检查 SVG Image 字体资源缓存/首次布局，不证明已经找到可用通用渲染修复。

### Suggested Action
保留 DPR1/2、CSS/device 同尺寸原生截图、首次解码和后续新 URL 的分离对照。上游源码只能按 Playwright 的 UPSTREAM_CONFIG.sh 基线定位，不能把当前 WebKit main 的重构代码当成被测二进制；不放宽像素断言，也不默认引入字体预热或 Canvas 后端切换。

### Metadata
- Source: investigation
- Pattern-Key: webkit.svg-image-css-pixel-snapping-and-font-url-cache
- Related Files: test/browser/fixtures/native-scroll.mjs, docs/evidence/native-scroll-fidelity-followup.json

### Context Maintenance
- Scope: Playwright1.64.1 WebKit2370/27.2 macOS; Chromium156.0.8078.4 and Firefox157.0 controls
- Authority: Fresh-context full-RGBA native PNG comparisons and saved SVG/PNG inputs; source/bundle hash guard in fractional-dpr
- Revalidation: Recheck when browser revision, page DPR, layout or SVG drawing backend changes
- Validation: unresolved
- Last-Validated: 2026-11-25
- Evidence: docs/evidence/native-scroll-fidelity-followup.json
