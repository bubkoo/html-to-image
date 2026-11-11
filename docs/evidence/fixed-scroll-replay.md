# Fixed 滚动与原生页面对照

基线 master 为 `71693724f0748e2ef0a3986b92975670e60f0b24`。源 `fixed-scroll-native-probe.js.txt` 是独立浏览器探针：构建基线、启动 4373 验收服务，在 Playwright CLI 的 Chrome/Firefox/WebKit 会话运行该函数。它截取 40×40 原生源节点，而不是把另一个 HTML-to-image 输出当作正确图片；PNG 的 y=2/13/25 分别为绿/红/绿，基线捕获为蓝/红/绿。三个原生 PNG 随证据归档。

最终回归共享 `test/browser/fixtures/fixed-scroll.mjs` 的 30 个输入，命令：

```sh
pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/fixed-scroll.test.ts
```

每项先用已有 Vitest 命令截取测试 iframe 中的实际节点，逐点核对源像素，再核对导出及源 DOM/滚动状态。将 src/clone-scroll.ts 单独恢复为基线、不修改最终输入和测试命令时，72 失败、18 通过；所有原生源对照通过。候选 90/90 通过。覆盖普通与混合块流、sticky 两种顺序、横/斜/RTL 滚动、filter/perspective/contain/will-change/translate、视口/更外层祖先、深层与嵌套 fixed、已有变换、底部/自动/右侧 inset 和源 important。

实现依据源浏览器的 offsetParent 关系。[CSSOM View 当前草案](https://drafts.csswg.org/cssom-view/#dom-htmlelement-offsetparent)定义 fixed 的包含块查找；[Positioned Layout 草案](https://www.w3.org/TR/css-position-3/#fixed-cb)说明它与视口的区别。两者均为仍在演进的草案，实际支持以本次浏览器和真机对照为准，不声称所有旧浏览器等价。

完整检查使用 `pnpm run test:browser`。真机需先提交源码并重新构建，完整 smoke 页的新 fixed 项分别用 ESM/UMD 循环所有输入；报告 gitHead 须与提交一致。真机输出标记与源状态断言不冒充逐项原生截图，后者来自桌面三引擎源码测试。

真实 iPhone 对源码 `c3b2d09` 的完整验收为 26/26，27 输入分别经 ESM/UMD。另使用 Safari WebDriver 的 W3C element screenshot 截取共享 transform-sticky-first 的实际源节点（不是页面全屏），120×120 对应 40×40 CSS，y=2/13/25 为绿/红/绿，fixed 相对顶部 -50px，offsetParent 是该面板。原始截图与数值记录见 ios-fixed-scroll-source.png / ios-fixed-scroll-source-control.json。

覆盖率复核补入对 fixed 返回空样式列表、保留 inline top/left:auto 的 bottom/right 选项场景，并检查 y=38/x=38 的残留条；不模拟私有函数或修改覆盖率门槛。最终 30 输入基线与完整检查分别重新运行。初版 c3b2d09 的真机记录仍只代表当时 27 输入，最终记录另行标明。
