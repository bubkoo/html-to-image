## [LRN-20261111-015] performance

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: computed-style-copy

### Summary
每个属性都检查节点是否 iframe，会让普通节点重复跨 realm 原型链识别。先筛出 display:inline，再识别节点类型。

### Details
这是条件短路顺序调整，不切换计算样式策略、不改复制顺序或输出格式。401 节点配对对照分别用同一 esbuild 版本打包基线和候选，六轮交替两种次序，去掉首个样本。Chromium 捕获中位数 202.8→141.6ms，Firefox 135→122ms，WebKit 150→138ms；三个引擎 SVG 字节完全相同，源不变。批量 CSSOM 写入实验约 2% 改善且字节不同，未保留；不能因为“批量写入”常见就假定是瓶颈。

#473 原历史构建的简单页面 CSS 模式在另一组 401 节点样例中确有明显体积/耗时优势；原媒体查询案例也在三引擎通过。先前 V2 hook 注入对照不能替代原分支实测。原分片仍读取完整图片，宽 17000 会缩为 16384，故不代表源图片解码或内存有界。

### Metadata
- Source: #473 / #585 review, original-head replay, paired computed-style benchmark
- Related Files: ../src/clone-node.ts, ../docs/evidence/style-copy-performance.json, ../docs/evidence/pr473-historical-controls.json
- Pattern-Key: clone.cheap-guards-before-realm-check

### Context Maintenance
- Scope: computed style loop and performance evidence; no whole-PR feature completion
- Authority: paired before/after samples, byte-identical SVG, source immutability; existing functional regressions retained
- Revalidation: condition order, style selection, iframe cross-realm detection or cloning changes
- Validation: full local 220/302/120 with 1 inherited GC skip; lint/build/types/tarball passed; real iPhone paired 135→124ms with identical SVG, full ESM/UMD smoke 24/24 on c2f78c1; PR #629 / master CI、CodeQL、PR Codecov passed；合并 b9f2dfd，树与已验 head 742f1e7 一致
- Last-Validated: 2026-11-11
