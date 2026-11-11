## [LRN-20261111-022] Native scroll state can survive SVG via snap alignment

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: investigating
**Area**: scroll snapshot / native rasterization

### Summary
根因是序列化不会携带运行时 scrollTop/scrollLeft；移动内容需要逐种重建 fixed、sticky、flow、滚动条等布局语义。手写 SVG 对照表明，静态 CSS scroll snap 可以让浏览器在图像内恢复原生滚动，比继续叠加布局位移规则更接近问题本质。

### Details
Chrome 的 scroll-initial-target 可在 SVG 内初始化滚动，另两个当前引擎不支持。三引擎共同支持的 scroll-snap-type 配合私有 before 目标，在源节点没有 snap 的情况下恢复源的正向/RTL 双向偏移；padding/border 也逐像素一致。1px 高、-1px 顶边距的零净流目标避免包裹和新增包含块。相反的 scroll-margin 编码源视口，必须包含 padding 与 clientHeight。

8 种基础输入 × 三引擎包含序列化丢失偏移的负对照；不能把不支持 initial-target 的源页面仍处于零偏移而得到相同红色，算成恢复成功。最终 4 种 injected 输入 × 三引擎全部像素相同；20 种实际块布局 × 三引擎全部相同，已有可见 before 的场景保留为不适用，没有覆盖它。

WebKit 专有自定义滚动条的实际源可见：零偏移的原 SVG 已一致，运行时偏移丢失产生 640 个不同通道，注入 snap 后回到零差异。Chromium 的源 overlay 条隐藏，图像内却画出经典条，零偏移已不同；不能把 snap 当作该差异的修复。Firefox 不支持那组伪元素，零差异不是滚动条正对照。

这是独立手写 SVG 观察，没有生产实现或真机 initial-snap 验收。初步库段落测试含尚未有效的 source controls，没有作为 baseline 或通过数使用。后续实现要处理已有目标/伪元素、非块布局和实际滚动条策略，再验证原始问题，不把当前部分场景声明为 #81/#345 整体修复。

### Metadata
- Source: #408 / #81 / #345 / #376
- Related Files: ../docs/evidence/native-scroll-snap-investigation/native-scroll-snap-investigation.json
- Pattern-Key: scroll.serialize-native-offset-with-snap-target
- Reference: https://drafts.csswg.org/css-scroll-snap-2/

### Context Maintenance
- Scope: 独立序列化探测；当前 Chromium157 / Firefox158 / WebKit27.2，尚未接入库
- Authority: 原生源截图先于图像生成，所有通道比较，原输入/完整 SVG/重放脚本及关键源和导出 PNG 保存；不依赖 CSS.supports 断言行为
- Validation: 12 个 injected 精确像素对照、60 个块布局对照、WebKit 可见滚动条正/负对照；不使用无效和不适用输入扩大数量
- Last-Validated: 2026-11-11
