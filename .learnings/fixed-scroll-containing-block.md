## [LRN-20261111-017] fixed scroll containing block

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: clone-scroll

### Summary
不能把 position:fixed 等同于固定在视口。源浏览器的 offsetParent 可区分当前容器、其他祖先或视口；不应枚举 transform 后就假定其他 CSS 都不建立包含块。

### Details
旧 transformed-fixed + sticky 测试在顶部期待蓝色，但三个浏览器原生源截图均为绿色；fixed 的相对顶部是 -50px，已经滚出。旧测试绿只证明实现自洽，不证明页面保真。

纵向块布局中有 fixed 后代时复用伪元素流偏移，避免平移普通包装元素产生新的 fixed 包含块。仅对源 offsetParent 是当前滚动容器的 fixed 后代调整 inset，并清除相反 inset 的约束；保留原变换。不能给每个 fixed 再添加 transform，否则嵌套 fixed 的包含块又会改变。相同原则用于横向/斜向路径的直接 fixed 子元素。嵌套、已有 fixed 变换、bottom/auto/right/RTL、源 important 和滤镜等均有实际页面像素对照。

### Metadata
- Source: #408 / #345 / #594; corrected earlier #611/#615 transformed-fixed assumptions
- Related Files: ../src/clone-scroll.ts, ../test/browser/fixtures/fixed-scroll.mjs, ../docs/evidence/fixed-scroll.json
- Pattern-Key: clone.fixed-source-containing-block

### Context Maintenance
- Scope: 已测纵向块流及直接横向/斜向 fixed；不是任意固定元素/滚动组合或滚动条外观的完成声明
- Authority: 27 输入 × 三引擎，基线 57 失败 / 24 通过且原生源对照无失败，候选 81 通过；独立原生 PNG 已归档
- Revalidation: fixed 包含块、offsetParent 兼容性、复制 inset、流偏移、子节点变换或捕获根偏移变化
- Validation: 完整 lint/build/types/tarball、261 覆盖率、425 源码（另 1 项既有 GC 跳过）、126 构建包通过；源码 c3b2d09 真实 iPhone Safari 完整 26/26、新增 27 输入 ESM/UMD 通过；独立 W3C element screenshot 验证原生源为绿/红/绿、offsetParent 为当前容器，原始截图已归档；远端待验
- Last-Validated: 2026-11-11
