## [LRN-20261125-016] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: css-selector-snapshot

### Summary
原生滚动条完整选择器是否参与，不能由 prefix.matches、CSS.supports 或是否含 host 推断；受控 CSP 事件可提供独立信号，但缺席和源上下文仍需校准。

### Details
两引擎、普通与 ShadowRoot、七个 prefix 和八种完整 part/suffix 共 224 对 main/private 控制一致。56 对使用对应 root 轴的实际 client 几何，168 对使用对应 part 的真实源截图黄色像素，未以基础 computed pseudo 颜色替代。普通 light DOM 的 :is(.absent,.plain) #panel 即使 prefix.matches 为真，其条件 root/thumb/track 规则仍不参与；corner 无状态规则参与，否定简单 host 过滤。

受控 img-src none 的唯一背景资源产生 CSP violation 且零图像 HTTP 请求，固定树中与上述原生真值一致。448 行 fence 均到达，已有 part 事件均在对应首 fence 前，但这不是任意排程下的缺席证明。既有不可信 SVG frame 在 WebKit 连普通回调也不执行，该信号必须 unknown；另设仅受信探针 frame、保留 script-src none，可读父页面注册回调，inline script/onerror 负控无执行。没有放宽原 SVG 环境。

### Suggested Action
先验证同步纯 DTO 源上下文快照、安全重建、多 scroller 唯一归因、实际 CSP 等待取消与清理。保留完整选择器及 nesting/envelope；不能复制的动态/结构状态返回 unknown。当前只有接口计划，不能直接做生产规则过滤。

### Metadata
- Source: exact-selector native geometry/screenshots and controlled CSP events
- Pattern-Key: scrollbar.complete-selector-native-application-signal
- Related Files: src/clone-scrollbars.ts

### Context Maintenance
- Scope: Chromium156 / WebKit27.2；固定受控树及八种 part/suffix
- Authority: 224 对同 part 原生真值、CSP/fence 时序和清理读数
- Revalidation: 上下文、part、状态、隔离策略或等待模型改变后重测
- Validation: bounded signal confirmed; general snapshot/executor/filter unproven
- Last-Validated: 2026-11-25
- Evidence: output/playwright/shadow-exact-selectors-20261125/assessment.json
