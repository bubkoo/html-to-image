## [LRN-20261125-005] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: svg-image-render-readiness

### Summary
WebKit outer Image 的 onload→decode 完成不足以证明 SVG Image 内 CSS 背景已能首绘；该缺口与已观察的字体首布局缓存不同。

### Details
真实滚动条资源失败的冻结SVG含正确内嵌2×2黄SVG背景和orange fallback。默认首Canvas输出有340个orange像素（340通道/max90），原生SVG img/inline SVG截图却与源完全相同。把内图换成逐RGBA相同的PNG或percent编码SVG，首绘仍差340；直接HTML Image预decode内图后等20ms也无效。预decode一个真正使用相同URI作CSS背景的最小SVG再等20ms，则目标首绘为零差，等待同样时间但不加载资源的对照仍差340。

outer.decode 再等待一次、首绘后再次decode、首绘后createImageBitmap、十个microtask都不能修正这次340差异。onload→decode后、首次任何draw之前让出一次setTimeout(0) task，本次thumb对照为零；完全相同的操作在font对照仍差264（software Canvas246）。auto/sync/async decoding hint也均不改变这两个首帧失败。因此不能把一种资源的任务准备效果推广为通用稳定化，更不能接入默认RAF或固定延时。

### Suggested Action
保持原首帧门禁，区分outer解码、嵌套CSS资源可绘制、字体首次布局、Canvas后端和实际原生显示。用相同等待量的正负对照避免把timer效果误归因到缓存类型。后续若需要运行时方案，必须证明明确的资源就绪机制和后台页面行为，保留原有stabilizationAttempts、断言与像素标准。

### Metadata
- Source: actual strict failure and fresh-context frozen-SVG/native-PNG controls
- Pattern-Key: webkit.svg-image-css-background-post-decode-readiness
- Related Files: test/browser/fixtures/scrollbar-style-resources.mjs, output/playwright/webkit-followup-20261125/nested-thumb-render/assessment.json

### Context Maintenance
- Scope: Playwright1.64.1 WebKit2370/27.2 macOS, DPR1
- Authority: original frozen SVG, separate first/later PNGs, exact native source/display comparisons and same-pixel asset control
- Revalidation: Recheck when browser, image-decoding path or resource representation changes
- Validation: diagnostic boundary confirmed; no general runtime fix
- Last-Validated: 2026-11-25
- Evidence: output/playwright/webkit-followup-20261125/nested-thumb-render/assessment.json

### Integration checkpoint

后续同SVG因果拆解发现本例与overflow:auto横向滚动条的首次存在状态有关：仅将clone实际占位且已溢出的auto轴冻结为scroll即可消除差异，未溢出/只有stable预留/overlay均不强制。实际资源fixture现通过；不把该修复推广成所有SVG嵌套资源ready机制。 见 docs/evidence/scrollbar-stylesheet-resources.json；后续完整门禁的严格失败另列，未称整体修复。
