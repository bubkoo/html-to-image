## [LRN-20261125-006] knowledge_gap

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: stylesheet-resource-decoding

### Summary
原生可读CSSOM不暴露外部CSS实际编码；导入边的编码继承必须单独保存，HTTP charset也不能只依赖response.blob().type。

### Details
真实HTTP中，UTF8文档的同源父CSS由HTTP或@charset声明Windows1252；跨源子CSS不声明charset并使用E9字节的café选择器。Chromium/WebKit原生都按父编码应用该子样式。当前DTO却把父/子encoding都初始化成document.characterSet=UTF8，native child href已absolute又使needsFinalBase跳过父元数据下载；同份collector/decoder把子选择器解成caf�，两引擎各差820通道，源410个yellow滑块像素变0。父UTF8负例和子明确@charset1252正例保留。

另一个独立HTTP控制表明：Chromium/Firefox的response.blob().type保留HTTP charset，WebKit27.2只给text/css，虽然response.headers.get('Content-Type')仍是text/css;charset=windows-1252。按Blob.type解码丢失café，按原header解码正确。使用真实ResourceLoader类执行同样collector路径再次复现，排除了测试fetch适配层的行为差异。

### Suggested Action
在不替换live CSSOM声明的前提下取得外部父CSS有效encoding，并沿import边传递给无自身编码的子资源；HTTP/@charset/BOM优先级继续由解码器处理。网络ResourceLoader应保留真实Content-Type参数，注意复用重复Content-Type处理而不是只保留媒体类型。custom resolver仍按它返回的Blob.type契约处理。完整capture API回归、三引擎与构建包验收仍待主线补齐，不把隔离collector对照称完整产品修复。

### Metadata
- Source: real HTTP browser/native PNG controls and isolated execution of unchanged source bodies
- Pattern-Key: css.import-parent-encoding-and-http-content-type
- Related Files: src/clone-scrollbars.ts, src/resource-loader.ts, src/svg-style-imports.ts

### Context Maintenance
- Scope: collector SHA002d24434fb4787b10aa86d6e00aa34dee5219620a15c43810521f602aebb31c; Playwright1.64.1 Chromium156, Firefox157 header control, WebKit27.2
- Authority: explicit no-CORS source import/CORS library fetch, native computed style/PNG and saved DTO/decoder results
- Revalidation: Recheck integrated metadata handling and complete capture path after fixes
- Validation: isolated collector failures confirmed; product integration/fix pending
- Last-Validated: 2026-11-25
- Evidence: output/playwright/stylesheet-encoding-20261125/assessment.json

### Integration checkpoint

导入链encoding和HTTP Content-Type charset保留现已接入；8个encoding模式在两种支持引擎的完整capture及ESM/UMD资源组通过。Firefox legacy滚动条不支持，不能称三引擎滚动条像素保真；独立响应头控制包含Firefox。 见 docs/evidence/scrollbar-stylesheet-resources.json；后续完整门禁的严格失败另列，未称整体修复。
