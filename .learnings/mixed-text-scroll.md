## [LRN-20261111-016] mixed scroll layout

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: clone-scroll

### Summary
运行时 scrollTop 不在序列化 DOM 中。直接文字不能逐元素平移；包裹全部子节点又会改变结构选择器。对限定的纵向块布局，用副本 ::before 表达流偏移，保留真实子节点的顺序。

### Details
空 ::before 使用 1px 高度和 -(scrollTop+1)px 顶边距，净偏移仍为 -scrollTop，但非零盒子阻止后续负边距与偏移边距合并。已有块级 ::before 只调整原顶边距。规则放在 SVG 外层最早声明的私有 layer 中，使用 important，避免源 ID/分层 important 伪元素规则覆盖；不在 HTML 子节点中插入 style 或包装元素。

源页面截图才是定位参照：transformed scroller 中的直接 fixed 子元素会随其包含块滚出，不能照抄其他 fixed 用例的蓝色期望。新路径仅处理已测的这个组合；旧路径保持原行为，其他组合保留边界。

### Metadata
- Source: #408 / #345 / #594
- Related Files: ../src/clone-scroll.ts, ../src/util.ts, ../test/browser/fixtures/mixed-scroll.mjs, ../docs/evidence/mixed-scroll.json
- Pattern-Key: clone.scroll-flow-without-child-restructuring

### Context Maintenance
- Scope: 正 scrollTop、horizontal-tb 的 block 混合文字/行内布局；不等于完整滚动条外观或任意定位支持
- Authority: 14 个相同 fixture，三引擎实际源截图逐点核对；旧源码 42/42 失败且源对照全通过，候选 42/42 通过；DOM 和滚动状态不变
- Revalidation: 伪元素层叠、边距合并、序列化结构、fixed 包含块、iframe 克隆变化
- Validation: lint/build/types/tarball、覆盖率 234、三引擎源码 344（既有 GC skip 1）、构建包 123 全通过；真机和远端待验
- Last-Validated: 2026-11-11
