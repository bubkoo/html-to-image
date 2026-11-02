# 测试架构

V2 的主要风险发生在浏览器真实渲染和发布包解析阶段。Karma/Jasmine 已移除，原有 115 个回归用例改由 Vitest Browser Mode 在 Chromium 运行；新的高风险行为用例继续在 Chromium、Firefox、WebKit 运行。三层证据如下：

| 层 | 入口 | 验证什么 |
| --- | --- | --- |
| 既有回归与覆盖率 | `pnpm run test:coverage` | Vitest Chromium 运行迁移后的 115 个回归及 23 个新行为用例，并生成唯一的 `test/coverage/lcov.info`。 |
| 浏览器行为 | `pnpm run test:browser:source` | 23 个 Vitest Browser Mode 用例在 Chromium、Firefox、WebKit 中直接导入源码，检查 DOM/SVG/像素行为。 |
| 构建产物 | `pnpm run test:package` 和 `pnpm run test:browser:package` | Node 中实际打包并离线安装到临时项目，检查 ESM/CJS/UMD、类型和打包清单；Playwright 经原样静态服务器加载构建后的 ESM 和 UMD，检查浏览器真正得到的产物和像素。 |

开发机运行浏览器测试前，先用 Node 22.12+ 或 24 安装依赖，执行 `pnpm exec playwright install`。`pnpm test` 运行 Chromium 的完整源码覆盖率与三引擎行为测试；`pnpm run test:browser` 还检查 lint、构建、类型和发布包。单独运行 `test:browser:package` 时要先构建。CI 使用 Node 24、固定 pnpm 8 和冻结锁文件，在 `pull_request` 上顺序运行以上检查，并在测试前核对检出 SHA。Codecov 与 Coveralls 均使用 Vitest 生成的同一份 LCOV。

旧用例保留原 fixture、断言和文件归属；回调式完成信号已改成原生 `async`，Jasmine spy 与异步匹配器已改为 Vitest API。测试入口统一为 `*.test.ts`。旧回归只在 Chromium 运行，因为其固定 PNG 参考图与字体、浏览器像素实现耦合；跨浏览器风险由独立的语义、关键像素和发布包用例验证。`vitest.browser.config.mts` 预优化 `pixelmatch`，防止首次冷启动时依赖优化重载测试页。

首批迁移的高风险场景：原生 ESM 导入、嵌套滚动的可见位置、大尺寸 data URL 图片的稳定化输出、canvas 快照像素，以及 SVG `foreignObject` 的过滤。`test/browser/smoke.html` 无参数时运行全部场景并把结果保存到 Mac 的 `test-results/mobile-smoke-reports/`；`?case=` 让 Playwright 为每个场景使用独立页面。完整页面及报告回传在三种桌面浏览器自动检查，真实 iOS 仍须单独验收。

测试断言优先检查输出像素、SVG 内容、资源请求和源 DOM 是否保持不变。大图使用随机内容避免缓存掩盖首次加载问题，固定中心绿色标记用于像素断言。不要仅以 Promise 成功或非空 data URL 判断图片正确。整图快照仅适合字体、浏览器版本和运行系统都固定的少量场景。

Playwright 的 Linux WebKit 并非 Apple Safari；本机 Safari 与真实 iOS 的确认仍是发布前的独立验收。旧套件的 4 项跳过已替换为实际运行的 canvas、Shadow DOM 和 CSS 加载失败回归，当前没有跳过项。

主分支切换的实际闸门、真实 iOS 验收页与 npm 分离发布顺序见 [V2 release readiness](v2-release-readiness.md)。Release 工作流通过手动触发复用本 CI，并在发布前再次检查构建包和预期版本。

迁移前的 TypeScript 5.5.4 试验曾使 `karma-typescript` 执行 0 个用例并报 `exports is not defined`。本次移除 Karma 后，TypeScript 与构建工具的升级仍应单独进行，以便定位新工具链的兼容性问题。覆盖率提供方从 Karma Istanbul 切换到 Vitest V8，行与分支的统计口径不同，不能仅比较两个报告的总百分比；远端 Codecov 的 patch/project 结果仍须按最终 PR SHA 验收。

## 同类项目对照与本项目核验（2026-10-28）

- [html2canvas 的 Playwright reftests](https://github.com/html2canvas/html2canvas/blob/master/tests/visual/reftests.spec.ts) 遍历 HTML fixture，等待字体，检查画布可读，再比较各浏览器的 PNG 基线；其 [配置](https://github.com/html2canvas/html2canvas/blob/master/playwright.config.ts) 固定视口和比较阈值。适合覆盖整体排版，但基线依赖运行系统、字体和浏览器版本。
- [snapdom 的浏览器测试配置](https://github.com/zumerlab/snapdom/blob/main/vitest.config.js) 用 Chromium、Firefox、WebKit 运行行为和视觉测试，并确保视觉测试使用新构建的 `dist`；其 [大图用例](https://github.com/zumerlab/snapdom/blob/main/__tests__/exporter.largeImage.test.js) 读取文件尺寸及多个关键位置像素。适合验证特定故障，尤其能指出哪个区域错误。

当前方法方向正确：源码用例验证可观察行为，发布包用例验证真实浏览器消费，断言检查尺寸、内容、像素及源 DOM 状态。此次核验补上了 PNG 解码后的红色像素、随机大图各位置的确定颜色块、UMD 在三浏览器的实际渲染，以及旧 fixture 的 404、坏图和尺寸不符快速失败。随机纹理用于触发大图时序问题；不能把缩放后的随机像素与原图逐点要求完全相等，因为浏览器会插值。

此次补齐将旧 `pixelmatch` 的固定 100 像素门槛增加 1% 面积上限，并用小图 20 个错误像素的失败用例验证。旧 canvas 用例改查真实输出像素，开放 Shadow DOM 改用本地自定义元素验证，CSS 失败用例改为确定的本地 404；三浏览器新增真实跨源 CSS：样式可用、CSSOM 被拒绝、导出像素正确且有资源诊断。两层嵌套滚动的可见像素和源滚动值也有三浏览器回归。

PR #600 的首次 Linux CI 暴露出下拉框固定 PNG 参考图的系统字体差异：仅第二个选项有 46/4000 像素不同，超过 1% 门槛。下拉框回归因此改为检查 SVG 中选中项、输出非空像素，以及同一浏览器内切换选项前后的像素变化。排查同时发现旧克隆逻辑只查显式 `value` 属性，不能同步运行时选择；现在按源 `option` 的实际 `selected` 状态同步，并增加重复值和过滤前置选项用例。对排版本身的回归仍需固定浏览器、字体和系统环境后才适合使用参考图。

当前还用失败对照确认了直接置顶 sticky 标题的滚动错误，并修复该限定场景。仍未覆盖真实 iOS、跨域图片的资源策略、字体排版差异，以及其他 sticky/fixed 与滚动容器组合的视觉语义。对后两项先用独立 fixture 定义预期，再决定是否引入少量固定 Linux 环境的整图基线；不能从本次基础场景推断所有复杂布局正确。

Issue #579 的同文档 `clip-path` 测试先在未修复的 Chromium 中得到 3 项失败：SVG 属性、内联样式和根相对 URL 都未变成本地片段。修复后，三浏览器的源码测试检查 SVG 内容、红绿裁剪像素与源 DOM，构建产物测试再检查实际 ESM 的像素；不同 origin、路径或查询参数的 URL 保持原样。URL 是否属于当前文档按源 `Document.URL` 比较，避免把其他页面的同名 `#id` 误认成本地定义。
