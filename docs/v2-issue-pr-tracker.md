# V2 Issue / PR 回应台账

## 2026-11-11 最新状态：滚动条占位尺寸候选 #634

#632 已合入 master 67b2ec2，#633 已合入 master 7d8d350；各自准确源码的真机验收已归档。#633 最终 head 1c6b184 的 PR CI 42961919142、CodeQL 42961919318、Codecov，以及 master CI 42962301112 / CodeQL 42962301137 全部通过。下方较早的“待验/未合并”文字保留为历史阶段，不代表当前状态。

继续按 #408 原关联的 #81 / #345 处理。新候选修复独立根因：CSSOM 的 content-box 尺寸已扣除滚动条占位，再复制到原生滚动容器会重复扣除。按实际外框与已解析尺寸的差额恢复占位，仅处理仍保留该空间的轴；滚动后 hidden 仍保留 stable inline gutter 的情况也覆盖。没有读取伪元素声明的 10.5px 当作实际厚度。

[尺寸证据](evidence/scrollbar-box-dimensions.json)：最终同组旧源码 12 失败 / 25 通过 / 2 特性跳过，候选 36 通过 / 3 跳过。完整本地 coverage/source/package 为 349/689/138，另 1/4/0 跳过，lint/构建/类型/tarball 均通过；HTML 格式收敛后相关构建包复验 9/9。Chromium 明确关闭测试框架默认隐藏滚动条和系统悬浮模式，旧 iframe/粘性标题内容取样改到真实内容视口内。两个 Firefox legacy 选择器不支持；Chromium both-edge gutter 的原生横向滑块差异未计为通过：Mac 44 通道、首轮 Linux CI 22 通道。库与手写 SVG 全像素相同；仅当全部原生差异都位于横向滚动条带内、手写 SVG/原生差异数也完全相同时单独跳过原生保真验收，额外几何正对照和其他内容像素仍严格验证，不放宽容差。先前称为角落差异不准确，已按 PNG 坐标修正。

