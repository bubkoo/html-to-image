## [LRN-20261111-014] discovery

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending decision
**Area**: svg-stylesheet-scoping

### Summary
外部 use 的实际页面必须作为截图保真的对照；独立 SVG 图片不能替代这个原生行为。

### Details
相同真实 HTTP 输入在 Chromium 原生为绿/蓝，Firefox 遇页面内黄规则后为黄/黄，WebKit 和真实 iPhone Safari 为绿/黑。当前库导入节点后受页面规则影响，三引擎均导出黄/黄。去掉页面规则时，Firefox/WebKit 原生和导出均为绿/黑，Chromium 原生绿/蓝而导出绿/黑。

按文件样式保留优先级、选择器与副本作用域的原型可以产生绿/蓝，但它不能证明实际页面保真：四种带页面规则的对照中，Firefox/WebKit 共八项不同。原型保存在任务临时目录而未合入。已提出具体输出契约选择，未把时间经过视为用户选择。

SVG2 的 use 样式模型也提示不能先在原文档匹配选择器后冻结结果：未被引用进 shadow tree 的原始祖先可能不再参与匹配。保留原生规则匹配、优先级及继承比手写层叠优先级可靠，但浏览器实际输出仍须分别验证。

### Metadata
- Source: #585 / #627 follow-up; 15 actual page/capture observations and native iPhone controls
- Related Files: ../docs/evidence/svg-styles-native-matrix.json, ../test/browser/svg-style-native-probe.html
- Pattern-Key: svg.external-use-native-style-reference

### Context Maintenance
- Scope: external stylesheet behavior and choice between live-page fidelity and file-style normalization
- Authority: real HTTP live-DOM screenshots, capture pixels, source immutability, byte-identical real iPhone controls with and without main CSS
- Revalidation: external SVG CSS handling, browser engines, stylesheet scoping or output contract changes
- Validation: characterization only; PR #628 and master CI/CodeQL passed; output-contract decision still pending; no fixed-regression count or runtime completion claimed
- Last-Validated: 2026-11-11
