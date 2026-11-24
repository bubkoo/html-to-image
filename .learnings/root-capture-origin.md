## [LRN-20261125-018] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: capture-coordinate-origin

### Summary
捕获根的边框原点与外部 margin 是不同坐标；简单清零 margin 也不能覆盖首子元素折叠。修复所需测量必须同时保持 XML 布局语义和资源隔离。

### Details
固定真实UMD在三引擎39个160×80红蓝输入中33个偏移、6个对照正确；独立源截图全部12800像素验证有效且源不变。根margin-top16使导出错5120通道，显式输出宽高不修复。只清零根margin修复27例，6个首子margin折叠例仍错15360通道。

在真实SVG XML里测边框原点并反向放置foreignObject，39例皆与源相同，说明坐标根因；这不是生产修复。已有私有srcdoc自身导航SVG Blob，在已确认CSP就绪后Chromium/Firefox仍产生真实HTTP；nonce受信producer加script-none后同样失败。保留HTMLDocument再换SVG根虽阻断HTTP，却保留HTML类型选择器语义：大写DIV在三引擎产生x43，真实XML SVGImage为x7。不能把一项安全阳性或几何阳性当通用环境。

### Suggested Action
先证明安全且语义等价的XML测量文档，再处理foreignObject单位转换、最终onClone/options.style以及paint-only变换。不得将padding、根定位、transform、flow-root或margin0当泛化修复；新的nested-owner路径目前仅是假设。

### Metadata
- Source: real native borderbox screenshots, exact UMD and isolated XML/CSP counterexamples
- Pattern-Key: capture.root-border-origin-and-safe-xml-layout
- Related Files: src/util.ts; src/capture.ts; src/apply-style.ts

### Context Maintenance
- Scope: pinned e014fef runtime; desktop Chromium156/Firefox157/WebKit27.2
- Authority: 39 independently verified source pictures and actual HTTP request canaries
- Revalidation: root placement, measurement realm, CSP owner or XML semantics changes
- Validation: reproduced defect; safe generic runtime repair not integrated
- Last-Validated: 2026-11-25
- Evidence: docs/evidence/root-capture-origin-boundaries.json

### 2026-11-25 nested-owner follow-up

保持受限HTML owner、在其内部创建真实XML child，Chromium/Firefox的窄控制通过；WebKit中由源预制Blob HTML的后代发出四类真实HTTP，否决通用路径。直接SVG层被拦与script0不足以证明后代资源受限。既定5s guard和两URL revoke后仍能fetch的清理负控都保留，未继续WebKit语义/取消或生产集成。初始自有harness异常已单独封存，derived输入重建明确不冒充原始浏览器snapshot。见docs/evidence/root-origin-nested-owner.json。
