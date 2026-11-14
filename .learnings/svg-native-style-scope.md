## [LRN-20261115-005] native external SVG style scope

**Logged**: 2026-11-15 (Asia/Shanghai)
**Priority**: high
**Status**: source CI, CodeQL, Codecov and physical iPhone passed; final documentation head requires verification
**Area**: SVG stylesheet evaluation

### Summary
用户明确选择当前浏览器页面保真。外部 SVG 的选择器作用域须实测，计算样式的临时内容须隔离，探测失败不能丢掉仍然有效的资源。

### Details
文件隐藏、页面隐藏、可见及同文件片段正对照区分原生作用域，不靠 UA。Chromium 使用文件 CSS、Firefox 使用页面 CSS、WebKit 在当前样例均不使用；Firefox 的无片段根可为有效空结果。27 组同引擎真实源截图证明相应颜色、层叠、继承、变量及几何。原始片段之外的祖先不参与选择器，symbol 内 style 作为规则源有效但不参与实例的结构选择器计数。

页面规则在资源回调前冻结；定义按宿主上下文分别保留身份，HTTP 响应仍去重，循环路径先预留身份。无效 CSS URL 应保留浏览器的颜色回退，不能让 new URL 抛错中断捕获。

页面的通用 rect 几何会破坏直接放在源文档的探测。探测改在私有同源 sandbox 文档中运行，只允许自身生成的 Blob 图片；完成后追加 img-src none，再导入待计算内容。脚本与 HTTP 加载始终禁止。反向控制能观测到缺少锁时 WebKit 的 Blob 加载，源文档直接 staging 也会产生三引擎真实 HTTP 旁路及部分加载事件。

CSS 关联的 FontFace 在 Firefox/WebKit 不能加入其他文档的字体集合；仅忽略该特定归属异常，原字体资源嵌入继续由既有流程负责。默认和 skipFonts 模式均验证；不把这些颜色/兼容性对照称为任意 SVG 字体度量保真。

若 CSP 阻止 Blob 探测，保留原有定义嵌入并给诊断；不把此时完整样式保真记为通过。取消、失败与正常结束移除私有文档。Linux 测试必须提供真实第二来源，不能依赖 localhost 同时可由 IPv4/IPv6 访问。原始证据用带逐文件 SHA 的归档避开 GitHub 单体 diff 的 300 文件上限。

### Metadata
- Source: explicit user contract, native screenshots and real HTTP/Blob controls
- Related Files: ../src/svg-style-scope.ts, ../src/svg-references.ts, ../docs/evidence/svg-native-style-scope.json
- Pattern-Key: svg.native-style-scope-with-inert-evaluation

### Context Maintenance
- Scope: 28 native style fixtures; dependency, resource, abort, CSP fallback and loaded-page-font controls
- Authority: same final 87 checks old runtime 55 failures / 32 passes; candidate 87 passes plus 18 guards, 105/105 total
- Revalidation: browser SVG/CSS behavior, resource ordering, stylesheet scope, CSP or font/document lifecycle
- Validation: verification head 56e8a22, runtime byte-identical to 2a94455; full 922 coverage / 803 source / 147 package (inherited skips 4/4); physical iPhone ESM 28 + UMD 28 actual screenshot matches, 4 extra controls and 33/33 smoke; CI 43630931196, CodeQL 43630931147, Codecov patch 87.40/project 86.33 passed against 86.12
- Boundary: CSP-denied full style fidelity, matching opaque-sheet rules, file CSS imports/fonts, redirects and broader nested use remain open; do not close #585
- Last-Validated: 2026-11-15

### Coverage collection

Chromium-only V8 collection missed real Firefox/WebKit branches. Matched Vitest Istanbul now collects all three behavior suites plus the existing Chromium fixed-PNG regressions into a single LCOV. The uninstrumented three-engine suite remains. Readable CSS imports test real layer/supports/media, invalid URL fallback and disabled-sheet isolation; an inert-document API case proves two external use identities close a cycle with one resource load each and no source mutation.
