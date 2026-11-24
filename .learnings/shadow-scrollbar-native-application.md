## [LRN-20261125-011] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
滚动条条件规则移出 ShadowRoot 后可能改变实际应用语义；selector 接受与 Element.matches 不能证明原生 part 的实际绘制。

### Details
候选 f3a00b0 将 :host(.theme) #panel::-webkit-scrollbar-thumb:horizontal 重定位到普通 Document。Chromium 源、同 ShadowRoot/同 selector 手写重放、普通 HTML 和候选 SVG 一致。WebKit 源和同 ShadowRoot 重放为黑色滑块，重定位后变黄，各差 462 RGBA 通道；追加 scrollbar:vertical width:19px 与 :horizontal height:17px 后，源/重放 client=[89,93]，重定位后=[81,83]，差 3742/3786。普通 ShadowRoot #panel 条件规则是正对照。

两引擎 prefix Element.matches 都为 true，六条 selectorText 均保留且 CSS.supports(selector(...)) 均 true。两引擎 qualified getComputedStyle 都返回空声明，base thumb 都为黑。原猜测 prefix 不匹配不成立；基本 :host 颜色正例掩盖了 conditional part 的实际语义差别。

### Suggested Action
把同 ShadowRoot 同 selector 的原生手写重放保留为控制。在重定位前以可观察的原生几何能力验证条件规则的应用，增加原生尺寸负对照；不要按 UA 名称丢规则，也不要把 CSSOM/匹配/基础 computed pseudo 当作完整应用证明。原帖具有 Shadow DOM 上下文，该边界应进入真实源截图回归。

### Metadata
- Source: investigation
- Pattern-Key: shadow.native-scrollbar-conditional-rule-application
- Related Files: src/clone-scrollbars.ts

### Context Maintenance
- Scope: Chromium 156.0.8078.4 / WebKit 27.2, Playwright 1.64.1; exact f3a00b0 helper snapshot
- Authority: output/playwright/scrollbar-shadow-20261125/assessment.json
- Validation: unresolved; no integrated library/device acceptance
- Last-Validated: 2026-11-25
- Evidence: output/playwright/scrollbar-shadow-20261125/index.json

### Follow-up: bounded native geometry capability

同一 f3a00b0 的 createSVGStyleEnvironment.getDocument(false) 可承载该已复现规则形态的原生几何控制。主页面 offscreen 与锁资源的活动私有 iframe 共 32 组读数一致：base11/7、普通 #panel qualified19/17、host 不匹配负例均有效；matching host-qualified 在 Chromium 为81/83、WebKit为89/93。完全按client尺寸分类，成功预测已存真实源几何及对应黄/黑滑块参与状态；没有 UA 决策分支。qualified computed、CSS.supports 和 matches 仍不能替代该控制。

此结果仅证明 descendant :host(.theme) #panel 与 horizontal/vertical 家族，不推广成任意selector策略。无效正负控制或私有文档创建失败应保留unknown。实例复用、dispose幂等、移除host/iframe、body恢复，以及abort前的dispose拒绝均已单独验证；未提供生产集成或设备/GC验收。证据：capability/assessment.json 与 capability/receipt.json。

### Follow-up: complex branches bound the inference

TypeScript 原型位于 policy-prototype.ts，无源selector过滤或Document/Frame缓存。在 Chromium，简单 matching :host(.theme) 规则参与，但 :is(:host(.absent), .plain) #panel 即使存在内部.plain祖先、Element.matches为true且selector全获支持，条件几何仍不参与；主页面和私有文档一致。不能按字符串contains(:host)或一个简单host布尔值过滤复杂:is/:where规则。:where(:host(.theme))在当前两个引擎碰巧与简单形态一致，但未据此扩大原型契约。

## [LRN-20261125-012] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: cancellation

### Summary
在把可选探针错误格式化成unknown之前先检查取消；abort reason本身的字符串转换可能抛错，破坏原始原因身份。

### Details
原型初版catch先调用String(error)。令AbortController.reason为toString会抛错的对象，在private Document建立期间取消：Chromium/WebKit均先调用该toString一次，并抛出新的Error，sameReason=false。修正为取消状态不格式化错误、finally完成资源清理后原样throw signal.reason，两引擎均sameReason=true且coercions=0。另25个已有取消对照覆盖0/false/null/string/object、private Document pending，以及八个control建立后的取消，最终均保持原reason并清理完毕。

### Suggested Action
可选能力探针应将取消和测量失败区分：取消不进入错误描述流程；测量失败可以返回有界unknown。finally清理失败也不应覆盖原始取消reason。任务边界等待应在取消时清timer和listener。

### Metadata
- Source: prototype debugging
- Pattern-Key: abort-reason-formatting-can-throw
- Related Files: policy-prototype.ts

### Context Maintenance
- Scope: standalone policy prototype, Chromium 156.0.8078.4 / WebKit 27.2
- Authority: reason-coercion/before.json, reason-coercion/after.json, policy-validation/receipt.json
- Validation: prototype-fixed; not integrated into production source
- Last-Validated: 2026-11-25
- Evidence: policy-assessment.json
