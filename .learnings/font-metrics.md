## [LRN-20261111-004] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: browser-text-rendering

### Summary
用全局字号缩小补偿旧排版差异，会破坏源字号和真实换行；应先分离字号与字距，再用源布局和像素验证。

### Details
核对 #511/#415 后追溯 #270/#132：旧算法对每个计算字号取整再减 0.1。三引擎均将 20.75px 改成 19.9px，原第二行消失、13.75px 字形偏移，各 5 项回归失败。移除改写后，默认/全局/逐节点选择、受控字体 auto/normal/none 字距、不同字号/像素比、原 flex 末词结构通过。受控字体为本仓库原创几何字形，不依赖系统字体或旧错误参考图；字体生成器固定时间戳，连续生成的 SHA256 一致。

### Suggested Action
文字捕获先比较计算字号、源行数与导出像素；遇到历史补偿算法先复现其保护场景，再决定删除。不要对所有字体强制同一个 kerning 值，也不要以更新参考图隐藏布局变化。

### Metadata
- Source: investigation
- Related Files: ../src/clone-node.ts, ../test/browser-unit/font-metrics.test.ts, ../test/browser/fixtures/README.md, ../test/browser/package.test.ts
- Pattern-Key: capture.font-size-vs-kerning-metrics

### Context Maintenance
- Scope: 当前 Chromium/Firefox/WebKit，原创字体及 #132 flex 结构；旧浏览器和任意字体组合未全部验证
- Authority: 修复前三引擎 15/30 失败；修复后定向 30/30，含新增原场景的完整覆盖率 186/186、三引擎源码 201/201、构建包 81/81
- Revalidation: 改动计算样式、字体嵌入、SVG 排版或浏览器版本后重跑字号/字距与末词回归
- Validation: verified locally
- Last-Validated: 2026-11-11
- Evidence: ../docs/v2-regressions.md
