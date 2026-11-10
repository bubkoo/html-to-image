# 开放 PR 处理台账

更新于 2026-11-11。按创建 [PR #603](https://github.com/bubkoo/html-to-image/pull/603) 前的 52 个开放 PR 编号逐一登记。`master` 已包含 V2，尚未发布 V2 到 npm。已向下节 22 个 PR 回复具体证据并关闭；无关的 #517 也已说明后关闭。其余“关闭”仍为建议动作，不能当作已完成。旧分支的补丁不能因 CI 变绿就直接合并到 V2。

## 2026-11-11 长期目标基线

后续进展：尺寸修复已随 [#618](https://github.com/bubkoo/html-to-image/pull/618) 合入 `master`（`319da08`），CI、CodeQL 和 Codecov patch/project 全部通过。图片异步错误回调修复已随 [#619](https://github.com/bubkoo/html-to-image/pull/619) 合入 `master`（`de9136c`），PR 与主分支 CI、CodeQL、PR Codecov patch/project 通过；组合真机验收为 15/15，报告对应源码 `841908f`，见 [发布验收记录](v2-release-readiness.md)。旧 #409/#504 的完整应用场景仍保留各自边界，npm 不发布。

GitHub 实时查询剩余 28 个开放旧 PR：#577、#504、#585、#430、#581、#473、#482、#575、#393、#499、#427、#401、#451、#511、#568、#540、#560、#498、#533、#376、#408、#409、#574、#443、#442、#400、#407、#398。后续新增 PR 单独登记，不混入这份基线。

本轮新增的仓库自动化缺陷已由 #620 合入 `master`：标题规则补齐 `assignees: []`，支持重新打开 PR 后重验。#619 在相同关键词标题下重新运行标签任务成功；该问题与图片运行时代码分开修复。

逐项核对原始需求、V2 行为和回归证据，给出已等价解决、可复现缺陷修复、设计取舍或具体外部阻塞的结论。修复须先失败后通过，并完成三引擎、实际构建包和远端检查；涉及 iOS 行为时验证真机。保留未发布 npm 的边界；部分覆盖不作完整解决。

- **#409：尺寸契约已核对，独立边界修复随 #618 合入。** 原补丁在已设置像素尺寸后又把画布属性改回 CSS 尺寸，会覆盖 `pixelRatio`；不直接移植。V2 已分开设置 CSS 尺寸与像素缓冲区。核对中发现 `width`/`height` 的 `||` 回退吞掉显式 `0` 和 `NaN`，本分支改为仅对未指定尺寸使用源尺寸，副本样式也保留零值。三引擎修复前各 4 项尺寸回归失败、修复后通过，另有 1×/2× 源码和 2× UMD 像素验证。原关联项目缺精确设备信息，不把这一独立边界修复等同于复现其全部故障。
- **#408：部分覆盖，保留。** 当前已覆盖纵横滚动、已有变换、嵌套滚动及限定的 fixed/sticky 组合；混合直接文本、行内和复杂定位仍有限制。关联 #345 同时要求自定义滚动条外观，当前裁剪/隐藏滚动条不等于保留外观，不能宣称 #345 全部解决。
- **#427/#499/#393、#575/#577/#581：已有实现已随 #603 合入主分支。** 下文“待本分支 CI”是历史状态；这些旧 PR 仍开放，后续按各自完整 fixture 和剩余边界决定处置。

候选 `8103b7b` 本地完整检查：覆盖率回归 172/172、三引擎源码 159/159、实际压缩包 ESM/CJS/UMD/类型通过。新增冒烟项后构建包 69/69，真实 iPhone Safari 14/14，通过报告见 [发布验收记录](v2-release-readiness.md)。首轮定向运行还出现一次 WebKit 1× 像素透明，后续定向和完整运行未复现；尺寸回退修复不能作为该时序现象已解决的证据。

## 2026-11-11 资源策略复核

- **#430 / #429：V2 已按单次捕获缓存进行中的 Promise。** 同 URL 的两张图片和 CSS 背景只发一次库请求，同一冻结快照输出 PNG/像素不重新获取。复核同时发现 WebKit 在活动文档中改写脱离页面的副本会额外发送 3 次原生图片请求；本候选改用无窗口的私有文档，回归要求额外请求为 0。CSS 相对 URL 的锚点解析在 WebKit 产生不同缓存键，改用 URL 解析后同一资源只加载一次。SVG href.baseVal 在 WebKit 只更新旧 xlink 属性、留下有效的相对 href，现显式写入副本属性；现代和旧属性都验证冻结 SVG 与默认单次绘制像素。
- **#560：不恢复全局缓存及手动清空接口。** 每次捕获独立；服务端红→蓝→绿的变化分别被同一 renderer 的新捕获及旧 facade 的新调用读取。`capture.dispose()` / `renderer.dispose()` 后拒绝复用。证据针对库持有引用与生命周期，不等于浏览器 HTTP 缓存已清空、强制 GC 或原 SPA 内存压力已复测。
- **#400：已有 `fetchRequestInit: { cache: 'no-cache' }`，无需新增 `cacheDisable`。** 可缓存 HTTP fixture 改变内容后，三个引擎均须发出带重新验证指令的新请求并得到蓝色像素；默认请求是否缓存由浏览器决定，不强制假定会命中缓存。冻结的调用选项保持不变。
- **#443 / #503：已有 `resources.resolve` 可按 URL 返回 Blob，`undefined` 使用正常 fetch。** 实际双源 fixture 验证带 cookie 的私有图片与省略凭据的公开图片/字体同时正确，负面对照全局 include 因 wildcard CORS 失败。不新增旧补丁的第二套 RequestInit 生成器；resolver 自行负责请求选项、状态检查和 signal。
- **#442 / #361：受控的混合凭据需求可由上述 resolver 满足；保留原 iOS 故障边界。** include 不是所有 iOS 资源的统一要求，cacheBust 也不是凭据方案。原应用的资源 URL、CORS 响应和可运行 fixture 缺失，不能按该 Issue 的全部空白问题已解决关闭。

本候选本地完整检查通过：覆盖率回归 190/190、三引擎源码 213/213、构建包 105/105，以及 lint、构建、测试类型和隔离 tarball 的 ESM/CJS/UMD/双版本 TypeScript 消费检查。真机与远端检查另行归档。

本候选也修正同源 iframe 适配器过宽的 catch：仅访问不可读文档时回退，用户克隆回调抛错必须原样拒绝。修复前三个引擎均吞掉该错误，修复后回归核对同一 Error 对象。副本 `ownerDocument.defaultView` 现在为 null，迁移约定和创建新节点的方法已写入 README。

## 已有对应实现：已回复并关闭的 22 个旧 PR

| PR | 对应结果与回复边界 |
| --- | --- |
| [#602](https://github.com/bubkoo/html-to-image/pull/602) | Issue #601 的重复 `Content-Type` 已在 V2 共用 Blob 转换入口独立修复，并有真实 HTTP 响应头、图片和背景图的三引擎测试；原 Android MAUI WebView 未复测。 |
| [#599](https://github.com/bubkoo/html-to-image/pull/599) | XML 非法控制字符的输出清理已有回归；原 Edge 环境未复测。 |
| [#598](https://github.com/bubkoo/html-to-image/pull/598), [#597](https://github.com/bubkoo/html-to-image/pull/597), [#595](https://github.com/bubkoo/html-to-image/pull/595) | V2 已独立实现逐节点样式选择、逐节点克隆回调和单次捕获的样式隔离；均有行为和构建包验证。 |
| [#596](https://github.com/bubkoo/html-to-image/pull/596), [#580](https://github.com/bubkoo/html-to-image/pull/580) | 本地片段保留及同文档绝对 `clip-path` URL 已分别覆盖；不同文档 URL 的行为也有断言。 |
| [#592](https://github.com/bubkoo/html-to-image/pull/592), [#589](https://github.com/bubkoo/html-to-image/pull/589) | data URL 解码等待和解码拒绝后不悬挂已有回归；原完整 fixture 与 iPhone 内存压力场景未复测。 |
| [#590](https://github.com/bubkoo/html-to-image/pull/590), [#550](https://github.com/bubkoo/html-to-image/pull/550) | `toBlob` 已传递 MIME 和质量，包含 `quality: 0` 的测试。 |
| [#583](https://github.com/bubkoo/html-to-image/pull/583), [#521](https://github.com/bubkoo/html-to-image/pull/521) | SVG 后代递归克隆与 `filter` 已有回归；ReactFlow 原项目未复测。 |
| [#576](https://github.com/bubkoo/html-to-image/pull/576), [#551](https://github.com/bubkoo/html-to-image/pull/551) | 同源 iframe 的 body 仅克隆一次已有回归；跨域 iframe 不在范围内。 |
| [#563](https://github.com/bubkoo/html-to-image/pull/563), [#380](https://github.com/bubkoo/html-to-image/pull/380) | 构建后的 ESM 导入及 npm 压缩包消费测试已覆盖路径扩展名问题；正式 npm 发布尚待验证。 |
| [#526](https://github.com/bubkoo/html-to-image/pull/526), [#397](https://github.com/bubkoo/html-to-image/pull/397) | README 的像素数据示例和公开 `Options` 类型已在 V2；核对贡献者原文后回复。 |
| [#514](https://github.com/bubkoo/html-to-image/pull/514), [#507](https://github.com/bubkoo/html-to-image/pull/507) | 字体规则遍历支持分组规则，`font-family` 通过 CSS 属性读取；三引擎 SVG 字体属性测试补充了使用路径。 |
| [#518](https://github.com/bubkoo/html-to-image/pull/518) | 当前构建与类型检查通过。关闭前还需逐项比对该 PR 的具体类型修改，避免把“能编译”误当成完全等价。 |

上述已有 V2 修复与测试的详细对应关系见 [v2-issue-pr-tracker.md](v2-issue-pr-tracker.md)。回复用“在 `master` 中独立解决”，不要写成“合并了你的 PR”。

## 本轮补齐：待本分支 CI 通过后回复

| PR | 处理 |
| --- | --- |
| [#427](https://github.com/bubkoo/html-to-image/pull/427), [#499](https://github.com/bubkoo/html-to-image/pull/499), [#393](https://github.com/bubkoo/html-to-image/pull/393) | V2 原来只读取 `xlink:href` 并把整个引用当 CSS 选择器，无法处理现代 `href`、特殊字符 ID 和外部 SVG。`codex/open-pr-triage` 现从原文档复制本地符号，外部符号经统一资源加载器导入，再将**副本**引用改为本地 ID；加入源码和构建 ESM 的像素回归。外部符号依赖外部样式、字体或其他定义的复杂 sprite 尚未验证。 |
| [#575](https://github.com/bubkoo/html-to-image/pull/575), [#577](https://github.com/bubkoo/html-to-image/pull/577), [#581](https://github.com/bubkoo/html-to-image/pull/581) | V2 当前实现已通过新增 Chromium、Firefox、WebKit 回归：SVG 后代的 CSS 变量、重复渐变的多个周期、SVG `font-family` 属性选中的字体文件。无需移植旧补丁；原 PR 的完整 fixture 尚未运行。 |

## 部分覆盖：保留讨论，不按完整修复关闭

2026-11-11 字体路径复核（#511 / #415）：

- 原字号缩小来自历史 #270 对 #132 末词换行的绕过。当前三引擎都把 `20.75px` 改成 `19.9px`，可见的第二行消失，13.75px 文字也出现像素位移；每个引擎修复前各 5 项失败。已随 [#621](https://github.com/bubkoo/html-to-image/pull/621) 合入 `master`（`9a0be4f`），移除全局取整/缩小，默认保留源计算字号；V2 不增加 `skipFontSizeShrink` 开关。
- 受控字体的 auto/normal/none 字距、8.75/13.75/20.75px、1×/2× 输出及 #132 的原始 flex 结构均有回归。当前三引擎移除字号改写后通过，不改写源 `font-kerning`。原帖没有完整段落 fixture 或可靠环境信息，不能宣称全部字体、旧浏览器和应用组合已复测。

2026-11-11 图片路径复核：

- **#504：发现新的异步错误处理回归。** V2 已等待图片解码并保留 `decode` 方法，但调用 `onImageErrorHandler` 后未等待其返回值，导致异步恢复前冻结快照、回调拒绝被忽略。修复已随 #619 合入并等待回调 Promise；三引擎修复前各 2 项失败、修复后恢复后的绿色像素和原始异常传播通过，源图片不变。原 PR 的整体重构与完整应用 fixture 未移植。
- **#482：不采用无条件吞掉错误的方案。** V2 有资源诊断、占位图和图片错误回调；资源解析器异常、用户回调异常与未处理图片错误仍须拒绝捕获，避免把缺失内容当成成功快照。异步图片回调的遗漏按上项独立修复。
- **#401：当前解码等待路径已有覆盖。** `renderer.test.ts` 验证延迟 `decode()` 不被提前完成、不替换原方法，以及可用图像的 decode 拒绝不悬挂；构建包和真实设备另有 canvas/大图像素。尚未以原项目 fixture 证明全部问题解决。
- **#533 / #502：V2 不再等待动画帧。** `renderer.test.ts` 令 `requestAnimationFrame` 抛错后仍能导出；不新增旧 PR 的等待开关。此断言只证明内部路径不依赖动画帧，不保证浏览器后台标签页不会被系统挂起。

| PR | 剩余问题 |
| --- | --- |
| [#591](https://github.com/bubkoo/html-to-image/pull/591) | V2 有可选的多次栅格化，并在真实 iPhone 16 Pro Safari 验证过首帧透明、重绘成功；它不是 PR 的“两次相同才停止”算法。原帖的全部图像组合及其他 iOS 场景尚未证明。 |
| [#568](https://github.com/bubkoo/html-to-image/pull/568) | V2 使用 `Element` 遍历字体使用者，避免旧实现的跨 realm `instanceof HTMLElement` 判断。[PR #616](https://github.com/bubkoo/html-to-image/pull/616) 补充真实 `srcdoc` iframe 内后代使用 `@font-face` 的回归，Chromium、Firefox、WebKit 均能把字体资源嵌入 SVG。原 PR 未提供可运行 fixture；真实 iOS 尚未验证，回复时仅声明已覆盖此路径。 |
| [#451](https://github.com/bubkoo/html-to-image/pull/451) | [PR #617](https://github.com/bubkoo/html-to-image/pull/617) 复现了视频原始比例 960×540、显示区域 240×160 且 `object-fit: contain` 时的拉伸：修复前顶部留白变成视频画面。按视频原始宽高截取帧后，三引擎源码与构建 UMD 均导出正确的顶部留白与中心画面。原 PR 的截图页面、其他 `object-fit` 组合及高分辨率视频的资源成本尚未复测。 |

## 待复现和设计：拆成小问题处理，每个修复补回归

| 优先级 | PR | 下一步 |
| --- | --- | --- |
| 高 | [#409](https://github.com/bubkoo/html-to-image/pull/409), [#408](https://github.com/bubkoo/html-to-image/pull/408) | #409 的 CSS/像素尺寸分离已验证，零值/NaN 修复已随 #618 合入，见上方基线；#408 为部分滚动覆盖，自定义滚动条外观及复杂布局仍需独立复现。 |
| 高 | [#498](https://github.com/bubkoo/html-to-image/pull/498), [#442](https://github.com/bubkoo/html-to-image/pull/442), [#585](https://github.com/bubkoo/html-to-image/pull/585) | 用原 fixture 分离 iOS 资源获取和首次空白等根因；#585 是大范围替代实现，不整体移植。真实 iOS 回归需重新测目标场景。 |
| 中 | [#401](https://github.com/bubkoo/html-to-image/pull/401), [#482](https://github.com/bubkoo/html-to-image/pull/482), [#504](https://github.com/bubkoo/html-to-image/pull/504), [#533](https://github.com/bubkoo/html-to-image/pull/533) | 对照 V2 的图片加载、解码和资源错误路径；先构造能失败的用例，避免重复修复或吞掉用户回调错误。 |
| 中 | [#560](https://github.com/bubkoo/html-to-image/pull/560), [#430](https://github.com/bubkoo/html-to-image/pull/430), [#400](https://github.com/bubkoo/html-to-image/pull/400), [#443](https://github.com/bubkoo/html-to-image/pull/443) | 已有逐项结论与真实 HTTP fixture，见资源策略复核；待本候选完整验收和远端检查。 |
| 中 | [#511](https://github.com/bubkoo/html-to-image/pull/511), [#376](https://github.com/bubkoo/html-to-image/pull/376), [#407](https://github.com/bubkoo/html-to-image/pull/407), [#473](https://github.com/bubkoo/html-to-image/pull/473) | #511 的字号缩小修复已随 #621 合入 master，真机 16/16，见字体复核；其余继续评估伪元素注入、附加 CSS 和大页面分片的实际输出语义及资源成本。 |
| 低 | [#398](https://github.com/bubkoo/html-to-image/pull/398) | 核对示例中的实际 API、复数/单数和浏览器打开方式后更新文档。 |

## 维护与无关内容

| PR | 处理 |
| --- | --- |
| [#574](https://github.com/bubkoo/html-to-image/pull/574), [#540](https://github.com/bubkoo/html-to-image/pull/540) | 旧锁文件上的 Dependabot 单包更新；在当前主分支核对依赖树及安全公告，再重建补丁与锁文件，不直接合并旧分支。 |
| [#517](https://github.com/bubkoo/html-to-image/pull/517) | Reservation 页面与 DOM 转图片库无关；已说明范围后关闭。 |

合计：22 个已有对应实现、6 个本轮补齐、3 个部分覆盖、18 个待复现或设计、2 个依赖维护、1 个无关内容，共 52 个。
