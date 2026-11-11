## [LRN-20261111-020] native SVG reference controls

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: medium
**Status**: pending
**Area**: SVG output semantics

### Summary
Fetch 的最终 URL 不能单独证明外部 SVG use 的原生页面像素。重定向和完整相对 paint URL 也存在引擎差异，需要先明确输出契约。

### Details
最终观察使用每场景唯一地址，先截源、后导出、再截源；加入直连相对 paint、纯色 external use 和黄色 HTML 对照。源完整像素前后不变。Chrome/真实 iPhone Safari 的两块相对 paint 是白底，Firefox/桌面 WebKit 为绿色；纯色/黄色对照均正常。库输出重定向红色、直连绿色。早期共享地址且只在导出后截源的探索不当作最终基线。

这里只记录差异，不把错误输出写成通过的回归，不合入统一最终 URL 的颜色变更；沿用尚待答复的“当前浏览器页面 / 文件定义”选择。

### Metadata
- Source: #585 / external SVG fidelity decision
- Related Files: ../docs/evidence/svg-redirect-native-matrix.json, ../docs/evidence/svg-redirect-observation-server.mjs.txt
- Pattern-Key: tests.native-before-export-with-isolated-resource-identity

### Context Maintenance
- Scope: 该四列 HTTP/相对 paint 场景，非所有重定向或所有 SVG 绘制规则
- Authority: 三个桌面引擎、真实设备、源/导出分离、有效正对照、唯一地址
- Revalidation: 输出语义选择、SVG 引用解析、浏览器版本/资源缓存行为改变
- Last-Validated: 2026-11-11
