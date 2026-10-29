# 测试架构迁移

V2 的主要风险发生在浏览器真实渲染和发布包解析阶段。当前采用三层证据，旧 Karma 套件暂时并行：

| 层 | 入口 | 验证什么 |
| --- | --- | --- |
| 既有回归 | `pnpm test` | 现有 Jasmine/Karma 用例与覆盖率；迁移期间防止行为倒退。 |
| 浏览器行为 | `pnpm run test:browser:source` | Vitest Browser Mode 在 Chromium、Firefox、WebKit 中直接导入源码，检查 DOM/SVG/像素行为。 |
| 构建产物 | `pnpm run test:package` 和 `pnpm run test:browser:package` | Node 中实际打包并离线安装到临时项目，检查 ESM/CJS/UMD、类型和打包清单；Playwright 经原样静态服务器加载构建后的 ESM 和 UMD，检查浏览器真正得到的产物和像素。 |

开发机运行浏览器测试前，先用 Node 22.12+ 或 24 安装依赖，执行 `pnpm exec playwright install`。`pnpm run test:browser` 会检查 lint、构建并运行两层浏览器测试；单独运行 `test:browser:package` 时要先构建。CI 使用 Node 24、固定 pnpm 8 和冻结锁文件，在 `pull_request` 上顺序运行以上全部检查，并在测试前核对检出 SHA。

首批迁移的高风险场景：原生 ESM 导入、嵌套滚动的可见位置、大尺寸 data URL 图片的稳定化输出，以及 SVG `foreignObject` 的过滤。`test/browser/smoke.html` 保留无参数时的人工冒烟；`?case=` 让 Playwright 为每个场景使用独立页面。

测试断言优先检查输出像素、SVG 内容、资源请求和源 DOM 是否保持不变。大图使用随机内容避免缓存掩盖首次加载问题，固定中心绿色标记用于像素断言。不要仅以 Promise 成功或非空 data URL 判断图片正确。整图快照仅适合字体、浏览器版本和运行系统都固定的少量场景。

Playwright 的 Linux WebKit 并非 Apple Safari；本机 Safari 与真实 iOS 的确认仍是发布前的独立验收。旧套件的 4 项跳过已替换为实际运行的 canvas、Shadow DOM 和 CSS 加载失败回归，当前没有跳过项。迁移完成后再考虑把 `pnpm test` 切换到新入口。

## 同类项目对照与本项目核验（2026-10-28）

- [html2canvas 的 Playwright reftests](https://github.com/html2canvas/html2canvas/blob/master/tests/visual/reftests.spec.ts) 遍历 HTML fixture，等待字体，检查画布可读，再比较各浏览器的 PNG 基线；其 [配置](https://github.com/html2canvas/html2canvas/blob/master/playwright.config.ts) 固定视口和比较阈值。适合覆盖整体排版，但基线依赖运行系统、字体和浏览器版本。
- [snapdom 的浏览器测试配置](https://github.com/zumerlab/snapdom/blob/main/vitest.config.js) 用 Chromium、Firefox、WebKit 运行行为和视觉测试，并确保视觉测试使用新构建的 `dist`；其 [大图用例](https://github.com/zumerlab/snapdom/blob/main/__tests__/exporter.largeImage.test.js) 读取文件尺寸及多个关键位置像素。适合验证特定故障，尤其能指出哪个区域错误。

当前方法方向正确：源码用例验证可观察行为，发布包用例验证真实浏览器消费，断言检查尺寸、内容、像素及源 DOM 状态。此次核验补上了 PNG 解码后的红色像素、随机大图各位置的确定颜色块、UMD 在三浏览器的实际渲染，以及旧 fixture 的 404、坏图和尺寸不符快速失败。随机纹理用于触发大图时序问题；不能把缩放后的随机像素与原图逐点要求完全相等，因为浏览器会插值。

此次补齐将旧 `pixelmatch` 的固定 100 像素门槛增加 1% 面积上限，并用小图 20 个错误像素的失败用例验证。旧 canvas 用例改查真实输出像素，开放 Shadow DOM 改用本地自定义元素验证，CSS 失败用例改为确定的本地 404；三浏览器新增真实跨源 CSS：样式可用、CSSOM 被拒绝、导出像素正确且有资源诊断。两层嵌套滚动的可见像素和源滚动值也有三浏览器回归。

当前还用失败对照确认了直接置顶 sticky 标题的滚动错误，并修复该限定场景。仍未覆盖真实 iOS、跨域图片的资源策略、字体排版差异，以及其他 sticky/fixed 与滚动容器组合的视觉语义。对后两项先用独立 fixture 定义预期，再决定是否引入少量固定 Linux 环境的整图基线；不能从本次基础场景推断所有复杂布局正确。
