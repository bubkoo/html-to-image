## [LRN-20261111-019] SVG font glyph evidence

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: SVG fonts / verification

### Summary
假字体字节只能验证规则收集，系统字体 PNG 也不能证明网络字体被嵌入。#534 还明确要求直接选择 SVG 根，不能只验 HTML 包装入口。

### Details
使用仓库原创矩形字形 TTF，六种组合覆盖 text 属性、行内、SVG 根继承，以及包装/直接 SVG 入口。先截实际源像素，再验默认导出；skipFonts 白色是负对照，fontEmbedCSS 红色是正对照。未经修改的 v1.11.13 在 18 项中 15 项失败、3 项根继承通过；显式嵌入 18 项全通过。当前 V2 18 项全通过，属于已有实现的等价验证，不伪装成本轮字体运行时修复。

旧版 TTF MIME 是 application/font-truetype；只搜 data:font/ 会错报嵌入缺失。观察器检查 @font-face 的 data URL，再以实际字形判断，不依赖 MIME 名字前缀。

### Metadata
- Source: #581 / #534
- Related Files: ../test/browser/fixtures/svg-font-glyphs.mjs, ../docs/evidence/svg-font-glyphs.json
- Pattern-Key: tests.real-font-glyph-and-actual-capture-root

### Context Maintenance
- Scope: 所述六种受控入口/设置，不等于原中文字库或原项目全部环境
- Authority: 原版源码 9957281 真实构建、有效字体、正负对照和同引擎源截图
- Validation: 三引擎 18/18 及实际 ESM/UMD 包通过；真机待验
- Last-Validated: 2026-11-11
