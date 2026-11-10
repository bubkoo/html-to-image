## [LRN-20261111-007] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: cross-document-fonts

### Summary
iframe 内容被扁平克隆后，字体的发现和家族名仍须保留来源文档；只修跨 realm 元素判断并不足够。

### Details
核对 #568：V2 已用 Element 遍历，直接捕获 frame 内节点可嵌入字体；捕获 iframe 本身或祖先时却只读取外层文档样式表，三个引擎均漏字体。直接合并所有 frame 字体还会使同一家族名互相覆盖。最终定向 39 项在旧源码上 24 项失败，修复后 39 项通过。克隆阶段暂存副本到来源的弱映射，字体阶段按文档收集、解析 baseURI、在副本中给附加文档字体独立名字并同步 inline/伪元素规则，之后清理来源映射。只有弱文档 ID 跨捕获保留，不缓存字体响应、源元素或调用选项。

Firefox 不允许修改 CSSFontFaceRule 的描述符；应读取并构造新规则，不能靠 setProperty 改 family。普通/变换新增的原始 face 规则在副本中由嵌入规则替代，local-only 来源仍保留。复用的字体 CSS 依赖同一子树及 live frame 文档；导航/替换后要重收集。显式普通家族名的 fontEmbedCSS 保留全局覆盖语义。

### Suggested Action
跨 iframe 的回归至少分为直接内容、frame 元素和祖先；用同名不同字形的原创小字体验证冲突，不能只检查 SVG 包含一段字体数据。另查相对 URL、adopted/普通样式表、源不变、过滤和 CSS 复用。

### Metadata
- Source: investigation
- Related Files: ../src/embed-webfonts.ts, ../src/clone-node.ts, ../src/task.ts, ../test/browser-unit/iframe-fonts.test.ts, ../test/browser/fixtures/iframe-fonts.mjs
- Pattern-Key: capture.document-local-font-identity

### Context Maintenance
- Scope: 可访问的同源 iframe、CSS 定义字体及当前 Chromium/Firefox/WebKit；纯 JS FontFace 和不同 ShadowRoot 内的同名字体隔离未验证
- Authority: 旧源码定向 24/39 失败，修复后 39/39；本地覆盖率 203、源码 252、构建包 111 全通过
- Revalidation: 修改 iframe 扁平克隆、字体来源/别名、CSS 复用或浏览器版本时
- Validation: verified locally and on real iPhone; remote pending
- Last-Validated: 2026-11-11
- Evidence: ../docs/v2-regressions.md


### Resolution
源码 `036f1db` 重建后真实 iPhone Safari 完整页 21/21 通过，报告归档为 `docs/evidence/ios-safari-iframe-fonts-036f1db.json`，提交 SHA 与源码一致。两份原创字体同时维护独立的 Macintosh/Windows 名称表，避免验证字形差异时混入平台内部字体名冲突；原始字体 SHA256 保持不变。远端 CI/CodeQL/Codecov 合并前另行核验。


### Follow-up: explicit CSS declarations
初版通过字符串 includes 识别已生成的字体名，会把注释中的旧 CSS 当成有效 face；新增真实像素回归在三个引擎各失败 1 项。改为 CSSOM 遍历实际 font-face 声明（含分组规则）后通过，保留普通家族名显式覆盖语义。八种共享场景的字体定向检查为 42/42；最终源代码验收另行记录。


### Final candidate validation
最终源码 `f4ab94e` 完整本地 204/255/111 与真实 iPhone Safari 21/21 通过，报告为 `docs/evidence/ios-safari-document-ownership-f4ab94e.json`；相对资源的文档 base URI、实际请求次数与八种字体场景均通过。受测源码 SHA 与报告一致，远端检查在合并前核验。
