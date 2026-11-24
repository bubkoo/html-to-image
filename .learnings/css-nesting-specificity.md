## [LRN-20261125-004] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: css-selector-snapshot

### Summary
展开 CSS nesting 时，完整父选择器列表必须作为 :is(...) 保留，以保持原生的最大 specificity；需要词法识别真正的 &。

### Details
逐个父分支展开会改变未匹配ID分支仍贡献的最大specificity。正确表示把每个真正的 & 替换为 :is(完整父列表)，无显式 & 的每个子selector-list分支单独加隐式父后代；前导相对组合符也由此保留。字符串、属性值、注释和转义中的 & 不是nesting selector。不要用trim丢掉有效selector末尾的escaped空格。

19组原生CSS nesting与展开后CSS在Chromium/Firefox/WebKit中实际computed color/outline及cascade均一致，共57/57；父列表、子逗号、>+~、:is/:where/nth、双&、字面/escaped amp、属性字符串和注释均有控制，源文件测量前后字节相同。这只验证该纯helper，完整CSSOM收集、资源和原生滚动条验收仍需独立接入验证。

### Suggested Action
在CSSStyleRule快照中保留嵌套cssRules并携带父上下文；像素输出与资源基址预判应复用同一选择器展开规则。用原生computed-style与cascade竞争者验证，不能只比较预期字符串。

### Metadata
- Source: implementation and independent native DOM/CSSOM comparisons
- Pattern-Key: css.nesting-parent-list-specificity
- Related Files: src/css-nesting.ts, output/playwright/css-nesting-20261125/native-results.json

### Context Maintenance
- Scope: Playwright1.64.1 Chromium156.0.8078.4, Firefox157.0, WebKit27.2
- Authority: 57 meaningful native computed-style comparisons and source hash guard
- Revalidation: Recheck helper semantics and integrated CSSOM traversal after any selector/parser change
- Validation: helper passed; integration pending
- Last-Validated: 2026-11-25
- Evidence: output/playwright/css-nesting-20261125/assessment.json

### Integration checkpoint

已接入纯 selector helper 和完整 capture 流程。最终同输入 source 专项64通过/32 Firefox不支持；ESM/UMD资源组在支持的Chromium/WebKit均通过。该结论不覆盖任意ShadowRoot重定位或原生thumb hover。 见 docs/evidence/scrollbar-stylesheet-resources.json；后续完整门禁的严格失败另列，未称整体修复。
