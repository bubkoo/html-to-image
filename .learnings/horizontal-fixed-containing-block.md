## [LRN-20261111-021] Flex scroll without new containing blocks

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: scrolling / positioned descendants

### Summary
给普通 flex 项目添加 transform，会让它成为 fixed 和 absolute 后代的新定位参照。只修横向单行布局仍会遗漏同一根因在斜向、纵向、列布局、换行和 absolute-only 中的表现。

### Details
每个滚动轴用一对相反的物理边距表达位移，边距和为零，因此项目外部尺寸与 flex 行分配保持不变，也不新增包含块。Flex 项目的边距不折叠，故纵向同样适用。按源 offsetParent 调整定位后代 inset；已属于内部变换、相对容器、外层祖先或视口的关系保留。需要当前任务的源映射，并排除匿名文本、contents、sticky 和位移轴上未解析的 auto 边距。

同一最终 34 输入 × 三引擎，原始父版本 4d1bd59 为 90 失败 / 12 通过；上一版 7d66cb4 横向修复仍为 57 失败 / 45 通过。所有 102 个原生源控制先通过；候选的 102 项均比较整个 40×40 图像的 6400 个 RGBA 通道，全部相同。含旧 fixed 回归的定向 192 项通过。保留旧横向 PNG 作为标明 b4d8d23 的历史证据，不把它冒充为当前整个布局集合的真机结果。

### Metadata
- Source: #408 / #345 remaining containing-block boundary
- Related Files: ../src/clone-scroll.ts, ../test/browser/fixtures/horizontal-fixed-scroll.mjs, ../docs/evidence/horizontal-fixed-scroll.json
- Pattern-Key: scroll.flex-margins-preserve-containing-blocks

### Context Maintenance
- Scope: horizontal-tb flex、二维位移、row/column/reverse/wrap、fixed/absolute；非 flex、自动边距、匿名文本/contents/sticky/生成项目、竖排及原生滚动条保留边界
- Authority: 精确 4d1bd59 与 7d66cb4，只还原 clone-scroll.ts，最终共享输入保持不变
- Validation: 定向 192；完整 coverage/source/package 316/590/135（另 1 项既有 GC skip），lint/build/types/tarball 通过；当前真机和远端状态见证据
- Last-Validated: 2026-11-11
