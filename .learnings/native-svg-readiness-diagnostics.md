## [LRN-20261125-013] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
原生 SVG 准备失败应在 finally 清理前记录原尺寸样本、资源时序和所属测试页面状态；随后通过不能解释首次失败。

### Details
完整默认检查曾出现 Firefox 原生 SVG 准备和截图失败，均在库导出之前。同输入复查及后续完整检查通过，但没有首次失败现场的请求时序和 bbox 向量，不能直接称为偶发或生产回归。独立 25 场原样夹具均就绪，同时发现视口外 iframe 会明显降频；它未复现原失败，也不是充分根因。

现有 fixture 保留原 60 次 RAF、getBBox 顺序、几何条件和错误前缀，只存原已读取的宽度和时间，失败时再读取连接状态、outer SVG 样式、父 iframe 位置与可用 ResourceTiming。实际 Firefox 的四场正常/故意 404 控制确认：负控恰有 60 个样本，404 Timing 与被动 HTTP response/status/MIME 互证；finally 清理后无 SVG/use，未调用生产 capture。354 项三引擎相关 coverage 回归通过。

### Suggested Action
失败记录必须先于清理，不增加请求、预热、重试、等待预算或放宽断言。ResourceTiming unknown 不能推断没有请求；frame rect/样式不能证明完整遮挡关系。保留首次失败，等待实际失败现场再决定修复。

### Metadata
- Source: investigation and controlled native HTTP failures
- Pattern-Key: tests.native-svg-readiness-before-cleanup
- Related Files: test/browser/fixtures/svg-native-styles.mjs

### Context Maintenance
- Scope: 原生 HTTP SVG fixture；四个 Firefox 正负控制和三引擎相关回归
- Authority: 原 bbox 样本、HTTP 404、ResourceTiming、清理读数与输入哈希
- Revalidation: fixture 准备逻辑或浏览器调度改变后重测
- Validation: diagnostic evidence verified; original failure root cause unresolved
- Last-Validated: 2026-11-25
- Evidence: output/playwright/native-svg-readiness-diagnostics-20261125/assessment.json
