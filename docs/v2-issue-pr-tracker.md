# V2 Issue / PR 回应台账

更新于 2026-10-29。用途是准备后续 Issue 和 PR 回复；这里记录**当前分支的事实**，不代表已合并或已发布。工作分支为 `codex/v2-capture-architecture`，基于 `e842e84`。测试与修复项的完整对应关系见 [v2-regressions.md](v2-regressions.md)。

“本地覆盖”只表示所列场景在当前分支有对应回归并通过本地验证；“部分覆盖”表示不能按原帖的全部范围宣称解决。回复前应重新核对分支代码、测试结果和远端 CI。

当前草稿为 [PR #600](https://github.com/bubkoo/html-to-image/pull/600)。首次 `pull_request` CI 对包含 `ebe06a2` 的测试合并提交运行，因下拉框固定参考图的 Linux 字体差异失败；修复后的 `853d76f` 在 [run 40830152086](https://github.com/bubkoo/html-to-image/actions/runs/40830152086) 完整通过 Karma、三浏览器行为和构建产物测试。`pull_request` 默认检出测试合并提交；核对其第二父提交时首次遇到 checkout 默认浅克隆缺少父提交，已将检出深度设为 2，等待重跑。

| 对应讨论 | 原问题与根因 | 当前分支已做的事 | 证据和回复边界 |
| --- | --- | --- | --- |
| [Issue #562](https://github.com/bubkoo/html-to-image/issues/562) | 发布的 ESM 文件保留无扩展名相对导入，浏览器原生模块和 Node ESM 无法解析。 | 源码内部使用 `.js` 导入，生成 `es/package.json`，设置 ESM/CJS 条件导出。 | **本地覆盖**：`test:package` 将实际压缩包装进临时项目，验证 ESM、CJS、UMD、类型与文件清单；`test/browser/package.spec.ts` 在 Chromium、Firefox、WebKit 加载构建后的 ESM 和 UMD，并核对输出像素。正式发布后的消费场景仍待验证。 |
| [Issue #553](https://github.com/bubkoo/html-to-image/issues/553) | `toPixelData` 按 CSS 尺寸读取像素，高设备像素比时裁掉画布右侧和底部。 | 从实际画布宽高读取完整像素缓冲区；旧入口复用同一实现。 | **本地覆盖**：`renderer.spec.ts` 的非 1 像素比尺寸、缓冲区长度和末端像素断言。原帖的 Mapbox/Firefox 场景未复测。 |
| [Issue #543](https://github.com/bubkoo/html-to-image/issues/543) | iframe 的 body 在特殊克隆步骤和通用子节点步骤中各复制一次。 | iframe body 完成特殊克隆后不再进入第二次子节点递归。 | **本地覆盖**：`renderer.spec.ts` 验证同源 `iframe.srcdoc` 的内容恰好出现一次。跨域 iframe 不在该结论内。 |
| [Issue #578](https://github.com/bubkoo/html-to-image/issues/578) | HTML 文本中的 XML 1.0 非法控制字符进入 SVG，导致后续图像加载失败。 | SVG 序列化后移除非法控制字符，不改动源 DOM 文本。 | **本地覆盖**：`renderer.spec.ts` 验证含 SOH 的输出可解析，源文本保留。原帖 Edge 环境尚未复测。 |
| [Issue #594](https://github.com/bubkoo/html-to-image/issues/594) | 嵌套滚动容器的 `scrollTop`/`scrollLeft` 是运行时状态，序列化的副本丢失可见位置。 | 在副本中表达内容位移和裁剪；保留源节点的滚动状态。直接位于顶部的 sticky 标题保留原位与绘制层级，普通内容仍按滚动量位移。 | **部分覆盖**：`scroll.spec.ts` 验证纵向、横向、已有子元素变换和混合直接文本回退；新测试在 Chromium、Firefox、WebKit 核对单层、双层滚动与直接 sticky 标题的像素和源状态，本机 Safari 单层冒烟也通过。原帖完整 Windows 复现、RTL、其他 sticky/fixed 布局尚未验证。 |
| [Issue #515](https://github.com/bubkoo/html-to-image/issues/515) / [PR #583](https://github.com/bubkoo/html-to-image/pull/583) | SVG 被整体深拷贝，`filter` 无法访问 `foreignObject` 等后代。 | SVG 后代也走可筛选的递归克隆。 | **本地覆盖**：`renderer.spec.ts` 和跨浏览器新测试直接验证 `foreignObject` 后代被 `filter` 排除；尚未跑原帖的完整 SVG fixture。 |
| [PR #595](https://github.com/bubkoo/html-to-image/pull/595) | 样式属性列表缓存在全局，首次捕获的选项泄漏到后续捕获。 | 样式选择归属单次捕获；显式空数组和伪元素选择按各次选项处理。 | **本地覆盖**：`renderer.spec.ts` 的并发选项、冻结选项、伪元素 CSS 回归。此分支是独立实现，不应说已合并该 PR。 |
| [PR #596](https://github.com/bubkoo/html-to-image/pull/596) | `url(#id)` 被当作可请求资源，可能错误获取当前页面并替换片段引用。 | 保留仅含片段的 CSS URL，不发起资源请求。 | **本地覆盖**：`renderer.spec.ts` 的片段保留/不请求断言。**不覆盖** Issue #579 的绝对同文档 URL 归一化。 |
| [PR #589](https://github.com/bubkoo/html-to-image/pull/589) | 图片已加载但 `decode()` 拒绝时，旧 `createImage` Promise 永久悬挂。 | 将可用图片的解码拒绝视为可继续，并让异步路径有确定的完成/失败。 | **本地覆盖**：`renderer.spec.ts` 验证解码拒绝后导出仍完成；iPhone 内存压力场景未复测。 |
| [PR #590](https://github.com/bubkoo/html-to-image/pull/590) | `toBlob` 丢弃调用者指定的 MIME 和质量。 | 旧入口向画布编码传递 `type`、`quality`，包括 `quality: 0`。 | **本地覆盖**：`renderer.spec.ts` 验证 JPEG Blob 类型和传给浏览器的质量参数。 |
| [PR #591](https://github.com/bubkoo/html-to-image/pull/591) / [Issue #488](https://github.com/bubkoo/html-to-image/issues/488) | WebKit 首次栅格化大图可能透明；预先 `decode()` 不能证明 SVG `foreignObject` 已绘制。 | 可选 `stabilizationAttempts` 对同一冻结 SVG 重绘，默认仍为 1 次。 | **部分覆盖**：模拟首次空白的像素回归；构建产物的大图标记测试在 Chromium、Firefox、WebKit 通过；本机 Safari 26.5.2 随机 800×800 PNG 首次透明、3 次后中心像素正确。实现语义不是 PR #591 的“连续两次结果相同才停止”；SVG 图片、跨域、所有 iOS/WebKit 场景未验证。 |
| PR #600 CI 中发现的下拉框问题 | 固定 PNG 参考图受 Linux 系统字体绘制影响；旧克隆逻辑只查显式 `value` 属性，会丢失运行时选择，并无法区分重复值选项。 | 下拉框测试改查选择语义和同环境像素变化；克隆按每个源选项的实际选中状态同步。 | **CI 覆盖**：`select.sepc.ts` 的 3 个 fixture、运行时切换、重复值、过滤前置选项用例；[首次失败](https://github.com/bubkoo/html-to-image/actions/runs/40829694424) 后，[修复提交完整通过](https://github.com/bubkoo/html-to-image/actions/runs/40830152086)。 |

## 尚不能宣称解决

| 对应讨论 | 当前边界 |
| --- | --- |
| [PR #592](https://github.com/bubkoo/html-to-image/pull/592) | 当前图片路径会等待数据 URL 图片加载，并覆盖 `decode()` 拒绝，但尚无与该 PR 所列数据 URL 时序完全对应的独立回归；不能宣称完整吸收其所有修复。 |
| [PR #597](https://github.com/bubkoo/html-to-image/pull/597) / [Issue #457](https://github.com/bubkoo/html-to-image/issues/457) | 新 `onClone` 和插件能修改冻结副本，但没有该 PR 的逐节点 `onCloneNode(original, copy)` API；只可说明提供了另一种捕获级定制路径。 |
| [PR #598](https://github.com/bubkoo/html-to-image/pull/598) | 当前修复了样式选项隔离，但未实现 `stylePropertiesForNode` 按元素选择属性；不可把 PR #595 的修复当作 PR #598 已完成。 |
| [Issue #579](https://github.com/bubkoo/html-to-image/issues/579) | `url(#id)` 保留已覆盖；`url(https://当前页面#id)` 和 `url(/当前页面#id)` 归一化未实现。 |
| [Issue #556](https://github.com/bubkoo/html-to-image/issues/556) / [Issue #569](https://github.com/bubkoo/html-to-image/issues/569) | iOS 下载/分享空白与笼统的 Safari 失效报告缺少同场景验证；本机 Safari 大图修复不能外推。 |

## 回复前的证据闸门

- 当前本地结果：旧 Chrome Headless 套件 **104 通过、0 跳过**；新浏览器行为测试 **15 通过**、构建产物测试 **15 通过**（两者均覆盖 Chromium、Firefox、WebKit）；构建、`test:package` 和新测试文件的 lint 通过。构建产物测试验证 UMD 浏览器渲染、PNG 解码像素和真实跨源 CSS 权限失败后的回退；旧参考图对比增加 1% 面积上限。此前 `foreignObject` 用例首次运行同时遇到一次既有视频对图测试失败，重跑通过，视频路径的偶发性尚未定位。Playwright WebKit 与原生 Safari/iOS 是不同验证环境。
- CI 已改用 `pull_request`，在测试前核对实际检出 SHA；[历史 PR #598 的 job 日志](https://github.com/bubkoo/html-to-image/actions/runs/36932597879/job/110605311820) 显示测试主分支、覆盖率却归给 PR。[PR #600 的新工作流](https://github.com/bubkoo/html-to-image/actions/runs/40830152086) 对包含 `853d76f` 的测试合并提交完整通过。`master` 上旧 `pull_request_target` 工作流也会运行，不能将其同名 `ci` 检查当作 PR 代码的测试结果。旧工作流仍在上传主分支覆盖率，而 PR 工作流原先没有上传，导致 Codecov 对 PR #600 报出 64.88% 的改动行覆盖率及与主分支完全相同的项目覆盖率；新工作流将使用 OIDC 上传实际 PR 覆盖率，待远端验证。
- [首次父提交校验失败](https://github.com/bubkoo/html-to-image/actions/runs/40830886954) 的原因是 `actions/checkout` 默认浅克隆只含当前提交。检出深度已设为 2；需在下一次 CI 验证校验及覆盖率上传。
- 回复时写清“当前分支已实现/本地验证”，附对应测试和未覆盖场景；在实际合并、发布及目标环境复测前，不写“已在发布版本修复”或 `Closes #...`。
