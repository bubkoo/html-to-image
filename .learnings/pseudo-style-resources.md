## [LRN-20261111-012] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: css-resource-embedding

### Summary
伪元素背景和注入的 CSS 规则必须进入资源嵌入阶段，不能只处理 Element.style。

### Details
复核 #376/#407 时，真实 HTTP 的 ::before/::after 背景未调用资源解析器，SVG 仍含外部地址，三个引擎都导出红色底色而不是绿色图片。候选让规则声明复用行内 background/mask 的嵌入逻辑；每次捕获懒建一个无窗口的解析文档，通过原生 CSSOM 遍历样式及分组规则，共用原有资源缓存、解析器与请求策略。

不用 replaceSync 解析完整样式文本，因为它丢弃 @import。无窗口解析样式保留 import，但不下载或展开其内容；font-face 仍由原字体阶段处理，text/plain 样式块不按 CSS 读取，content 中的 url 字面文本也不被资源扫描误改。解析文档保留至异步操作结束，避免重犯 WebKit 文档所有权问题；没有全局文档缓存。

最终六项定向用例在旧源码均失败；完整本地和真实 iPhone/远端检查另行记录。本修复覆盖 background/mask 直接 URL，不承诺所有 CSS URL 属性或原生滚动条外观。额外对照中，注入 @media(min-width:1px) 的规则在 Firefox/WebKit SVG 输出未生效，而 @media all 生效；它是受控规则注入实验，不是历史 #473 完整实现回放。

### Metadata
- Source: #376/#407 extension review and controlled HTTP pseudo-element fixture
- Related Files: ../src/embed-images.ts, ../test/browser/fixtures/pseudo-resources.mjs, ../test/browser-unit/pseudo-resources.test.ts
- Pattern-Key: css.pseudo-style-rule-resource-embedding

### Context Maintenance
- Scope: generated and transform-added style rules, background/mask direct URLs, existing image cache and font policy
- Authority: six baseline pixel failures; grouped CSS, request counts and source immutability controls
- Revalidation: stylesheet parsing, resource-stage recursion, CSS properties or parser document ownership changes
- Validation: final targeted 6 passed; full local 210/272/117 with 1 inherited GC skip, lint/build/types/tarball passed; real iPhone 23/23 passed on 58de76f; remote pending
- Last-Validated: 2026-11-11
