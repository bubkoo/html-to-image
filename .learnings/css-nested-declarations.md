## [LRN-20261125-007] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: cssom-nested-declarations

### Summary
保留CSSStyleRule.cssRules仍不足以完整复制原生嵌套样式；CSSNestedDeclarations是单独的type0、仅style节点。

### Details
Chromium156/Firefox157/WebKit27.2的原生CSSOM都把`.panel::-webkit-scrollbar-thumb{background:black;@media(min-width:300px){background:blue}background:yellow}`表示成父CSSStyleRule.style=black、media子CSSNestedDeclarations.style=blue、尾部CSSNestedDeclarations.style=yellow。该节点没有selectorText/cssRules。当前DTO把它降为kind:text，输出只保留@layer文本，因此丢掉真正的滑块声明。

在有效的Chromium/WebKit路径，直接/嵌套伪元素tail及inactive-media-tail分别差1360通道，active media-only差680。普通父selector的tail颜色已由正常元素样式冻结，其两个正对照均零差；不能把所有尾声明都误当滚动条缺陷。Firefox legacy family不支持，只记录native CSSOM形态/unsupported。

### Suggested Action
为CSSNestedDeclarations提供独立纯声明DTO，保留原始顺序并继承当前位置完整父selector；相对URL预判和输出都要覆盖它。父可能含伪元素，不宜简单转成`&`并套`:is(parent)`。遵循现有DOM属性隔离原则，不缓存native style/rule对象；完整capture/资源/包测试仍须在主线接入后验证。

### Metadata
- Source: native CSSOM/computed pseudo colors and fullRGBA collector/SVG comparisons
- Pattern-Key: css.nested-declarations-preserve-parent-and-order
- Related Files: src/clone-scrollbars.ts, output/playwright/css-nested-declarations-20261125/assessment.json

### Context Maintenance
- Scope: collector SHA002d24434fb4787b10aa86d6e00aa34dee5219620a15c43810521f602aebb31c; Playwright1.64.1
- Authority: current-source hash guard, exact collector bodies, raw native CSSOM and saved PNG/SVG
- Revalidation: Check integrated declaration DTO and capture/packet regressions after changes
- Validation: isolated collector failure confirmed; fix pending
- Last-Validated: 2026-11-25
- Evidence: output/playwright/css-nested-declarations-20261125/results.json

### Integration checkpoint

已用声明DTO保留type0节点、原父selector和顺序；6个declarations模式在两种支持引擎的完整capture及ESM/UMD资源组通过。Firefox仅原CSSOM控制，不是legacy滚动条像素验收。 见 docs/evidence/scrollbar-stylesheet-resources.json；后续完整门禁的严格失败另列，未称整体修复。