[草稿 PR #634](https://github.com/bubkoo/html-to-image/pull/634) 尚待最终提交的远端和真机验收；前两轮 CI 分别暴露 Mac 通道数硬编码与误传 Chromium 专用启动选项的问题；已按差异区域核对，并仅在 Chromium 实例/项目设置选项。本地再次全过，最终提交的远端及真机仍需各自验收。目前 USB 列表没有 iPhone，Safari 不能创建可用会话，不能沿用 #632/#633 的真机报告。#398 手动页面在 USB/同 Wi-Fi 均不可达；临时外网入口也未建立（DNS 失败、Mac 安全软件拦截隧道工具），未修改安全设置。原生滚动条完整外观/滑块位置及两个 Issue 的其他布局边界仍未解决；未关闭或评论旧 PR，未发布 npm。

另一个原生滚动状态原型保留在 codex/native-scroll-snapshot 的 b9e9d5b，存在两个严格 WebKit 源像素失败，未进入本尺寸修正。

更新于 2026-11-11。用途是准备后续 Issue 和 PR 回复；已合并与后续修复候选应按各行证据分别核对。V2 已通过 [PR #600](https://github.com/bubkoo/html-to-image/pull/600) 合并到 `master`，尚未发布 V2 到 npm，不能把合并等同于发布。测试与修复项的完整对应关系见 [v2-regressions.md](v2-regressions.md)；开放 PR 的逐项处理建议见 [open-pr-triage.md](open-pr-triage.md)。

“本地覆盖”只表示所列场景有对应回归并通过验证；“部分覆盖”表示不能按原帖的全部范围宣称解决。后续修复候选须合并后才能称为 `master` 已修复。回复前应重新核对主分支代码、测试结果和远端 CI。

[PR #600](https://github.com/bubkoo/html-to-image/pull/600) 已在 2026-11-02 用 rebase 方式合并，保留 V2 的 `BREAKING CHANGE` 记录。首次 `pull_request` CI 对包含 `ebe06a2` 的测试合并提交运行，因下拉框固定参考图的 Linux 字体差异失败；修复后在 [run 40830985559](https://github.com/bubkoo/html-to-image/actions/runs/40830985559) 完整通过 PR head 校验、Karma、三浏览器行为、构建产物与 Codecov 上传。最终 PR head `ba99c76` 的三浏览器 CI、CodeQL 和 Codecov 也通过；`pull_request` 校验确认测试合并提交的第二父提交是 PR head。

| 对应讨论 | 原问题与根因 | 当前分支已做的事 | 证据和回复边界 |
| --- | --- | --- | --- |
| [PR #376](https://github.com/bubkoo/html-to-image/pull/376) / [PR #407](https://github.com/bubkoo/html-to-image/pull/407) | 需要自定义伪元素及附加 CSS；默认伪元素的背景图也被漏过资源阶段。 | 附加 CSS 使用现有 onClone；候选补齐 CSS 样式规则内背景/遮罩直接 URL 的嵌入，不新增重复选项。 | **独立缺陷候选**：旧源码六项像素回归失败、候选六项通过，本地 210/272/117 与构建/类型/tarball 通过；grouped/relative URL、去重与源不变控制；import 不展开、字体策略不改；源码 `58de76f` 真实 iPhone Safari 23/23 通过；#626 已合入 master，PR/主分支 CI、CodeQL 与 PR Codecov 均通过。原生滚动条外观与滑块位置仍待实际源对照验证，不能称 #345 全部修复。 |
| [PR #585](https://github.com/bubkoo/html-to-image/pull/585) 的 SVG 子集 / [PR #427](https://github.com/bubkoo/html-to-image/pull/427) / [PR #499](https://github.com/bubkoo/html-to-image/pull/499) / [PR #393](https://github.com/bubkoo/html-to-image/pull/393) | 引用符号的兄弟依赖丢失，跨文档 ID 混淆；空 modern href 错误激活 legacy，筛选后的定义被重新导入。 | #627 已递归补齐属性/行内样式引用，按源文档分配外部 ID，复用资源缓存；补齐 image/feImage、相对资源地址和无片段 use。 | **独立缺陷已合入 #627**：旧源码 29/42 失败，候选三引擎 42/42 通过；真实 HTTP 的嵌套/循环/重叠引用、相对图片、冻结快照与源不变控制。本地完整 220/302/120、lint/构建/类型/tarball 通过（源码另 1 项既有 GC 跳过），源码 `180ff94` 真机 24/24 通过；#627 已合入 master，PR/主分支 CI、CodeQL 与 PR Codecov 通过，见 svg-reference-dependencies.json。外部样式表/字体及 #585 其他设计不作完整解决声明。 |
| #585 外部 SVG 样式后续核对 | 独立 SVG 图片不等于 live external use 的页面行为；主页面 CSS 与外部样式的作用域在三引擎存在差异。 | 保存 15 组实际页面截图/当前导出像素及真实 iPhone 原生对照，撤回统一绿/蓝即可证明页面保真的假设；运行时原型不合入。 | **契约待选**：页面内黄规则下 Chromium 为绿/蓝、Firefox 黄/黄、WebKit 和真机绿/黑；导出当前均黄/黄。原始像素、输入 hash、真机 PNG 和重放方法见 svg-styles-native-matrix.json。已提出“页面实际显示 / 文件样式统一还原”的具体选择，未推定用户答案；不按 #585 已完成处理。 |
| [PR #473](https://github.com/bubkoo/html-to-image/pull/473) / #585 的样式复制性能 | 页面 CSS 和逐节点计算样式的体积/开销不同；原分片仍先解码完整图片。V2 还把 iframe 类型识别放在每个无关属性前重复执行。 | 实际运行原 head，归档 17000px 宽缩放、20000px 高分片及媒体查询行为；候选仅调整类型判断条件顺序。 | **独立性能修复已合入 #629**：配对 401 节点样例的捕获中位数降低约 8%–30%，三引擎完整 SVG 字节一致，源码/构建包完整检查通过；源码 `c2f78c1` 真机配对 135→124ms 且 SVG 字节相同、构建包完整 24/24 通过，PR/主分支 CI、CodeQL 与 PR Codecov 均通过，合并 b9f2dfd。历史页面 CSS 模式在该样例确有体积与耗时收益；任意页面保真、完整解码和内存上界仍未证明，见 style-copy-performance.json / pr473-historical-controls.json。 |
| [PR #398](https://github.com/bubkoo/html-to-image/pull/398) | 需要用 Blob 快速查看导出结果；原例无 URL 释放，标题 toBlobs 与实际单数 API 不符。 | README 用现有 toBlob 生成可点击的 PNG 链接，返回删除链接及 revokeObjectURL 的清理函数；null Blob 拒绝。 | **本轮文档补齐**：原样 helper 的 Chrome/Firefox/WebKit 新标签 MIME/尺寸/像素、noopener 和清理验证通过。真机 96×60 PNG 生成/读回通过；自动输入无事件，新标签及清理仍待手动点击，见浏览器证据 JSON。 |
| [PR #540](https://github.com/bubkoo/html-to-image/pull/540) | 旧 pnpm lock 的 pbkdf2 3.1.2 → 3.1.3。 | 现有 Vitest 工具链已移除该依赖，无需移植旧 lock。 | **已由现有工具链取代**：移除提交 e32e74c；当前 lock 无 pbkdf2、完整安装树无此包，见 maintenance-dependency-review.json。 |
| [PR #574](https://github.com/bubkoo/html-to-image/pull/574) | 旧 lock 的 Rollup 3.12.0 → 3.30.0。 | 现有工具链仅安装 Rollup 4.67.4，高于两个官方公告对应的 4.x 修复版本，不改依赖锁文件。 | **已由现有工具链取代**：官方范围、lock hash、安装树及 currentScript IMG/SCRIPT 生成代码、越界输出拒绝结果见 maintenance-dependency-review.json；不宣称全依赖安全。 |
| [PR #430](https://github.com/bubkoo/html-to-image/pull/430) / [Issue #429](https://github.com/bubkoo/html-to-image/issues/429) | 并行资源不能只缓存完成结果；WebKit 副本原生加载还会绕过缓存。 | V2 的 capture 内 Promise 缓存已存在；已随 #622 合入 master，改用私有无窗口文档，统一嵌入相对图片 URL。 | **已合入 #622，真机 20/20**：真实 HTTP 下 WebKit 修复前多 3 次原生请求，修复后为 0；重复图片、CSS 背景和冻结输出共用一次请求；新增节点及 iframe HTML/SVG 相对地址保留像素且不修改源。 |
| [PR #560](https://github.com/bubkoo/html-to-image/pull/560) | 长期全局图片/字体缓存影响 SPA 资源生命周期。 | 无全局响应缓存；每次 capture 独立，显式 dispose 释放库引用并阻止复用。 | **资源契约已复核；源文档修复已合入 #625**：HTTP 内容红→蓝→绿在新捕获中更新、释放后拒绝复用。进一步复现快照的源文档及释放回调环境持有；候选在旧源码 11 项失败、修复后 11 项通过，三引擎独立文档 GC 和输出覆盖，WebKit 原生 iframe GC 保留对照边界。本地 208/266/114（源码另 1 项有界跳过）、构建/类型/tarball 已过，源码 `6c7de81` 真机输出 22/22 通过（不声称原生 GC），PR/主分支 CI、CodeQL 和 PR Codecov 均通过，不宣称原 SPA 内存压力已复现。 |
| [PR #400](https://github.com/bubkoo/html-to-image/pull/400) | 请求需要控制浏览器 HTTP 缓存。 | 使用现有 fetchRequestInit.cache，无需 cacheDisable。 | **已有契约复核**：cache:no-cache 的真实新 GET、重新验证指令和蓝色像素；不依赖浏览器默认缓存命中，冻结选项不变。 |
| [PR #443](https://github.com/bubkoo/html-to-image/pull/443) / [Issue #503](https://github.com/bubkoo/html-to-image/issues/503) | 不同 URL 需要不同凭据与请求配置。 | resources.resolve 返回 Blob 或 undefined 回退正常 fetch；resolver 管理自己的选项、状态检查和 signal。 | **已有契约复核**：双源私有 cookie 图片、无凭据公开图片/字体像素和实际请求凭据；全局 include 为失败对照。无需并行的 RequestInit 生成器 API。 |
| [PR #442](https://github.com/bubkoo/html-to-image/pull/442) / [Issue #361](https://github.com/bubkoo/html-to-image/issues/361) | 字体与图片可能需要不同凭据，原帖还报告 iOS 空白。 | 上述 URL/kind resolver 支持受控混合凭据；不把 include/cacheBust 当通用 iOS 修复。 | **部分覆盖**：受控混合凭据 fixture 可验证；原应用 URL/CORS/完整 fixture 缺失，全部空白问题仍未证明解决。 |
| 资源复核中新发现的 iframe 错误吞掉问题 | 同源 iframe body 克隆位于宽 catch 内，用户回调错误触发静默回退。 | 仅捕获访问不可读文档的错误，递归克隆和回调失败原样传播。 | **已合入 #622**：三引擎修复前均吞掉 callback Error，修复后核对同一 Error 对象；源 URL 保持不变。 |
| [PR #511](https://github.com/bubkoo/html-to-image/pull/511) / [Issue #415](https://github.com/bubkoo/html-to-image/issues/415) | 计算字号被 `floor(...) - 0.1` 改写，小数字号显著缩小，文本换行和字形位置偏离源页面；历史 #270 曾用此法绕过 #132 的末词换行。 | 已随 #621 合入 master，保留源计算字号，不增加字号缩小开关，不改写源字距设置。 | **已合入 #621，真实 iPhone 16/16**：三引擎修复前各 5 项失败；修复后验证 20.75px 的默认/全局/逐节点选择、第二行红色像素、13.75px 字形位置、不同字距/字号/像素比、源不变及 #132 的 flex 结构。构建 ESM/UMD 使用本仓库原创 1.1 KB 字体做相同像素验证。原帖完整段落和旧平台未提供可运行 fixture，不能按全部环境已解决关闭。 |
| [PR #409](https://github.com/bubkoo/html-to-image/pull/409) 尺寸核对 | 原补丁把画布像素属性设回 CSS 尺寸，覆盖 `pixelRatio`。核对 V2 时发现独立边界缺陷：`width`/`height` 的 `||` 回退吞掉显式 `0` 和 `NaN`。 | 本分支只对未指定尺寸使用源尺寸，克隆样式保留显式零值；保留已有有限非负尺寸校验和零尺寸 SVG/栅格化语义。 | **修复候选**：三引擎在修复前各 4 项失败，修复后源码验证零尺寸 SVG、副本样式、栅格化拒绝、NaN 在克隆前拒绝及源尺寸不变；另验证 1×/2× CSS/像素尺寸、实际 UMD 的 2× 末端像素。ESM 冒烟页新增同组验收。原关联项目缺精确设备信息，不把独立边界修复等同于复现其全部故障。 |
| [PR #408](https://github.com/bubkoo/html-to-image/pull/408) / [Issue #345](https://github.com/bubkoo/html-to-image/issues/345) | PR 尝试平移子节点并隐藏滚动条；Issue 同时要求自定义滚动条的颜色和宽度。 | V2 的可见滚动视口已有下方 #594 的限定覆盖；未实现滚动条外观的独立复制。 | **部分覆盖**：隐藏滚动条不能等同于保留外观；混合直接文本、行内及复杂定位仍有边界，#345 不按完整修复处理。 |
| [Issue #562](https://github.com/bubkoo/html-to-image/issues/562) | 发布的 ESM 文件保留无扩展名相对导入，浏览器原生模块和 Node ESM 无法解析。 | 源码内部使用 `.js` 导入，生成 `es/package.json`，设置 ESM/CJS 条件导出。 | **本地覆盖**：`test:package` 将实际压缩包装进临时项目，验证 ESM、CJS、UMD、类型与文件清单；`test/browser/package.test.ts` 在 Chromium、Firefox、WebKit 加载构建后的 ESM 和 UMD，并核对输出像素。正式发布后的消费场景仍待验证。 |
| [Issue #553](https://github.com/bubkoo/html-to-image/issues/553) | `toPixelData` 按 CSS 尺寸读取像素，高设备像素比时裁掉画布右侧和底部。 | 从实际画布宽高读取完整像素缓冲区；旧入口复用同一实现。 | **本地覆盖**：`renderer.test.ts` 的非 1 像素比尺寸、缓冲区长度和末端像素断言。原帖的 Mapbox/Firefox 场景未复测。 |
| [Issue #543](https://github.com/bubkoo/html-to-image/issues/543) | iframe 的 body 在特殊克隆步骤和通用子节点步骤中各复制一次。后续三浏览器像素回归发现：同源 iframe 的运行时滚动位置被遗漏；把 iframe 视口与 body 合为一个副本，又会覆盖 body 的横向布局，并使 fixed 内容相对外层视口定位。 | iframe body 完成特殊克隆后不再进入第二次子节点递归；[PR #612](https://github.com/bubkoo/html-to-image/pull/612) 已合入 `master`：将视口裁剪与 body 布局分开表达，读取 `contentWindow.scrollX/Y`，只位移 body 中的滚动内容，并把 fixed 后代锚定到 iframe 视口。 | **部分覆盖**：`renderer.test.ts` 与三引擎 `capture.test.ts` 验证内容恰好一份；纵向、横向和 fixed 像素在修复前分别出现红色、透明或错误位置，修复后三引擎显示源视口的颜色且源滚动不变；实际构建 UMD 的三引擎纵横滚动像素测试通过。新增 ESM 移动端冒烟覆盖视口偏移、fixed、纵横滚动；真实 iOS 待复测。跨域 iframe 与更复杂的滚动布局不在该结论内。 |
| [PR #568](https://github.com/bubkoo/html-to-image/pull/568) | 旧 HTMLElement 判断跨 realm 失败；V2 虽已改为 Element，捕获 iframe/祖先时仍只从外层文档收集字体，且同名家族在扁平副本中冲突。 | 候选按来源文档收集 CSS 字体、解析地址并给附加文档的副本字体独立名字；不改源样式。克隆变换新增规则也参与收集，local-only 来源保留。 | **已合入 #623**：初版旧源码定向测试 24/39 失败；修复后 39/39、覆盖率 203、源码 252、构建包 111 通过。涵盖直接内容/frame/祖先、嵌套、adopted/普通样式表、同名字体像素、引号家族名、getFontEmbedCSS 复用/显式覆盖和过滤。导航或文档边界改变后须重新收集字体 CSS；早期候选真实 iPhone Safari 21/21 通过；#623 复检另修复副本文档生命周期和注释误判，字体定向 42/42，最终源码 `f4ab94e` 真机 21/21、本地 204/255/111 通过；最终 PR 与主分支 CI/CodeQL、PR Codecov 两项检查均通过。 |
| [PR #451](https://github.com/bubkoo/html-to-image/pull/451) | 克隆视频时用 CSS 显示宽高建立画布，把不同比例的原始帧提前拉伸；随后 `object-fit` 再也无法恢复原始比例。 | [PR #617](https://github.com/bubkoo/html-to-image/pull/617) 截帧画布按 `videoWidth`/`videoHeight` 建立，让复制的 `object-fit` 样式负责显示区域的适配。移除以旧拉伸输出生成的固定图片参考，保留海报路径测试。 | **修复前失败、修复后通过**：`test/browser-unit/video.test.ts` 用真实 960×540 视频和 240×160 显示区域验证顶部紫色留白与中心画面；修复前 Chromium 顶部为视频像素 `[37,30,18,255]`，修复后三引擎均为 `[255,0,255,255]`。实际构建 UMD 的三引擎测试验证相同像素。原 PR 截图页面、其他视频比例/适配组合和高分辨率视频的嵌入体积尚未复测。 |
| V2 构建包测试来源校验 | 本机同时运行给 iPhone 用的验收服务与隔离分支测试时，Playwright 复用默认 4173 端口上的主分支服务，导致个别通过项并非来自当前分支；完整报告因保存在另一目录而失败。 | 测试服务支持指定一对相邻端口；Playwright 不再复用已有服务；完整报告须带当前检出 SHA。默认 iPhone 验收地址仍使用 4173/4174。 | **修复前失败、修复后通过**：隔离分支的完整页面先因误连主分支服务失败；现在占用默认端口会明确报错，改用 `HTML_TO_IMAGE_SMOKE_PORT=4273` 后构建包三引擎 63 项全通过，报告 SHA 与当前检出一致。 |
| V2 Shadow DOM slot 复核 | slot 没有分配节点时，浏览器应显示 fallback 子节点；克隆器只取空的 `assignedNodes()`，把 fallback 丢弃。 | [PR #613](https://github.com/bubkoo/html-to-image/pull/613) 已合入 `master`：没有分配节点时克隆 slot 的 fallback 子节点；有分配节点时仍只克隆分配内容。 | **本地覆盖**：`capture.test.ts` 在三引擎修复前得到透明像素，修复后得到绿色 fallback 像素；分配节点后得到红色像素、SVG 不含 fallback，源状态不变。构建 ESM 的三引擎冒烟测试通过；真实 iOS 对新增验收项待复测。 |
| [Issue #578](https://github.com/bubkoo/html-to-image/issues/578) | HTML 文本中的 XML 1.0 非法控制字符进入 SVG，导致后续图像加载失败。 | SVG 序列化后移除非法控制字符，不改动源 DOM 文本。 | **本地覆盖**：`renderer.test.ts` 验证含 SOH 的输出可解析，源文本保留。原帖 Edge 环境尚未复测。 |
| [Issue #570](https://github.com/bubkoo/html-to-image/issues/570) | HTML 注释可以包含 `--`，但复制到导出的 XML/SVG 后会触发解析错误。注释没有视觉内容。 | [PR #606](https://github.com/bubkoo/html-to-image/pull/606) 已合入 `master`：克隆入口跳过注释节点，保留源 DOM；不修改文本或元素内容。 | **修复前失败、修复后通过**：`xml-comments.test.ts` 在 Chromium 先得到 XML `parsererror`，修复后三浏览器源码与实际 UMD 构建包均验证 SVG 可解析、红色像素正确、源注释不变。PR 与合并后的 CI、CodeQL 通过；npm 尚未发布。 |
| [Issue #594](https://github.com/bubkoo/html-to-image/issues/594) | 嵌套滚动容器的 `scrollTop`/`scrollLeft` 是运行时状态，序列化的副本丢失可见位置。 | 在副本中表达内容位移和裁剪；保留源节点的滚动状态。直接位于顶部的 sticky 标题保留原位与绘制层级，普通内容仍按滚动量位移。[PR #611](https://github.com/bubkoo/html-to-image/pull/611) 补充直接 fixed 子元素：仅位移正常流内容，并维持 fixed 叠放顺序。[PR #615](https://github.com/bubkoo/html-to-image/pull/615) 处理 sticky 前有普通块级内容的纵向滚动：用首个正常流子元素的边距表达滚动量，让浏览器继续定位 sticky。 | **部分覆盖**：`scroll.test.ts` 验证纵向、横向、已有子元素变换和混合直接文本回退；`capture.test.ts` 在三引擎核对单层、双层、直接 sticky、RTL 负 `scrollLeft` 与直接 fixed 元素在滚动视口内外的像素和源状态。按原帖独立页面结构补的 430×320 场景、200 px 面板、滚动 200 px 后第 5–8 行与 2× 画布像素在三引擎通过。新增 sticky 后置测试修复前在 Chromium 导出蓝色 spacer，修复后三引擎验证 `top:0/8px` 的红色标题、绿色内容和源滚动不变；早期 transformed-fixed 在 sticky 前后两种 DOM 顺序中期待蓝色覆盖层，但未核对原生源像素；该期望已由本轮 fixed 源页面对照纠正，不能沿用为保真证据。构建后 ESM 的三引擎冒烟覆盖 fixed/sticky/普通内容，真实 iOS 待复验。原帖 Windows 主机、横向 sticky、混合行内内容、直接绝对定位和更深层组合尚未验证。 |
| [Issue #515](https://github.com/bubkoo/html-to-image/issues/515) / [PR #583](https://github.com/bubkoo/html-to-image/pull/583) | SVG 被整体深拷贝，`filter` 无法访问 `foreignObject` 等后代。 | SVG 后代也走可筛选的递归克隆。 | **本地覆盖**：`renderer.test.ts` 和跨浏览器新测试直接验证 `foreignObject` 后代被 `filter` 排除；尚未跑原帖的完整 SVG fixture。 |
| [PR #595](https://github.com/bubkoo/html-to-image/pull/595) | 样式属性列表缓存在全局，首次捕获的选项泄漏到后续捕获。 | 样式选择归属单次捕获；显式空数组和伪元素选择按各次选项处理。 | **本地覆盖**：`renderer.test.ts` 的并发选项、冻结选项、伪元素 CSS 回归。此分支是独立实现，不应说已合并该 PR。 |
| [PR #597](https://github.com/bubkoo/html-to-image/pull/597) / [Issue #457](https://github.com/bubkoo/html-to-image/issues/457) | 用户需要按源元素修改导出副本，又不修改可见页面。 | 新增同步 `onCloneNode(original, copy)`，在子节点和样式复制后、整份 `onClone` 前运行；V2 的 SVG 后代也逐个触发。 | **本地覆盖**：`renderer.test.ts` 验证顺序、过滤、SVG 后代、异常和源不变；`capture.test.ts` 三引擎验证像素；构建 ESM 三引擎和实际 npm 压缩包类型验证通过。此分支独立实现，不能说合并了原 PR。 |
| [PR #598](https://github.com/bubkoo/html-to-image/pull/598) | 全局 `includeStyleProperties` 无法按元素选择不同计算样式，且伪元素要跟随同一选择。 | 新增 `stylePropertiesForNode(source)`；列表、空列表、`undefined` 各有明确定义，单节点结果同时应用于该元素和伪元素。 | **本地覆盖**：`renderer.test.ts` 验证父子选择、全局列表覆盖、空列表保留 inline、伪元素、冻结数组、异常及源不变；`capture.test.ts` 三引擎验证序列化；构建 ESM 与 npm 压缩包类型通过。此分支独立实现。 |
| [PR #596](https://github.com/bubkoo/html-to-image/pull/596) | `url(#id)` 被当作可请求资源，可能错误获取当前页面并替换片段引用。 | 保留仅含片段的 CSS URL，不发起资源请求。 | **本地覆盖**：`renderer.test.ts` 的片段保留/不请求断言；绝对同文档 URL 是下方 Issue #579 的独立修复。 |
| [Issue #579](https://github.com/bubkoo/html-to-image/issues/579) | 绝对或根相对 `clip-path` URL 在复制进 data URL SVG 后仍指向源文档，裁剪定义在新 SVG 中无法按原引用使用。 | 仅当 URL 解析后与源文档的 origin、路径和查询一致且带片段时，将复制节点的属性或计算样式改为本地 `url(#id)`；源 DOM 不变。 | **CI 覆盖**：`renderer.test.ts` 验证副本属性/样式及源不变；`clip-path.test.ts` 在 Chromium、Firefox、WebKit 验证属性、内联样式和样式表来源的 SVG 内容与裁剪像素；不同文档及不同查询参数保持原引用。构建后 ESM 的三浏览器测试也验证裁剪像素；[PR #600 run 41379640499](https://github.com/bubkoo/html-to-image/actions/runs/41379640499) 全部通过。原帖完整项目 fixture 尚未复测。 |
| [Issue #601](https://github.com/bubkoo/html-to-image/issues/601) | 重复的 `Content-Type` 被浏览器合并成含逗号的 Blob MIME，`FileReader` 原样放进 data URL，导致图片和 CSS 资源无法嵌入。 | 在共用 Blob→data URL 入口取第一个媒体类型，仅修正副本的 MIME，不改响应内容。 | **本地覆盖**：`renderer.test.ts` 验证重复响应头和生成的 data URL；`capture.test.ts` 在三个引擎核对图片与 CSS 背景像素；构建后 ESM 经真实 HTTP 重复响应头在三个引擎核对响应值、SVG MIME、两个像素与源 URL。Android MAUI WebView 原场景仍需复测。 |
| [PR #589](https://github.com/bubkoo/html-to-image/pull/589) | 图片已加载但 `decode()` 拒绝时，旧 `createImage` Promise 永久悬挂。 | 将可用图片的解码拒绝视为可继续，并让异步路径有确定的完成/失败。 | **本地覆盖**：`renderer.test.ts` 验证解码拒绝后导出仍完成；iPhone 内存压力场景未复测。 |
| [PR #592](https://github.com/bubkoo/html-to-image/pull/592) | data URL 图片无需下载，但仍须等待副本加载和解码后才能可靠地参与 SVG 栅格化。 | V2 的图片嵌入路径对 data URL 同样调用 `createImage` 并等待 `decode()`，且不覆盖图片自己的 `decode` 方法。 | **本地覆盖**：`renderer.test.ts` 用受控、延迟完成的 `decode()` 验证嵌入不会提前完成，完成后原方法仍可调用；原有解码拒绝回归和构建包随机大图像素测试并行覆盖相关路径。原 PR 的完整 fixture 未移植。 |
| [PR #590](https://github.com/bubkoo/html-to-image/pull/590) | `toBlob` 丢弃调用者指定的 MIME 和质量。 | 旧入口向画布编码传递 `type`、`quality`，包括 `quality: 0`。 | **本地覆盖**：`renderer.test.ts` 验证 JPEG Blob 类型和传给浏览器的质量参数。 |
| [PR #591](https://github.com/bubkoo/html-to-image/pull/591) / [Issue #488](https://github.com/bubkoo/html-to-image/issues/488) | WebKit 首次栅格化大图可能透明；预先 `decode()` 不能证明 SVG `foreignObject` 已绘制。 | 可选 `stabilizationAttempts` 对同一冻结 SVG 重绘，默认仍为 1 次。 | **部分覆盖**：模拟首次空白的像素回归；构建产物的大图标记测试在 Chromium、Firefox、WebKit 通过；本机 Safari 26.5.2 和真实 iPhone 16 Pro Safari 的随机 800×800 PNG 首次透明、稳定化后中心像素正确。实现语义不是 PR #591 的“连续两次结果相同才停止”；SVG 图片、跨域、所有 iOS/WebKit 场景未验证。 |
| PR #600 CI 中发现的下拉框问题 | 固定 PNG 参考图受 Linux 系统字体绘制影响；旧克隆逻辑只查显式 `value` 属性，会丢失运行时选择，并无法区分重复值选项。 | 下拉框测试改查选择语义和同环境像素变化；克隆按每个源选项的实际选中状态同步。 | **CI 覆盖**：`select.test.ts` 的 3 个 fixture、运行时切换、重复值、过滤前置选项用例；[首次失败](https://github.com/bubkoo/html-to-image/actions/runs/40829694424) 后，[修复提交完整通过](https://github.com/bubkoo/html-to-image/actions/runs/40830152086)。 |


## 2026-11-11 全量处置复核与 SVG 补充

剩余 28 个旧 PR 已逐项核对当前 head、原需求、实现与证据，见 [当前处置表](open-pr-triage.md#2026-11-11-剩余-28-项的当前处置索引)及[机器可读索引](evidence/open-pr-current-audit.json)。没有关闭或评论旧 PR。

本候选修复 SVG 引用发现过早：原来在 onClone/插件之前处理，新增/改向 use 不嵌入，移除引用却先请求。现在在资源阶段处理，并把延后标志传入 iframe 克隆；局部 SVG 定义的回调在导入时运行、错误原样传播，继承样式缓存随后清理。11 种变换场景 × 三引擎在基线为 30 失败 / 3 通过、候选 33 通过；再加独立 cloneNode 兼容对照，完整定向合计为基线 30 失败 / 6 通过、候选 36 通过；见 [阶段证据](evidence/transformed-svg-resources.json)。主源树回调顺序不变，外部辅助定义的资源阶段顺序已写入 README。

#581 / #534 补齐真实字体字形与直接 SVG 根入口，旧版使用未经修改的 v1.11.13 源码对照，显式嵌入是正对照、skipFonts 是负对照；[字体证据](evidence/svg-font-glyphs.json)记录范围。这是现有 V2 能力验收，不伪装为本轮新改字体运行时代码。

#585 相对 paint 与重定向的[原生矩阵](evidence/svg-redirect-native-matrix.json)使用独立地址、先截源后导出、直连/纯色 SVG 与黄色参照。Chrome/真机 Safari 的原生相对 paint 区域为空白，Firefox/桌面 WebKit 为绿色；当前导出分别得到重定向红色和直连绿色。源完整像素在前后保持一致。它是语义差异证据，不是通过的修复回归；仍需确认目标是文件定义还是当前浏览器页面输出。

## 2026-11-11 fixed 滚动源页面对照（#408 / #345 / #594）

独立原生截图发现早期 transformed-fixed + sticky 测试的期望有误：滚动 50px 后 fixed 已在 -50px，源顶部为绿色，旧导出和测试却期待蓝色。三个引擎均复现，不能继续把旧测试通过当页面保真证据。[独立原生 PNG、计数与范围](evidence/fixed-scroll.json)和[重放](evidence/fixed-scroll-replay.md)已归档。

候选使用源浏览器 offsetParent 区分当前容器、其他祖先或视口。纵向块流内有 fixed 后代时复用伪元素流偏移，避免把普通包装层变成新的 fixed 包含块；只给随当前容器滚动的 fixed 调整 inset，保留已有变换。直接横向/斜向 fixed 同样按实际关系处理。30 个输入覆盖 CSS 建立包含块的多种方式、sticky 两种顺序、普通/混合/深层/嵌套 fixed、已有变换、bottom/auto/right/RTL 和源 important。最终输入在基线 72 失败、18 通过，原生源对照全通过；候选 90 通过。完整 lint/构建/类型/tarball、264 覆盖率、434 源码（另 1 项既有 GC 跳过）及 126 构建包检查通过；源码 `aba8ed5` 的最终 30 输入分别经 ESM/UMD，真实 iPhone Safari 完整 26/26 通过，[最终报告](evidence/ios-safari-fixed-options-aba8ed5.json)已归档。独立原生源像素对照来自相同运行时代码的 c3b2d09；#631 已合入 master（132c38d），PR/主分支 CI、CodeQL 与 PR Codecov 均通过。

横向/斜向的深层 fixed 包装组合、已有 inline before 与绝对定位回退、任意捕获根偏移、其他未测布局及滚动条外观仍保留边界；不按整个 #408/#345 已解决处理。


## 尚不能宣称解决

| 对应讨论 | 当前边界 |
| --- | --- |
| [Issue #556](https://github.com/bubkoo/html-to-image/issues/556) / [Issue #569](https://github.com/bubkoo/html-to-image/issues/569) | iOS 下载/分享空白与笼统的 Safari 失效报告缺少同场景验证；本机 Safari 大图修复不能外推。 |
| [Issue #542](https://github.com/bubkoo/html-to-image/issues/542) / [Issue #536](https://github.com/bubkoo/html-to-image/issues/536) | [PR #607](https://github.com/bubkoo/html-to-image/pull/607)、[PR #609](https://github.com/bubkoo/html-to-image/pull/609) 与 [PR #610](https://github.com/bubkoo/html-to-image/pull/610) 已合入 `master`：去掉继承变量的重复序列化，按单次捕获缓存同级子节点重复读取的父变量值；20 个子节点的父值读取从 21 次降到每次不超过 2 次。三引擎复现 Promise 微任务克隆使主线程连续停顿，默认按 16 ms 时间片让出；本机 2000 节点合成场景的最长停顿约从 0.8–1.0 秒降到 0.19–0.24 秒。[SVG 编码基准](v2-performance.md#svg-url-编码边界)测得同场景产生约 12–14 MB XML；改用 Base64 只缩短 data URL 约 3–4%，不足以作为冻结问题的根因修复。资源与 SVG 序列化仍有长任务；实际大 DOM 冻结缺少同场景复现，仍不能宣称解决，npm 尚未发布。 |

## 回复前的证据闸门

2026-11-11 图片路径候选（核对 #504/#482 时发现）：`onImageErrorHandler` 的异步返回值原本被丢弃，恢复前就冻结 SVG、拒绝值未传播。候选改为等待回调；三引擎修复前各 2 项失败，修复后验证等待受控异步恢复、绿色输出像素、原始同步/异步异常传播及源图片不变。构建 UMD 与 ESM 冒烟页增加对应路径。#482 的全局吞错方案不采用；不把本修复等同于原 PR 完整应用已复测。

- PR #600 当时的结果：旧 Chrome Headless 套件 **109 通过、0 跳过**；新浏览器行为测试 **45 通过**、构建产物测试 **30 通过**（两者均覆盖 Chromium、Firefox、WebKit）；构建、`test:package`、类型及 lint 通过。真实 iPhone 16 Pro Safari 对候选 `ba99c76` 的完整验收页 8/8 项通过，大图首次为空、稳定化后中心像素正确；[设备报告摘要](v2-release-readiness.md)保留了浏览器信息和报告 ID。Issue #601 的 Blob MIME 用例及逐节点定制用例在修复前失败，修复后旧套件、三浏览器源码及构建产物通过；[PR #600 最终 CI](https://github.com/bubkoo/html-to-image/actions/runs/41383042526)、[CodeQL v4](https://github.com/bubkoo/html-to-image/actions/runs/41383042568)、Codecov 均在 `ba99c76` 通过。此前 `foreignObject` 用例首次运行同时遇到一次既有视频对图测试失败，重跑通过，视频路径的偶发性尚未定位。Playwright WebKit 与原生 Safari/iOS 是不同验证环境。
- CI 已改用 `pull_request`，在测试前核对实际检出 SHA 和测试合并提交的第二父提交；[历史 PR #598 的 job 日志](https://github.com/bubkoo/html-to-image/actions/runs/36932597879/job/110605311820) 显示测试主分支、覆盖率却归给 PR。[PR #600 的最终工作流](https://github.com/bubkoo/html-to-image/actions/runs/41383042526) 对包含最终 PR head 的测试合并提交完整通过。合并前旧 `master` 的 `pull_request_target` 工作流也曾运行并测试旧代码；V2 的新主分支不再启用该事件。
- 旧工作流仍在上传主分支覆盖率，而 PR 工作流原先没有上传，导致 Codecov 曾报出 64.88% 的改动行覆盖率及与主分支相同的项目覆盖率。新工作流用 OIDC 上传实测报告后，Codecov 两项检查均通过，改动行覆盖率为 80.00%、项目覆盖率约 78.8%。[首次父提交校验失败](https://github.com/bubkoo/html-to-image/actions/runs/40830886954) 是因为 `actions/checkout` 默认浅克隆缺少父提交；深度 2 已在后续 CI 验证通过。
- 回复时写清“已合并到 `master`、尚未发布到 npm”，附对应测试和未覆盖场景；在实际 npm 发布及目标环境复测前，不写“已在发布版本修复”或 `Closes #...`。

## 2026-11-11 混合滚动补充

#408 / #345 / #594：直接文本或行内节点曾触发不保留 scrollTop 的回退。候选用副本伪元素表达限定纵向块布局的流偏移，不包装真实子节点；结构选择器、源 important 规则和负边距都有独立对照。14 种输入 × 三引擎在旧源码全部 42 项失败、源截图对照全通过，候选 42 项通过。完整检查 234/344/123（另 1 项既有 GC 跳过）；源码 `42e8012` 真实 iPhone Safari 完整 25/25 通过；#630 已合入 master（7169372），PR/主分支 CI、CodeQL 与 PR Codecov 全部通过，见 [证据](evidence/mixed-scroll.json)。横向/斜向混合文字、绝对定位和原生滚动条外观仍有限制，不按整个旧 PR/Issue 已解决处理。

#451：`b9f2dfd` 的真实 iPhone 暂停视频验证补齐，默认和稳定化输出均保留 object-fit:contain 的紫色留白及中心帧，源不变。输入为带正确 MIME 的 Blob，限定范围和初始输入故障见 [原始记录](evidence/ios-video-aspect-b9f2dfd.json)；不推广为 HTTP 播放/CORS 或所有适配模式验证。

#585 的其余设计取舍：保留旧 boolean filter（根不调用）及 backgroundColor；不自动改成 keep/unwrap/remove 或删除旧入口。结构变换可显式用 onClone，但不等同于原方案的 live reflow 后重新计算样式/尺寸。V2 维度仍来自显式输出值或源尺寸回退，当前不提供隐式 auto-height。跨捕获 Cache 类没有引入；保留单次资源生命周期与调用者 resolver 原语。默认完整 URL 身份、等待 decode、命名空间和实际像素缓冲区已有对应回归；通用 iOS 延时、页面 CSS 模式与批量 CSS 写入不整体移植，分别保留原场景/输出语义/性能边界。


### 横向 fixed 初版（由下方二维 flex 扩展取代）

#408/#345 剩余边界复现：单行横向 flex 中，给普通包装子元素加 transform 会改变深层 fixed 的定位参照。最终 12 输入 × 三引擎的源截图控制全部有效，旧源码 33 项失败 / 3 项通过。候选用保持外部主轴尺寸的相反侧边距表达位移，仅调整原参照为当前滚动容器的 fixed/absolute inset；没有新增包含块。加原有 fixed 用例定向 126 通过，完整/真机/远端状态见[证据](evidence/horizontal-fixed-scroll.json)。对角、自动侧边距、多行 flex、匿名文本及 sticky 等仍不在此结论内，不作为整个旧 PR 完成。


## 当前验收缺口复核

GitHub 当前的 28 个旧 PR 均仍开放，head 与逐项已读版本一致；索引内证据文件全部存在，详见[复核记录](evidence/open-pr-current-audit.json)。#443 的受控双源并非缺失测试：私有图无凭据返回 401、全局 include 访问公开跨源资源失败作为负对照；按 URL/kind 分配凭据后，实际图像/字体像素和服务端 Cookie 记录均通过，原业务登录 URL/完整应用才是未取得条件。

[#632](https://github.com/bubkoo/html-to-image/pull/632) 源码 c373dcd、受检 head 4d1bd59 的 CI/CodeQL/Codecov 已通过；[#633](https://github.com/bubkoo/html-to-image/pull/633) 源码及受检 head b4d8d23 的 CI/Codecov 已通过，294/524/135 与本地一致，另有 1 项既有 GC 跳过。#633 当前以 #632 分支为 base，仓库 CodeQL 只针对 master，转向主分支后仍需该检查；本节保留上述受检 head，后续文档提交以 PR 当前检查为准。两项均未合并、均没有当前真机通过记录，不以历史 26/26 替代。

剩余明确条件：

- 真机：#632 完整 28/28 与六种源字体控制、#633 完整 29/29 与 55 种全像素源对照已通过。#398 仍需手动网络可达后的可信点击和清理。
- SVG 输出：#585/#427 在“当前浏览器实际页面”和“统一外部文件定义”之间确定目标，现有矩阵已证明二者并不相同。
- 滚动条保真：#345 原帖已要求轨道/滑块外观和位置，无需另选范围；#408 还关联 #81 的段落双向滚动，现有部分覆盖不足以宣称整体完成。

以上不是目标完成声明；原应用 fixture 的具体缺失条件仍按各 PR 的边界保留，不新增未授权的关闭、评论或 npm 发布。


## 二维 flex 定位后代扩展候选

#633 的初版只修横向单行，但同一“普通项目新增 transform 改变 fixed/absolute 包含块”的根因仍存在于斜向、纵向、列布局和换行。现按两个滚动轴分别施加和为零的一对物理边距，保持项目外部尺寸和 flex 行分配，不新增包含块；定位后代仍按原 offsetParent 调整 inset。

最终同一 34 输入 × 三引擎：原父版本 4d1bd59 为 90 失败 / 12 通过，初版 7d66cb4 仍有 57 失败 / 45 通过，原生源控制均有效；候选的 102 项逐一比较完整 40×40 图像的 6400 个 RGBA 通道，全部相同，含原有 fixed 对照定向 192 通过。本地完整 coverage/source/package 为 316/590/135，另 1 项既有 GC skip，lint/构建/类型/tarball 均通过。[证据](evidence/horizontal-fixed-scroll.json)明确区分 b4d8d23 的历史横向 PNG 与本次完整源像素测试。

该候选支持 horizontal-tb 下 flex 的行/列/反向/换行/RTL、center/baseline 对齐及 absolute-only；非 flex、位移轴未解析 auto 边距、匿名文本/contents/生成项目、sticky、竖排、任意捕获根偏移和原生滚动条仍保留边界。新的远端检查和真实 iPhone 结果待验，不能沿用上一版通过数；#632/#633 未合并，不发布 npm。


## 普通块流与定位参照扩展候选

#633 继续处理普通块布局：沿用不会折叠的 before 纵向流偏移，组合横向相反边距，移动实际流盒及受支持 block before/after；定位后代按原 offsetParent 处理，真实子节点不包装、不重排。库插入的伪元素样式节点不作为内容流盒。新增 WeakSet 记录已克隆源元素，源映射清理和 dispose 一并清理，保留文档生命周期约束。

最终 55 输入 × 三引擎，165 个完整 40×40 原生源/导出图在 6400 个 RGBA 通道上零容差相同。恢复 clone-scroll.ts/task.ts 的原始父版本 4d1bd59 为 141 失败 / 24 通过，恢复上一 flex 候选 f3f997e 为 51 失败 / 114 通过；源控制全部有效，只接受完整 165 项、无浏览器未处理错误的运行。含旧 fixed/mixed 对照定向 297 通过，完整 coverage/source/package 为 337/653/135，另 1 项既有 GC skip，lint/构建/类型/tarball 均通过。[当前证据](evidence/positioned-scroll.json)与[重放](evidence/horizontal-fixed-scroll-replay.md)已更新；旧 horizontal JSON 明确标记 f3f997e 历史范围。

全量检查保留未克隆 absolute 包含块的原回退：捕获树外原点尚未重建，不能直接套当前容器偏移。水平匿名文本/inline/contents/float/sticky、未解析 auto 边距、部分伪元素、竖排、其他捕获根坐标和原生滚动条仍未完整覆盖。

[不滚动渐变观察](evidence/gradient-native-precision.json)另外验证：WebKit 源页面及原生计算样式往返为 [0,128,0,255]，库和完全手写 foreignObject 都为 [0,128,1,255]，最大通道差 1；Chrome/Firefox 为零。定位标记改为实色硬边界，仍严格比较全部像素；没有把渐变记为逐字节相同或实现通用校正。该观察探针是独立归档，不进入 CI 回归计数。

本版最新 PR head 的远端检查和真机待验；Mac 尚未识别原 USB iPhone，不沿用旧 26/26。#632/#633 未合并，不关闭旧 PR，不发布 npm。


## 2026-11-11 重连后的准确提交真机验收

#632 的准确 head 4d1bd59 重建后，真实 USB iPhone Safari（iOS 18.7、Safari 26.6.1、DPR 3、非模拟器）完整 28/28 通过；六种 SVG 字体入口的实际源截图、自动/显式红色字形、skipFonts 白色负对照及源不变控制全部通过。[原始报告](evidence/ios-safari-svg-transforms-4d1bd59.json)与[字体源截图](evidence/ios-native-font-4d1bd59.json)已归档。PR CI/CodeQL/Codecov 通过，#632 已合入 master 67b2ec2。

#633 的准确 head 9584645 重建后，真机完整 29/29 通过；另先截 55 种实际源元素，再捕获，每个 40×40 图像的 6400 个 RGBA 通道零容差一致，源 DOM/滚动不变。[原始报告](evidence/ios-safari-positioned-scroll-9584645.json)、[55 种源截图](evidence/ios-native-positioned-9584645.json)与[重放](evidence/ios-native-source-replay.py.txt)已归档。Safari 元素截图可能包含裁剪外的变换后代，因此按 DPR 裁取源视口；整张溢出图缩小造成的早期源控制失败不计入通过数。重放到新主分支后源码/fixture 字节一致，真机记录保留原始 revision；最终主分支目标的远端检查及合入状态另行记录。

#398 自动 USB 页面可生成 96×60 PNG，但退出自动化后，手动 Safari 无法访问 USB 和同一 Wi-Fi 地址。可信点击、新标签和清理仍待网络可达后验收，未用合成点击替代。

原需求复核：#408 关联 [#81](https://github.com/bubkoo/html-to-image/issues/81) 与 [#345](https://github.com/bubkoo/html-to-image/issues/345)。#81 的关闭来自 stale 机器人，不等于修复；其原 sandbox API 为 HTTP403、预览为 HTTP400。#345 已明确要求颜色、尺寸、轨道/滑块外观和位置，撤回此前要求用户缩减范围的选择。现有部分布局修复不等于两个 Issue 整体解决。
