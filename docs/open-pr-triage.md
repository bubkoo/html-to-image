# 开放 PR 处理台账

更新于 2026-11-10。按创建 [PR #603](https://github.com/bubkoo/html-to-image/pull/603) 前的 52 个开放 PR 编号逐一登记。`master` 已包含 V2，但 npm `latest` 仍是 1.11.13。已向下节 22 个 PR 回复具体证据并关闭；无关的 #517 也已说明后关闭。其余“关闭”仍为建议动作，不能当作已完成。旧分支的补丁不能因 CI 变绿就直接合并到 V2。

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

| PR | 剩余问题 |
| --- | --- |
| [#591](https://github.com/bubkoo/html-to-image/pull/591) | V2 有可选的多次栅格化，并在真实 iPhone 16 Pro Safari 验证过首帧透明、重绘成功；它不是 PR 的“两次相同才停止”算法。原帖的全部图像组合及其他 iOS 场景尚未证明。 |
| [#568](https://github.com/bubkoo/html-to-image/pull/568) | V2 使用 `Element` 遍历字体使用者，避免旧实现的跨 realm `instanceof HTMLElement` 判断。[PR #616](https://github.com/bubkoo/html-to-image/pull/616) 补充真实 `srcdoc` iframe 内后代使用 `@font-face` 的回归，Chromium、Firefox、WebKit 均能把字体资源嵌入 SVG。原 PR 未提供可运行 fixture；真实 iOS 尚未验证，回复时仅声明已覆盖此路径。 |
| [#451](https://github.com/bubkoo/html-to-image/pull/451) | [PR #617](https://github.com/bubkoo/html-to-image/pull/617) 复现了视频原始比例 960×540、显示区域 240×160 且 `object-fit: contain` 时的拉伸：修复前顶部留白变成视频画面。按视频原始宽高截取帧后，三引擎源码与构建 UMD 均导出正确的顶部留白与中心画面。原 PR 的截图页面、其他 `object-fit` 组合及高分辨率视频的资源成本尚未复测。 |

## 待复现和设计：拆成小问题处理，每个修复补回归

| 优先级 | PR | 下一步 |
| --- | --- | --- |
| 高 | [#409](https://github.com/bubkoo/html-to-image/pull/409), [#408](https://github.com/bubkoo/html-to-image/pull/408) | 分别复现画布输出尺寸与滚动条位置；检查当前 V2 的可见尺寸与像素尺寸语义，再定修复。#408 的一般滚动已有部分覆盖，原场景仍需核对。 |
| 高 | [#498](https://github.com/bubkoo/html-to-image/pull/498), [#442](https://github.com/bubkoo/html-to-image/pull/442), [#585](https://github.com/bubkoo/html-to-image/pull/585) | 用原 fixture 分离 iOS 资源获取和首次空白等根因；#585 是大范围替代实现，不整体移植。真实 iOS 回归需重新测目标场景。 |
| 中 | [#401](https://github.com/bubkoo/html-to-image/pull/401), [#482](https://github.com/bubkoo/html-to-image/pull/482), [#504](https://github.com/bubkoo/html-to-image/pull/504), [#533](https://github.com/bubkoo/html-to-image/pull/533) | 对照 V2 的图片加载、解码和资源错误路径；先构造能失败的用例，避免重复修复或吞掉用户回调错误。 |
| 中 | [#560](https://github.com/bubkoo/html-to-image/pull/560), [#430](https://github.com/bubkoo/html-to-image/pull/430), [#400](https://github.com/bubkoo/html-to-image/pull/400), [#443](https://github.com/bubkoo/html-to-image/pull/443) | 单次捕获已有独立资源缓存；需确认仍需手动清缓存、跨调用请求复用、`no-cache` 或按 URL 的请求参数，再决定 API，避免重引入全局状态。 |
| 中 | [#511](https://github.com/bubkoo/html-to-image/pull/511), [#376](https://github.com/bubkoo/html-to-image/pull/376), [#407](https://github.com/bubkoo/html-to-image/pull/407), [#473](https://github.com/bubkoo/html-to-image/pull/473) | 分别评估字体缩小开关、伪元素注入、附加 CSS 和大页面分片的用户场景；先定义输出语义及资源/内存成本，再决定是否扩展公共 API。 |
| 低 | [#398](https://github.com/bubkoo/html-to-image/pull/398) | 核对示例中的实际 API、复数/单数和浏览器打开方式后更新文档。 |

## 维护与无关内容

| PR | 处理 |
| --- | --- |
| [#574](https://github.com/bubkoo/html-to-image/pull/574), [#540](https://github.com/bubkoo/html-to-image/pull/540) | 旧锁文件上的 Dependabot 单包更新；在当前主分支核对依赖树及安全公告，再重建补丁与锁文件，不直接合并旧分支。 |
| [#517](https://github.com/bubkoo/html-to-image/pull/517) | Reservation 页面与 DOM 转图片库无关；已说明范围后关闭。 |

合计：22 个已有对应实现、6 个本轮补齐、3 个部分覆盖、18 个待复现或设计、2 个依赖维护、1 个无关内容，共 52 个。
