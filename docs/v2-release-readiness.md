# V2 主分支切换记录

本页记录可复核的切换条件和执行结果。通过验收的 V2 已于 2026-11-02 合并为 `master`；npm 另行发布，发布命令仅在单独的手动工作流中执行。真实 iPhone Safari 在切换前通过。

## 版本身份

- 当前 npm `latest`：`html-to-image@1.11.13`；发布源码由 `v1.11.13` 标记，提交为 `995728147e4459a58188af51b5fcc3f8a7010207`。
- 原 `master`：`e842e84cf68493f39dcb76f0a879d02d174b3edb`，比 npm 发布源码多 26 个提交（主要是贡献者/文档更新）；已原样保存在远端归档分支 `archive/v1.11.13`。该分支名按当时 npm 最新版本命名，指向的是发布后的原 `master`，与发布源码标签 `v1.11.13` 的提交不同。
- V2 源分支：`codex/v2-capture-architecture`，已通过 [PR #600](https://github.com/bubkoo/html-to-image/pull/600) 以 rebase 方式合并。合并后 `master` 为 `874bcac7956cad76735ec529294bc926d00a1ec0`，文件树与已验收的 PR head `ba99c76` 完全一致；`BREAKING CHANGE` 提交信息保留。

## 必须通过的条件

| 条件 | 已有证据 | 结果与边界 |
| --- | --- | --- |
| 架构契约与兼容入口 | `createRenderer` / `capture` 的冻结、复用、释放、插件顺序和资源隔离已有源码回归；旧 `toPng` 等入口保留。SVG、Shadow DOM、同源 iframe、滚动和字体均有专项回归。 | 已满足合并范围；复杂 RTL、sticky/fixed 组合和原帖完整应用 fixture 不在已验证范围。 |
| 每项修复的回归 | [变更与测试映射](v2-regressions.md) 记录了已修复项；Issue #601 有失败对照和跨浏览器像素验证。 | 已满足本次纳入 V2 的修复范围；后续新增缺陷继续先补回归并更新 [Issue/PR 台账](v2-issue-pr-tracker.md)。 |
| 三引擎及发布包 | 本地 Karma 109、Vitest Browser Mode 45、构建包 Playwright 30 均通过；实际 npm 压缩包的 ESM/CJS/UMD/类型检查通过。完整移动端验收页也在三种桌面浏览器自动运行并检查全部八项结果。[PR #600 最终 CI](https://github.com/bubkoo/html-to-image/actions/runs/41383042526)、[CodeQL v4](https://github.com/bubkoo/html-to-image/actions/runs/41383042568) 和 Codecov 两项检查在 `ba99c76` 通过。 | 合并文件树一致；`master` 推送的 CI 与 CodeQL 分别见 [CI](https://github.com/bubkoo/html-to-image/actions/runs/41383319334) 和 [CodeQL](https://github.com/bubkoo/html-to-image/actions/runs/41383319354)。 |
| 真实 Apple 移动端 | 用户确认的 iPhone 16 Pro 在 Safari 中对最终候选 `ba99c76` 完成 8/8 项，ESM、UMD、滚动、裁剪、跨源 CSS、重复响应头和大图均通过；自动报告 ID `268bced9-b6c1-4eab-9b43-d9959d6dcd56`。浏览器 UA 报 iOS 18.7、Safari `Version/26.6.1`，DPR 3。 | 已通过；合并后的 `master` 文件树与该候选完全一致。 |
| 性能与资源 | [400 节点基线复核](v2-performance.md)显示三引擎 PNG 像素和尺寸正确；Chromium 约慢 12–18%，Firefox/WebKit 多轮接近基线；Chromium 垃圾回收后 20 与 100 次导出的 JS 堆增量相近。真实 iPhone 16 Pro 的随机大图首次中心像素为空，稳定化后为预期的 `0,255,0,255`，四角标记断言通过。 | 若后续稳定出现大幅退化，先定位根因；当前大图可用性已通过。 |
| 发布流程 | `release.yml` 改为手动触发，复用完整 CI，发布前校验实际 npm 包、`master` SHA、预期版本和 npm 前一版本；旧自动发布入口已移除。合并推送没有触发 Release，npm `latest` 仍是 1.11.13。 | master 切换已完成；手动发布工作流尚未实际触发。npm 发布前审阅 semantic-release dry run 的预期 `2.0.0` 和版本说明。 |
| 依赖审计 | 公共 npm registry 的 `pnpm audit --prod` 对当前包报告 0 项；完整开发锁文件报告 140 项，其中 12 项严重。直接升至 TypeScript 5.5.4 会使旧 Karma 模块打包失效，试验已撤回。用户选择旧 Karma 回归并行运行，迁移另行推进。 | 发布前复核最终锁文件及开发工具链告警；旧 Karma 109 项与新浏览器测试必须继续同时通过。 |

## 切换和发布顺序

1. 已完成：最终候选通过，PR #600 解除草稿并采用 rebase 合并；`BREAKING CHANGE` 信息保留。手动发布工作流会用输入的预期版本阻止版本不符的发布。
2. 已完成：合并到 `master`，归档分支仍指向 `e842e84`，新 `master` 的文件树与已验收的 V2 相同，npm `latest` 仍是 1.11.13。
3. 单独决定 npm 发布时，在 `master` 手动运行 Release 工作流并输入预期版本；工作流重测同一 SHA、试算版本并核对 npm 前一版本，然后才发布。发布后核对 npm tarball、GitHub tag 和实际安装消费。

在 npm 实际发布前，不要声称 Issue 已在 npm 版本修复。

## 真实设备验收记录

2026-11-02，用户确认设备为 iPhone 16 Pro，并在 Safari 打开本机验收页。最终报告记录候选提交 `ba99c763eded8017a5748794a37ec6a7b291f4f8`、设备 UA `iPhone; CPU iPhone OS 18_7`、Safari `Version/26.6.1`、DPR 3、视口 980×1741。八项均为 `PASS`，无 `FAIL`；随机大图中心首次为 `0,0,0,0`，稳定化后为 `0,255,0,255`。原始 JSON 位于本机被 Git 忽略的 `test-results/mobile-smoke-reports/268bced9-b6c1-4eab-9b43-d9959d6dcd56.json`。报告自动附加服务端时间、提交 SHA 与请求地址；UA 和设备型号分别来自浏览器与设备持有人，不能当成设备硬件的加密证明。合并后 `master` 的文件树哈希同为 `a2601ccd980841533e68ededa2e1597ce8a6cb2b`。

旧 `master` 的 `pull_request_target` 工作流曾检出 `e842e84` 并在旧视频参考图上失败。该结果不能代表 V2；V2 的有效 CI 证据使用 `pull_request` 事件，核对其测试合并提交的 PR head。切换后旧工作流触发器不再存在。

## 真实 iOS 验收页

在最终候选提交上先运行 `pnpm run build`，然后在 Mac 执行 `HTML_TO_IMAGE_SMOKE_HOST=0.0.0.0 node test/browser/server.mjs`。将 iPhone/iPad 与 Mac 放在同一局域网，用设备 Safari 打开 `http://<Mac 局域网 IP>:4173/test/browser/smoke.html`。页面依次运行实际构建 ESM/UMD、滚动、同文档裁剪、跨源 CSS、重复响应头及随机大图；每项打印 `PASS` 或 `FAIL`，最后打印 `DONE`。完整运行会把 User-Agent、DPR、视口、各项结果和大图中心像素自动回传到 Mac 的 `test-results/mobile-smoke-reports/<id>.json`，同时记录服务器收到请求的地址、时间和候选提交 SHA。页面显示 `REPORT SAVED <id>` 才表示回传成功；`REPORT FAILED` 需要排查收集链路。两个端口 4173 和 4174 均需可达。

验收记录至少包含候选提交 SHA、设备机型、iOS/Safari 版本、全部测试结果和首次大图与稳定化大图的中心像素。自动报告保存这些结果；精确机型如不能从浏览器信息识别，由设备持有人补充。任一项失败即保留为阻塞项，先复现并补回归后再重新验收。服务只开放测试页面、构建产物和受限报告接收路径，停止进程即关闭局域网访问。
