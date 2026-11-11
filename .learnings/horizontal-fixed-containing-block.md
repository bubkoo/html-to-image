## [LRN-20261111-021] Horizontal flex scroll without new containing blocks

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: scrolling / positioned descendants

### Summary
横向滚动给每个子元素添加 transform，会让普通包装容器突然成为 fixed/absolute 的定位参照。#631 的纵向流偏移和直接 fixed 修复没有覆盖深层横向后代。

### Details
单行横向 flex 通过成对相反的物理侧边距移动每个流内项目，保持其主轴外部尺寸和原始 transform，不新增定位包含块。固定和绝对定位后代只在原始 offsetParent 为滚动容器时调整 inset；属于更内层已有变换、外部祖先或视口的参照不改变。RTL、row-reverse、两层包装、已有 margin、important、样式筛选和 absolute 后代都有原生源像素对照。

最终同一共享 fixture 在修复前 33 失败 / 3 通过，所有 36 个原生源截图对照先通过。已有变换包装是三个正对照。候选加原有 fixed 回归 126 项通过；完整与真机/远端状态见证据，不沿用旧候选通过数。

### Metadata
- Source: #408 / #345 remaining horizontal containing-block boundary
- Related Files: ../src/clone-scroll.ts, ../test/browser/fixtures/horizontal-fixed-scroll.mjs, ../docs/evidence/horizontal-fixed-scroll.json
- Pattern-Key: scroll.flex-margins-preserve-containing-blocks

### Context Maintenance
- Scope: horizontal-tb、单行 flex、非 auto 侧边距、无直接文本/contents/后代 sticky 的横向滚动；不宣称对角、自动边距或整个旧 issue 已修复
- Authority: 精确父提交 4d1bd59 与最终同一源截图/导出像素回归
- Validation: 定向 126、完整 coverage/source/package 294/524/135 通过（另 1 项既有 GC skip），lint/build/types/tarball 通过；真机和远端待验
- Last-Validated: 2026-11-11
