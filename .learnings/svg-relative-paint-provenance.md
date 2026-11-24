## [LRN-20261125-002] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
外部 SVG 相对 paint 地址在计算样式扁平化时丢失来源；在 HTML 测量副本增加 xml:base 无法恢复。

### Details
真实 HTTP external use 的属性/inline 相对 paint：Chromium 从页面目录取红色图案，Firefox/WebKit 从 SVG 文件目录取绿色。测量副本 rect 或 svg 上加 xml:base 后，三引擎的 baseURI 和 computed fill 仍指页面目录，六个 inline 对照均红。不同 query 的资源改为黄/蓝后，Chromium 为蓝、Firefox/WebKit 为黄，证明该对照保留 query 身份，分歧仍在目录 base。错误在 freezeSVGFragmentStyles 的 importNode → getComputedStyle 阶段已经绝对化；后续 reference/baseFor 无法还原原始相对来源。

### Suggested Action
在计算样式前保留 presentation attribute / inline paint 的原始来源，并独立验证实际 HTTP paint base 策略。不要依据 UA、已有 stylesheet page/file 标志或已否定的 Blob clipping 探针推断此策略；不要全局改用文件目录。

### Metadata
- Source: investigation
- Pattern-Key: svg.computed-style-relative-paint-provenance
- Related Files: src/svg-style-scope.ts, src/svg-references.ts

### Context Maintenance
- Scope: Chromium 156.0.8078.4 / Firefox 157.0 / WebKit 27.2, Playwright 1.64.1; native HTTP-only probes
- Authority: docs/evidence/native-scroll-fidelity-followup.json
- Validation: unresolved; no production change or device acceptance
- Last-Validated: 2026-11-25
- Evidence: docs/evidence/native-scroll-fidelity-followup.json
