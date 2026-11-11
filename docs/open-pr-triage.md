# 开放 PR 处理台账

更新于 2026-11-11。按创建 [PR #603](https://github.com/bubkoo/html-to-image/pull/603) 前的 52 个开放 PR 编号逐一登记。`master` 已包含 V2，尚未发布 V2 到 npm。已向下节 22 个 PR 回复具体证据并关闭；无关的 #517 也已说明后关闭。其余“关闭”仍为建议动作，不能当作已完成。旧分支的补丁不能因 CI 变绿就直接合并到 V2。

## 2026-11-11 fixed 滚动源页面对照（#408 / #345 / #594）

独立原生截图发现早期 transformed-fixed + sticky 测试的期望有误：滚动 50px 后 fixed 已在 -50px，源顶部为绿色，旧导出和测试却期待蓝色。三个引擎均复现，不能继续把旧测试通过当页面保真证据。[独立原生 PNG、计数与范围](evidence/fixed-scroll.json)和[重放](evidence/fixed-scroll-replay.md)已归档。

候选使用源浏览器 offsetParent 区分当前容器、其他祖先或视口。纵向块流内有 fixed 后代时复用伪元素流偏移，避免把普通包装层变成新的 fixed 包含块；只给随当前容器滚动的 fixed 调整 inset，保留已有变换。直接横向/斜向 fixed 同样按实际关系处理。27 个输入覆盖 CSS 建立包含块的多种方式、sticky 两种顺序、普通/混合/深层/嵌套 fixed、已有变换、bottom/auto/right/RTL 和源 important。最终输入在基线 57 失败、24 通过，原生源对照全通过；候选 81 通过。完整 lint/构建/类型/tarball、261 覆盖率、425 源码（另 1 项既有 GC 跳过）及 126 构建包检查通过；源码 `c3b2d09` 真实 iPhone Safari 完整 26/26 通过，新增 27 输入分别经 ESM/UMD 验证。[真机报告](evidence/ios-safari-fixed-scroll-c3b2d09.json)和[独立原生源像素对照](evidence/ios-fixed-scroll-source-control.json)已归档，远端待验。

横向/斜向的深层 fixed 包装组合、已有 inline before 与绝对定位回退、任意捕获根偏移、其他未测布局及滚动条外观仍保留边界；不按整个 #408/#345 已解决处理。

## 2026-11-11 长期目标基线

后续进展：尺寸修复已随 [#618](https://github.com/bubkoo/html-to-image/pull/618) 合入 `master`（`319da08`），CI、CodeQL 和 Codecov patch/project 全部通过。图片异步错误回调修复已随 [#619](https://github.com/bubkoo/html-to-image/pull/619) 合入 `master`（`de9136c`），PR 与主分支 CI、CodeQL、PR Codecov patch/project 通过；组合真机验收为 15/15，报告对应源码 `841908f`，见 [发布验收记录](v2-release-readiness.md)。旧 #409/#504 的完整应用场景仍保留各自边界，npm 不发布。

GitHub 实时查询剩余 28 个开放旧 PR：#577、#504、#585、#430、#581、#473、#482、#575、#393、#499、#427、#401、#451、#511、#568、#540、#560、#498、#533、#376、#408、#409、#574、#443、#442、#400、#407、#398。后续新增 PR 单独登记，不混入这份基线。

[#624](https://github.com/bubkoo/html-to-image/pull/624) 已合入 master（`8bddd81`）：Blob 预览示例与旧依赖结论已归档；PR CI/CodeQL 和主分支 CI/CodeQL 均通过。#398 真机新标签交互仍按证据保留未完成状态。

本轮新增的仓库自动化缺陷已由 #620 合入 `master`：标题规则补齐 `assignees: []`，支持重新打开 PR 后重验。#619 在相同关键词标题下重新运行标签任务成功；该问题与图片运行时代码分开修复。

逐项核对原始需求、V2 行为和回归证据，给出已等价解决、可复现缺陷修复、设计取舍或具体外部阻塞的结论。修复须先失败后通过，并完成三引擎、实际构建包和远端检查；涉及 iOS 行为时验证真机。保留未发布 npm 的边界；部分覆盖不作完整解决。

- **#409：尺寸契约已核对，独立边界修复随 #618 合入。** 原补丁在已设置像素尺寸后又把画布属性改回 CSS 尺寸，会覆盖 `pixelRatio`；不直接移植。V2 已分开设置 CSS 尺寸与像素缓冲区。核对中发现 `width`/`height` 的 `||` 回退吞掉显式 `0` 和 `NaN`，本分支改为仅对未指定尺寸使用源尺寸，副本样式也保留零值。三引擎修复前各 4 项尺寸回归失败、修复后通过，另有 1×/2× 源码和 2× UMD 像素验证。原关联项目缺精确设备信息，不把这一独立边界修复等同于复现其全部故障。
- **#408：部分覆盖，保留。** 当前已覆盖纵横滚动、已有变换、嵌套滚动及限定的 fixed/sticky 组合；混合直接文本、行内和复杂定位仍有限制。关联 #345 同时要求自定义滚动条外观，当前裁剪/隐藏滚动条不等于保留外观，不能宣称 #345 全部解决。
- **#427/#499/#393、#575/#577/#581：已有实现已随 #603 合入主分支。** 下文“待本分支 CI”是历史状态；这些旧 PR 仍开放，后续按各自完整 fixture 和剩余边界决定处置。

候选 `8103b7b` 本地完整检查：覆盖率回归 172/172、三引擎源码 159/159、实际压缩包 ESM/CJS/UMD/类型通过。新增冒烟项后构建包 69/69，真实 iPhone Safari 14/14，通过报告见 [发布验收记录](v2-release-readiness.md)。首轮定向运行还出现一次 WebKit 1× 像素透明，后续定向和完整运行未复现；尺寸回退修复不能作为该时序现象已解决的证据。

## 2026-11-11 资源策略复核

- **#430 / #429：V2 已按单次捕获缓存进行中的 Promise。** 同 URL 的两张图片和 CSS 背景只发一次库请求，同一冻结快照输出 PNG/像素不重新获取。复核同时发现 WebKit 在活动文档中改写脱离页面的副本会额外发送 3 次原生图片请求；修复已随 [#622](https://github.com/bubkoo/html-to-image/pull/622) 合入 `master`（`c742a11`），改用无窗口的私有文档，回归要求额外请求为 0。CSS 相对 URL 的锚点解析在 WebKit 产生不同缓存键，改用 URL 解析后同一资源只加载一次。SVG href.baseVal 在 WebKit 只更新旧 xlink 属性、留下有效的相对 href，现显式写入副本属性；现代和旧属性都验证冻结 SVG 与默认单次绘制像素。
- **#560：不恢复全局缓存及手动清空接口。** 每次捕获独立；服务端红→蓝→绿的变化分别被同一 renderer 的新捕获及旧 facade 的新调用读取。`capture.dispose()` / `renderer.dispose()` 后拒绝复用。证据针对资源请求复用范围和释放后的 API 状态，不等于浏览器 HTTP 缓存已清空、强制 GC 或原 SPA 内存压力已复测。
- **#400：已有 `fetchRequestInit: { cache: 'no-cache' }`，无需新增 `cacheDisable`。** 可缓存 HTTP fixture 改变内容后，三个引擎均须发出带重新验证指令的新请求并得到蓝色像素；默认请求是否缓存由浏览器决定，不强制假定会命中缓存。冻结的调用选项保持不变。
- **#443 / #503：已有 `resources.resolve` 可按 URL 返回 Blob，`undefined` 使用正常 fetch。** 实际双源 fixture 验证带 cookie 的私有图片与省略凭据的公开图片/字体同时正确，负面对照全局 include 因 wildcard CORS 失败。不新增旧补丁的第二套 RequestInit 生成器；resolver 自行负责请求选项、状态检查和 signal。
- **#442 / #361：受控的混合凭据需求可由上述 resolver 满足；保留原 iOS 故障边界。** include 不是所有 iOS 资源的统一要求，cacheBust 也不是凭据方案。原应用的资源 URL、CORS 响应和可运行 fixture 缺失，不能按该 Issue 的全部空白问题已解决关闭。

本候选本地完整检查通过：覆盖率回归 190/190、三引擎源码 213/213、构建包 105/105，以及 lint、构建、测试类型和隔离 tarball 的 ESM/CJS/UMD/双版本 TypeScript 消费检查。源码 `5cbf99d` 真实 iPhone Safari 完整 20/20 通过，[原始报告](evidence/ios-safari-resource-policy-5cbf99d.json)已归档；#622 的 CI、CodeQL、Codecov patch/project 及主分支 CI/CodeQL 全部通过。

本候选也修正同源 iframe 适配器过宽的 catch：仅访问不可读文档时回退，用户克隆回调抛错必须原样拒绝。修复前三个引擎均吞掉该错误，修复后回归核对同一 Error 对象。副本 `ownerDocument.defaultView` 现在为 null，迁移约定和创建新节点的方法已写入 README。

## 2026-11-11 iframe 字体复核（#568）

已随 [#623](https://github.com/bubkoo/html-to-image/pull/623) 合入 `master`（`a360c43`）。最终源码 `f4ab94e` 真机 21/21、本地 204/255/111，PR CI、CodeQL、Codecov patch/project 和主分支 CI/CodeQL 均通过；下述初版与首轮失败记录是历史对照。

V2 的 Element 遍历及 #616 已解决直接捕获外部 realm 节点时跳过后代的问题，本候选继续保留原始 `srcdoc` 验证，并增加实际几何字体和像素。发现独立缺陷：捕获 iframe 本身或它的祖先时，克隆已包含 frame body，字体收集却只查外层文档；不同文档同名字体也会在扁平副本中互相覆盖。

候选按副本来源文档收集字体与相对地址，附加文档的字体只在副本中改为各自名字；源 DOM、普通和 adopted 样式表不变。支持嵌套 iframe、body 内字体规则、含逗号/撇号的家族名、重复捕获的字体 CSS、普通名称的显式覆盖、变换新增字体和 local-only 来源；过滤掉的 iframe 不下载它的同名字体。旧 #568 的字符串类型补丁不移植。

以 #623 前的主分支 `c742a11` 回放初版 39 项定向测试，三个引擎各 8 项失败（共 24 项）；修复后三引擎 39/39、本地覆盖率 203/203、源码 252/252、构建 ESM/UMD 111/111 通过。实际 tarball 的 ESM/CJS/UMD/双版本 TypeScript、lint、构建、浏览器测试类型也通过；源码 `036f1db` 真实 iPhone Safari 21/21 通过，[原始报告](evidence/ios-safari-iframe-fonts-036f1db.json)已归档；该初版的资源计数失败及最终修复见下节。复用含 iframe 的 fontEmbedCSS 要保留同一捕获子树及 frame 文档，导航或替换后重新收集。跨源不可读 iframe、纯 JavaScript FontFace 字节和同一文档内不同 ShadowRoot 的同名字体隔离不在此结论内。

### #623 远端复检补充

首轮 [CI](https://github.com/bubkoo/html-to-image/actions/runs/42904242209) 的字体回归通过，但 WebKit 资源用例记录了多余请求。本地追踪发现：同一 capture 的背景先使用绝对地址，新插入图片随后处于 `about:blank` 文档，保留相对地址，形成两个缓存键。现在捕获流程显式持有私有文档直到序列化，不给地址加猜测性回退，也不放宽请求计数。去掉该持有的 12 轮/三引擎对照为 2/36 失败；恢复后 36/36，通过期间 clone base URI 也必须保持不变。

同时补齐显式字体 CSS 的语义边界：注释里出现生成的字体名不能当作有效 face，三个引擎在初版各 1 项失败。现通过 CSSOM 读取实际声明后再选择文档别名，42/42 字体定向检查与上面的资源对照合计 78/78 通过；最终本地完整检查已通过：覆盖率 204/204、三引擎源码 255/255、构建包 111/111，以及 lint、构建、类型与 tarball 消费检查；最终源码 `f4ab94e` 真实 iPhone Safari 21/21 通过，[原始报告](evidence/ios-safari-document-ownership-f4ab94e.json)已归档；最终 PR 与主分支 CI/CodeQL、PR Codecov 两项检查均已通过。早期 `036f1db` 的真机 21/21 是该候选及其七种字体场景的记录，不能代替此补充的最终验收。

## 2026-11-11 文档与旧依赖补丁复核

| PR | 结论 | 可复核证据与边界 |
| --- | --- | --- |
| [#398](https://github.com/bubkoo/html-to-image/pull/398) | 原需求是通过 Blob 快速预览，实际 API 是单数 toBlob。README 新增生成预览链接、由用户点击打开新标签页、返回清理函数的例子；处理 null Blob、noopener 和显式 revoke，不新增 toBlobs API。 | 从 README 原样提取 helper，使用当前构建 ESM 在 Chrome/Firefox/WebKit 检查 PNG MIME、尺寸、红/蓝像素、opener 为空，以及关闭预览后清理链接、旧地址 fetch 拒绝。[浏览器记录](evidence/blob-preview-browser-checks.json)包含 helper hash。真实 iPhone 已生成并读取正确的 96×60 PNG；自动点击未产生 DOM 事件，新标签页交互及其后清理仍待一次手动点击，不计作真机全流程通过。 |
| [#540](https://github.com/bubkoo/html-to-image/pull/540) | 已由工具链迁移取代，无需移植旧锁文件。 | 原 PR 仅改 pnpm-lock，将 pbkdf2 3.1.2 升到 3.1.3。迁移提交 e32e74c 移除了相关旧依赖；当前 lock 不含 pbkdf2，完整安装树也没有此包。不能为合并旧 bump 而重新引入已移除的测试链。 |
| [#574](https://github.com/bubkoo/html-to-image/pull/574) | 当前 Rollup 4.67.4 已覆盖旧 bump 的目的，无需退回 3.x 锁文件。 | 原 PR 仅将锁文件中的 3.12.0 升到 3.30.0；官方 [DOM clobbering 公告](https://github.com/rollup/rollup/security/advisories/GHSA-gcx4-mw62-g8wm) 的 4.x 修复版为 4.22.4，[目录逃逸公告](https://github.com/rollup/rollup/security/advisories/GHSA-mw96-cpmx-2vgc) 为 4.59.0。当前安装树仅有 4.67.4；生成 UMD 的 IMG/SCRIPT currentScript 分支及隔离临时目录中的越界输出拒绝均实测通过。[依赖记录](evidence/maintenance-dependency-review.json)保存版本、lock hash、原 PR head 与行为结果；这不是整棵依赖树的安全审计。 |

## 2026-11-11 源文档持有复核（#560）

已随 [#625](https://github.com/bubkoo/html-to-image/pull/625) 合入 master（`6b6bf2a`）。PR 与主分支 CI/CodeQL、PR Codecov patch/project 均通过；合入源码与真机候选一致。

本轮另复现了与全局资源缓存不同的引用问题：保留已 dispose 的快照对象时，延迟绘制函数仍持有源 ownerDocument；Chromium 中移除 iframe 后请求 GC，文档仍可经 WeakRef 读取，丢弃快照才消失。候选改由库所在 document 创建 canvas，并将任务释放函数绑定在捕获调用环境之外，避免 Firefox 通过内联释放回调间接保留源节点。

最终定向回归在旧源码上 11 项全部失败，候选 11 项通过、1 项有界跳过：三引擎均验证独立源文档可回收、延迟绘制和已 dispose 快照，以及移除 iframe 后 canvas 的所属文档、像素和独立副本；Chromium/Firefox 另验证 iframe 文档可回收。WebKit 的无捕获 iframe 对照仍保留原生文档，因此不对它作该项 GC 承诺。本地完整检查 208/266/114、构建、类型及 tarball 均通过（源码另有 1 项上述有界跳过）；[定向证据](evidence/capture-source-lifetime.json)已归档。源码 `6c7de81` 真实 iPhone Safari 22/22 通过（ESM/UMD 输出，不声称真机 GC），[原始报告](evidence/ios-safari-capture-lifetime-6c7de81.json)已归档；远端检查已通过；不等于原 SPA 的完整内存压力场景已复测。

## 2026-11-11 自定义样式与伪元素复核（#376 / #407）

#407 的附加 CSS 可由已有 onClone 在副本中插入 style 完成，不增加重复的 extraStyleContent 接口。#376 的非标准伪元素列表原补丁可用逐节点扩展复现，但不能把通用 CSS 注入等同于原生滚动条的完整截图：早期 a360c43 上的原 HTML/CSS 结构在 Chromium/WebKit 未滚动时可经注入显示红黑滚动条，scrollTop=50 后仍因 cloneScrollState 的隐藏/位移路径消失；Firefox 不支持那组 WebKit 专有规则。该测量是原序列化逻辑在 V2 hook 中的适配，不是历史分支完整构建回放。[早期测量及重放输入](evidence/scrollbar-extension-probes.json)已归档。当前原生滚动条外观契约已向用户提出两种具体选择，尚未确定。

复核另发现独立的既有缺陷：默认 ::before/::after 背景图只进入生成的样式规则，资源阶段只读取行内 style，三个引擎输出红色底色。候选从无窗口解析文档的 CSSOM 读取规则背景/遮罩，复用现有嵌入流程；直接 URL、分组规则、变换新增遮罩、相对地址和缓存复用有真实 HTTP 回归，旧源码六项全部失败。@import 保留而不加载/展开，font-face 保留原策略，非 CSS style 块与生成内容中的 URL 字面文本不会被当成图片。本地 210/272/117（源码另有 1 项既有 GC 跳过）、lint/构建/类型/tarball 已通过，[证据](evidence/pseudo-style-resources.json)已归档；源码 `58de76f` 真实 iPhone Safari 23/23 通过，[原始报告](evidence/ios-safari-pseudo-resources-58de76f.json)已归档；#626 已合入 master（fd28e2c），PR/主分支 CI、CodeQL 与 PR Codecov 均通过。

#473 的 usePageCss 不能仅凭更小体积替代计算样式：在当前 V2 hook 注入的受控对照中，@media(min-width:1px) 在 Firefox/WebKit 的 SVG 图像输出不生效，改为 all 后生效；这不是 #473 整体替代实现的运行结论。其分页函数先解码完整 SVG，再对宽度缩放、对高度分片，仍需分别度量 CSS 体积、完整图像解码和输出内存，不能声称已解决大 DOM 性能。

## 2026-11-11 SVG 引用依赖复核（#585 / #427 / #499 / #393）

复核 #585 的外部 SVG 需求时，确认当前代码只复制被引用节点，漏掉旁边的渐变、裁剪、遮罩和其他符号。候选按原文档/ShadowRoot 建立依赖图，递归导入属性与行内样式中的引用；外部文档各自分配副本 ID，处理循环和重叠子树，复用单次捕获的资源加载器。相对 image/feImage 地址保留资源文档及 xml:base 的解析基准。SVG use 无片段时选择文档根元素，与 [SVG 2 use 规则](https://www.w3.org/TR/SVG2/struct.html#UseElement)一致。

另修复现代 href 的空值被旧 xlink:href 覆盖、无 href 图片误请求当前页面，以及被筛掉的内部定义又被补回的问题。原始 DOM 不变；本地依赖仍走既有克隆回调。三引擎最终定向 42 项在旧源码上 29 项失败、13 项通过，候选全部通过。WebKit 蓝色的微小原生偏差及特殊编码 ID 均与同引擎独立 SVG 对照精确比较，没有放宽像素容差。[依赖证据](evidence/svg-reference-dependencies.json)记录范围和源文件 hash，本地完整检查 220/302/120（源码另 1 项既有 GC 跳过）、lint/构建/类型/tarball 均通过；源码 `180ff94` 真实 iPhone Safari **24/24 通过**，[原始报告](evidence/ios-safari-svg-dependencies-180ff94.json)已归档；#627 已合入 master（545ff83），PR/主分支 CI、CodeQL 与 PR Codecov 两项均通过。

这不是 #585 的整体移植：外部兄弟样式表/字体、变换阶段新增引用及重定向后的基准 URL 尚未建立证据；其 live reflow、三态 filter、调用者缓存和通用 iOS 重绘方案仍分别核对。不能因此关闭整个 #585，也不能把 #498 的延时重绘视为通用根因修复。

### 外部 SVG 样式：实际页面与独立图片对照的边界

后续使用真实 HTTP external use 的页面截图重新核对，发现先前“独立 SVG 图片应为绿色/蓝色”的对照不足以证明各引擎页面截图一致。相同输入含两个外部图标、页面内黄色 !important 规则和独立黄色参照块：Chromium 原生为绿/蓝/黄，Firefox 为黄/黄/黄，WebKit 为绿/黑/黄；当前 master 导出三个引擎均为黄/黄/黄。去掉页面内规则后，Chromium 原生仍为绿/蓝/黄、导出为绿/黑/黄；Firefox/WebKit 的原生与导出都是绿/黑/黄。原生 iPhone Safari 在有/无页面规则两种状态都为绿/黑/黄，截图字节相同。

[15 组完整像素记录](evidence/svg-styles-native-matrix.json)、[真机截图](evidence/ios-safari-svg-style-source.png)和[重放方法](evidence/svg-styles-native-replay.md)已保存。这些是差异观测，不是修复通过数。作用域样式原型能按文件产生绿/蓝，但与 Firefox/WebKit 的八组实际页面对照不一致，未合入。已明确提出决策：忠实保留各浏览器当前页面，或统一按外部 SVG 文件样式还原；尚未收到选择，相关运行时改动等待该契约。独立的 SVG 引用依赖修复 #627 保持已有验证范围，#585 仍未整体解决。

## 2026-11-11 大页面与样式复制复核（#473 / #585）

本轮实际打包并运行 #473 原 head `0b677d5`，没有改历史源码。三引擎均把 17000×20 输出缩为 16384×19；40×20000 则分成 40×16384 与 40×3616，首尾红/绿/蓝标记正确，drawImage 的输入仍是完整 40×20000 图片。这证明了特定纵向分片行为，没有建立源图片解码或总内存的上界。[历史执行记录](evidence/pr473-historical-controls.json)保存输入、源码与构建 hash。原分支的简单 @media(min-width:1px) 案例在三引擎都为绿色；先前 V2 hook 的失败不能当作该历史实现失败。两者的 style 所在位置不同，尚未用单变量实验确定原因。

401 节点、40×8000 的简单 CSS 样例中，原页面 CSS 方案的 SVG 为 13602 字节，当前 V2 为约 2.38–2.87MB；四次 PNG 运行、去掉首个样本后的中位数分别为 4–6ms 和 150–265ms。这是单一受控样例的描述性测量，不是大 DOM 压力测试，也不能把更小样式表等同于任意页面保真。usePageCss、字体/ShadowRoot/iframe 的作用域以及完整图像解码仍需分别处理，不整体移植旧分支的全局 Document 或选项修改。

继续定位 V2 的复制成本时，发现每一个样式属性都会对普通节点调用跨 realm iframe 类型识别。候选先检查属性是否为 display、值是否为 inline，再执行类型识别，保留原复制顺序和 CSSOM 写入。相同构建器、同一 401 节点输入、六次交替运行的配对对照中，捕获中位数 Chromium 202.8→141.6ms、Firefox 135→122ms、WebKit 150→138ms，三个引擎 SVG **字节完全相同**且源 DOM 不变。[性能证据](evidence/style-copy-performance.json)记录全部样本；这是前后耗时对照，不伪造新增的功能失败计数。批量 CSS 写入的实验只有约 2% 捕获收益，且未保持字节相同，已撤回。

本地 lint/构建/类型/tarball、覆盖率 220、源码 302（另 1 项既有 GC 跳过）、构建包 120 全部通过。源码 `c2f78c1` 真实 iPhone 的配对捕获中位数 135→124ms、SVG 字节一致；构建 ESM/UMD 完整 24/24 通过，[配对记录](evidence/ios-style-copy-paired.json)与[冒烟报告](evidence/ios-safari-style-copy-c2f78c1.json)已归档；[#629](https://github.com/bubkoo/html-to-image/pull/629) 已合入 master（`b9f2dfd`），PR/主分支 CI、CodeQL 与 PR Codecov 均通过；SVG 体积和大页面内存问题没有因此解决，#473/#585 不按整体完成处理。[重放与范围](evidence/style-copy-performance-replay.md)说明两个不同的对照实验。

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
| [#568](https://github.com/bubkoo/html-to-image/pull/568) | 原跨 realm 遍历需求已等价覆盖；另外发现的文档字体及生命周期缺陷已随 #623 合入。最终 `f4ab94e` 真机 21/21、字体定向 42/42、完整本地和远端检查通过，见上方记录；不外推至不可读跨源 iframe 或纯 JS FontFace 字节。 |
| [#451](https://github.com/bubkoo/html-to-image/pull/451) | [PR #617](https://github.com/bubkoo/html-to-image/pull/617) 复现了视频原始比例 960×540、显示区域 240×160 且 `object-fit: contain` 时的拉伸：修复前顶部留白变成视频画面。按视频原始宽高截取帧后，三引擎源码与构建 UMD 均导出正确的顶部留白与中心画面。原 PR 的截图页面、其他 `object-fit` 组合及高分辨率视频的资源成本尚未复测。 |

## 待复现和设计：拆成小问题处理，每个修复补回归

| 优先级 | PR | 下一步 |
| --- | --- | --- |
| 高 | [#409](https://github.com/bubkoo/html-to-image/pull/409), [#408](https://github.com/bubkoo/html-to-image/pull/408) | #409 的 CSS/像素尺寸分离已验证，零值/NaN 修复已随 #618 合入，见上方基线；#408 为部分滚动覆盖，自定义滚动条外观及复杂布局仍需独立复现。 |
| 高 | [#498](https://github.com/bubkoo/html-to-image/pull/498), [#442](https://github.com/bubkoo/html-to-image/pull/442), [#585](https://github.com/bubkoo/html-to-image/pull/585) | 用原 fixture 分离 iOS 资源获取和首次空白等根因；#585 是大范围替代实现，不整体移植。真实 iOS 回归需重新测目标场景。 |
| 中 | [#401](https://github.com/bubkoo/html-to-image/pull/401), [#482](https://github.com/bubkoo/html-to-image/pull/482), [#504](https://github.com/bubkoo/html-to-image/pull/504), [#533](https://github.com/bubkoo/html-to-image/pull/533) | 对照 V2 的图片加载、解码和资源错误路径；先构造能失败的用例，避免重复修复或吞掉用户回调错误。 |
| 中 | [#560](https://github.com/bubkoo/html-to-image/pull/560), [#430](https://github.com/bubkoo/html-to-image/pull/430), [#400](https://github.com/bubkoo/html-to-image/pull/400), [#443](https://github.com/bubkoo/html-to-image/pull/443) | 已有逐项结论与真实 HTTP fixture，见资源策略复核；已随 #622 合入；本地 190/213/105、真机 20/20、PR CI/CodeQL/Codecov 和主分支 CI/CodeQL 通过。 |
| 中 | [#511](https://github.com/bubkoo/html-to-image/pull/511), [#376](https://github.com/bubkoo/html-to-image/pull/376), [#407](https://github.com/bubkoo/html-to-image/pull/407), [#473](https://github.com/bubkoo/html-to-image/pull/473) | #511 的字号缩小修复已随 #621 合入 master，真机 16/16，见字体复核；其余继续评估伪元素注入、附加 CSS 和大页面分片的实际输出语义及资源成本。 |
| 低 | [#398](https://github.com/bubkoo/html-to-image/pull/398) | README 已有新预览示例，桌面三引擎通过；真机 PNG 生成/读取通过，新标签交互等待手动点击，见文档复核。 |

## 维护与无关内容

| PR | 处理 |
| --- | --- |
| [#574](https://github.com/bubkoo/html-to-image/pull/574), [#540](https://github.com/bubkoo/html-to-image/pull/540) | 已核对原改动、当前 lock/安装树和官方公告，两项旧锁文件 bump 均被现行工具链取代；见上方依赖记录，不直接移植旧锁文件。 |
| [#517](https://github.com/bubkoo/html-to-image/pull/517) | Reservation 页面与 DOM 转图片库无关；已说明范围后关闭。 |

以下为 #603 前的历史分组，并非本次 28 项目标的当前完成度。

历史合计：22 个已有对应实现、6 个本轮补齐、3 个部分覆盖、18 个待复现或设计、2 个依赖维护、1 个无关内容，共 52 个。

## 2026-11-11 混合文字滚动修复（#408 / #345 / #594）

此前包含直接文本或行内子元素时直接回退，导出丢失 scrollTop，源视口绿色而截图为红色。候选对正向纵向滚动、horizontal-tb 的块级容器，用副本 ::before 的流偏移表达滚动量；不包裹、不重排真实子节点。已有块级 ::before 保留内容，仅调整顶边距；空伪元素的 1px 高度防止与后续负边距合并。私有规则位于 SVG 外层最先声明的层，其 important 优先级依据 [CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/#layer-order)，避免源 ID 或分层 important 规则覆盖偏移。

14 种共享输入覆盖直接/换行文字、padding/border、首块负边距、结构选择器和分层 important、已有 before/after、sticky、变换包含块中的直接 fixed、嵌套、RTL 纵向、纯行内元素和同源 iframe。三引擎均先截取浏览器实际源页面作为像素对照，再核对捕获像素和源不变；最终输入在旧源码 42/42 失败，源对照无失败，候选 42/42 通过。完整 lint/构建/类型/tarball、234 覆盖率、344 源码（另 1 项既有 GC 跳过）及 123 构建包检查通过。[证据与范围](evidence/mixed-scroll.json)已归档，源码 `42e8012` 真实 iPhone Safari 完整 25/25 通过（新增 14 场景分别经 ESM/UMD 验证），[原始报告](evidence/ios-safari-mixed-scroll-42e8012.json)已归档；[#630](https://github.com/bubkoo/html-to-image/pull/630) 已合入 master（7169372），PR/主分支 CI、CodeQL 与 PR Codecov 全部通过。

横向/斜向混合文字、竖排、已有 inline before、绝对定位组合、其他 fixed 包含块及原生滚动条外观仍有边界；#408/#345 不按全部完成处理。

另对 #451 在 `b9f2dfd` 做了独立真实 iPhone 验证：960×540 视频暂停在 0 秒，240×160 object-fit:contain；默认 1 次与稳定化 3 次输出均保留上下紫色留白和中心视频像素，源不变。[原始记录](evidence/ios-video-aspect-b9f2dfd.json)及[输入](evidence/ios-video-aspect-input.html.txt)已归档。使用明确 video/mp4 MIME 的 Blob；最初静态 HTTP 输入在捕获前即不被设备支持，不能算库的回归。没有验证流媒体、CORS、播放时序、高 DPR 输出或所有适配组合。
