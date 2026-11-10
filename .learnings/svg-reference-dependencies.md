## [LRN-20261111-013] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: svg-reference-embedding

### Summary
复制 SVG 引用必须处理依赖图和原始作用域，而不只是被引用的单个 symbol。

### Details
旧逻辑漏掉兄弟渐变/裁剪/遮罩/符号，重叠与跨文档同名 ID 也不能只用字符串缓存。候选使用原始 Element 身份和文档/ShadowRoot 索引，递归前预留别名，已导入的重叠子树复用节点；外部节点分配私有 ID，本地节点保留克隆回调。资源地址按请求文档和 xml:base 解析，统一走既有 loader；不引入全局文档缓存。过滤时记录弱引用的排除祖先，避免后续依赖补齐重新恢复被排除内容。

href 优先级必须用空值合并：显式空现代属性也优先于 XLink。无 href 的 SVG image/feImage 不应加载当前页面。源码输出必须和同引擎原生 SVG 对照；WebKit 蓝色舍入和 Firefox 特殊编码 ID 的原生限制不能通过放宽像素断言掩盖。

本次只证明属性和行内样式的依赖图；外部兄弟样式表/字体、后续变换新增引用及重定向基准仍未建立证据。不能用这项修复概括整个 #585 或通用 iOS 重绘。

### Metadata
- Source: #585 / #427 / #499 / #393 review and controlled SVG dependency fixtures
- Related Files: ../src/svg-references.ts, ../src/clone-node.ts, ../src/embed-images.ts, ../src/task.ts, ../test/browser/fixtures/svg-dependencies.mjs
- Pattern-Key: svg.reference-dependency-graph

### Context Maintenance
- Scope: original-document SVG graph, IDs, image resources, filtering and frozen outputs
- Authority: final baseline 29 failures / 13 passes; candidate 42 passes across three engines
- Revalidation: clone ordering, URL resolution, SVG embedding, filtering or resource-cache changes
- Validation: lint/build/types/tarball passed; full local 220/302/120 with 1 inherited source GC skip; native and remote pending
- Last-Validated: 2026-11-11
