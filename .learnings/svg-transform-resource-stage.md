## [LRN-20261111-018] SVG resource discovery after transforms

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: clone / resources

### Summary
SVG 依赖在整份 onClone/插件之前处理，违反“先变换副本，再发现资源”的顺序。新增/改向 use 不嵌入，删除引用却先请求；iframe 的 body 自行解析也会绕过外层变换。

### Details
捕获路径把 SVG 解析移到资源阶段，并把延后标志贯穿 children/iframe；不增加第二次扫描。直接内部 cloneNode 的默认解析行为保留，并用真正序列化后的绿色像素作兼容对照。辅助本地定义在发现时克隆，其 onCloneNode 回调也在资源阶段；主源树回调顺序不变，README 明确这个区别。继承样式缓存的清理移到依赖克隆之后，避免晚创建的缓存持有源文档。

新增/异步/插件/改向/本地引用、排除定义、资源解析器和局部节点回调的原始异常、删除及 iframe 删除均有行为回归。删除场景对任何库请求抛错，避免把“最终像素白色”误当成没有提前请求。

### Metadata
- Source: #585 / #427 review
- Related Files: ../src/capture.ts, ../src/clone-node.ts, ../test/browser/fixtures/transformed-svg.mjs, ../docs/evidence/transformed-svg-resources.json
- Pattern-Key: capture.resolve-svg-after-transforms

### Context Maintenance
- Scope: SVG 引用的捕获阶段；不声称所有视频/原生资源都已延后，不采用原 PR 的完整替代方案
- Authority: 当前 master 132c38d 的最终对照 30 失败 / 6 通过，候选 36 通过；其中三个通过项是独立 cloneNode 兼容对照
- Validation: 完整构建/类型/tarball/构建包 132 通过，最终覆盖率 282 / 源码 488（既有 GC skip 1）、lint/types 通过；真机与远端待验
- Last-Validated: 2026-11-11
