## [LRN-20261125-001] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
原生滚动条的方向和轨道侧别不能由基础伪元素计算样式推导；选择器重定位必须保留条件、优先级和层叠。

### Details
旧原型只复制基础部件，丢掉 :horizontal/:vertical 和 :start/:end。冻结同一批输入、仅替换 clone-scrollbars.ts，Chromium/WebKit 的 22 例从 12 失败/10 通过变为 22 通过；Firefox 仅两项标准属性输入适用，九项 legacy 输入由原生能力判断排除。候选保留限定选择器、important、层叠块与顺序，并用 :is(:where(.snapshot),original-prefix:not(*)) 保留来源前缀的原生 specificity，避免手写优先级解析。

进一步真实鼠标与双源 HTTP 控制证明仍有两个缺口。部分表可读不代表已拿到完整规则；一个可读匹配会抑制 computed fallback，漏掉不可读覆盖规则。原生 thumb 悬停前后 base computed 始终为黑色，qualified pseudo 查询为空，元素 :hover 也无法区分内容和滑块。不能靠追加 base 样式或删除 :hover 伪装为完整冻结。原型仍未通过完整验收。

### Suggested Action
通过现有 stylesheet 资源通道获取可授权读取的缺失 CSS，保持导入、最终响应基址、层叠和取消契约；对原生部件交互状态继续寻找可证明的数据来源。原始源码、全像素失败、对照与输入哈希成套保存。

### Metadata
- Source: investigation
- Pattern-Key: css.native-scrollbar-qualified-state-snapshot
- Related Files: src/clone-scrollbars.ts, src/clone-scroll-native.ts, test/browser-unit/native-scrollbars.test.ts

### Context Maintenance
- Scope: Playwright 1.64.1, Chromium 156, Firefox 157 and WebKit 27.2; candidate f3a00b0
- Authority: Frozen-input source comparisons, actual native screenshots and independent CSSOM/hover controls
- Revalidation: Recheck after stylesheet resource integration or native state API changes
- Validation: incomplete; native rendering and resource/state cases remain open
- Last-Validated: 2026-11-25
- Evidence: docs/evidence/native-scroll-fidelity-followup.json
