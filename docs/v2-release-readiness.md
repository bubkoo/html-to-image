# V2 主分支切换闸门

本页记录可复核的切换条件。决策：先把通过验收的 V2 切换为 `master`，npm 另行发布；真实 iPhone/iPad Safari 必须在切换前通过。发布命令仅在单独的手动工作流中执行。

## 版本身份

- 当前 npm `latest`：`html-to-image@1.11.13`；发布源码由 `v1.11.13` 标记，提交为 `995728147e4459a58188af51b5fcc3f8a7010207`。
- 原 `master`：`e842e84cf68493f39dcb76f0a879d02d174b3edb`，比 npm 发布源码多 26 个提交（主要是贡献者/文档更新）；已原样保存在远端 `archive/pre-v2-master`。切换前后都要核对该分支不变。
- V2 工作分支：`codex/v2-capture-architecture`，对应草稿 [PR #600](https://github.com/bubkoo/html-to-image/pull/600)。

## 必须通过的条件

| 条件 | 现在的证据 | 切换前还需完成 |
| --- | --- | --- |
| 架构契约与兼容入口 | `createRenderer` / `capture` 的冻结、复用、释放、插件顺序和资源隔离已有源码回归；旧 `toPng` 等入口保留。 | 用实际应用 fixture 复核 SVG、Shadow DOM、iframe、滚动与字体；明确不支持的布局和异常行为。 |
| 每项修复的回归 | [变更与测试映射](v2-regressions.md) 记录了当前已修复项；Issue #601 有失败对照和跨浏览器像素验证。 | 所有新纳入 V2 的缺陷先补失败用例，再修复并更新 [Issue/PR 台账](v2-issue-pr-tracker.md)。 |
| 三引擎及发布包 | 本地 Karma 109、Vitest Browser Mode 45、构建包 Playwright 30 均通过；实际 npm 压缩包的 ESM/CJS/UMD/类型检查通过。完整移动端验收页也在三种桌面浏览器自动运行并检查全部八项结果。[PR #600 CI](https://github.com/bubkoo/html-to-image/actions/runs/41381953888)、[CodeQL v4](https://github.com/bubkoo/html-to-image/actions/runs/41381953847) 和 Codecov 两项检查已在 `4b17399` 通过。 | 最终切换提交的自动 CI 与安全检查也须通过。 |
| 真实 Apple 移动端 | 目前只有桌面 WebKit 和本机 Safari 的局部证据。 | 在真实 iPhone/iPad Safari 对最终构建的 ESM/UMD 跑图片、滚动、裁剪、大图空白、重复响应头等用例，记录机型、iOS/Safari 版本、结果与截图或日志。模拟器不替代此项。 |
| 性能与资源 | [400 节点基线复核](v2-performance.md)显示三引擎 PNG 像素和尺寸正确；Chromium 约慢 12–18%，Firefox/WebKit 多轮接近基线；Chromium 垃圾回收后 20 与 100 次导出的 JS 堆增量相近。 | 核对真实 iOS 的大图/压力表现；若稳定出现大幅退化，先定位根因。 |
| 发布流程 | `release.yml` 改为手动触发，复用完整 CI，发布前校验实际 npm 包、`master` SHA、预期版本和 npm 前一版本；旧自动发布入口已移除。 | GitHub 验证新工作流；切换时确认 `master` 推送只运行 CI/安全检查而不发布。npm 发布前审阅 semantic-release dry run 的预期 `2.0.0` 和版本说明。 |
| 依赖审计 | 公共 npm registry 的 `pnpm audit --prod` 对当前包报告 0 项；完整开发锁文件报告 140 项，其中 12 项严重。直接升至 TypeScript 5.5.4 会使旧 Karma 模块打包失效，试验已撤回。用户选择旧 Karma 回归并行运行，迁移另行推进。 | 发布前复核最终锁文件及开发工具链告警；旧 Karma 109 项与新浏览器测试必须继续同时通过。 |

## 切换和发布顺序

1. 以上条件全部有最终提交的证据，PR #600 解除草稿状态。若使用 squash merge，合并提交需保留 `BREAKING CHANGE` 信息；否则当前普通 `feat` 按共享规则只会规划次版本。手动发布工作流会用输入的预期版本阻止版本不符的发布。
2. 合并到 `master`，核对归档分支仍指向 `e842e84`，新 `master` 是已验收的 V2，自动 CI 和 CodeQL 通过，npm `latest` 仍是 1.11.13。
3. 单独决定 npm 发布时，在 `master` 手动运行 Release 工作流并输入预期版本；工作流重测同一 SHA、试算版本并核对 npm 前一版本，然后才发布。发布后核对 npm tarball、GitHub tag 和实际安装消费。

现在未达到第 1 步；不要提前更新 `master` 或声称 Issue 已在 npm 版本修复。

## 真实 iOS 验收页

在最终候选提交上先运行 `pnpm run build`，然后在 Mac 执行 `HTML_TO_IMAGE_SMOKE_HOST=0.0.0.0 node test/browser/server.mjs`。将 iPhone/iPad 与 Mac 放在同一局域网，用设备 Safari 打开 `http://<Mac 局域网 IP>:4173/test/browser/smoke.html`。页面依次运行实际构建 ESM/UMD、滚动、同文档裁剪、跨源 CSS、重复响应头及随机大图；每项打印 `PASS` 或 `FAIL`，最后打印 `DONE`，顶部记录浏览器 User-Agent 与 DPR。两个端口 4173 和 4174 均需可达。

验收记录至少包含候选提交 SHA、设备机型、iOS/Safari 版本、页面完整结果截图和首次大图与稳定化大图的中心像素。任一项失败即保留为阻塞项，先复现并补回归后再重新验收。服务只开放测试页面和构建产物路径，停止进程即关闭局域网访问。
