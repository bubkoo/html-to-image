## [LRN-20261115-005] native external SVG style scope

**Logged**: 2026-11-15 (Asia/Shanghai)
**Priority**: high
**Status**: candidate verified locally; device and remote gates pending
**Area**: SVG stylesheet evaluation

### Summary
用户明确选择当前浏览器页面保真。不能把所有外部 SVG 统一渲染成文件样式，也不能把解析后的活动内容接入源页面来计算样式。

### Details
用互相独立的文件隐藏、页面隐藏、可见正对照和同文件片段正对照区分原生作用域，不靠 UA。Chromium 使用文件 CSS，Firefox 使用主页面 CSS，WebKit 在当前样例中均不使用；Firefox 对无片段完整根的有效原生结果为空。原生源截图逐 RGBA 通道证明这些差异。被引用根之外的祖先不参与选择器匹配，symbol 内的 style 作为规则源有效但不参与实例的结构选择器计数。

样式文本须在外部资源回调前冻结。样式计算保留真实选择器、层叠、媒体条件、宿主继承和变量；原始 XML 按宿主上下文分开身份，HTTP 资源仍去重。内层跨文件引用继续传递上下文，循环路径预留身份。

把副本接入源文档会在三个引擎产生真实 HTTP 旁路请求，部分引擎还执行加载事件。私有 iframe 仅允许同源访问，禁止脚本，并以 CSP 禁止自动资源加载；其中使用独立 ShadowRoot 计算样式，已有加载完成的 FontFace 可共享，未授权的新请求继续只能走已有 resolver。结束、失败和取消均移除私有文档。服务器计数有独立控制请求，不能把浏览器报告的 CSP 拦截尝试误称为真实 HTTP。

### Metadata
- Source: explicit user contract; native screenshots and controlled HTTP counters
- Related Files: ../src/svg-style-scope.ts, ../src/svg-references.ts, ../docs/evidence/svg-native-style-scope.json
- Pattern-Key: svg.native-style-scope-with-inert-evaluation

### Context Maintenance
- Scope: 24 authored style fixtures, three desktop engines, source immutability and resource/abort controls
- Authority: old runtime 47 failures / 28 passes; candidate 81 passes; full 379 coverage / 779 source / 144 built package, inherited skips 1 / 4
- Revalidation: browser CSS/use behavior, selector scopes, stylesheet/resource ordering, CSP or cancellation lifecycle
- Validation: local only at this checkpoint; matching opaque-sheet rules, file CSS imports/fonts, redirects and broader nested-use support remain uncertified; do not close #585
- Last-Validated: 2026-11-15
