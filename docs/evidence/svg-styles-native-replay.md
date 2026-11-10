# 外部 SVG 原生页面样式对照

本记录用于确定输出契约。它证明当前导出与部分浏览器的页面存在差异，不是修复通过的回归。

## 输入与观测

基线为 master `545ff83`，Playwright 1.64.1 / Vitest 5.0.5。完整输入 hash、15 组桌面页面/导出像素及 iPhone 元数据见 [矩阵](svg-styles-native-matrix.json)。像素取 60×20 场景三个方块中心；第三块显式黄色，独立检查截图定位与通道。源 DOM 保持不变。

| 场景 | Chromium 页面 | Firefox 页面 | WebKit 页面 | 当前导出 |
| --- | --- | --- | --- | --- |
| 页面包含 `.shared { fill: yellow !important }` | 绿 / 蓝 / 黄 | 黄 / 黄 / 黄 | 绿 / 黑 / 黄 | 全部为黄 / 黄 / 黄 |
| 去掉页面规则 | 绿 / 蓝 / 黄 | 绿 / 黑 / 黄 | 绿 / 黑 / 黄 | 全部为绿 / 黑 / 黄 |

真实 iPhone Safari（iOS 18.7、Safari 26.6.1、DPR 3、非模拟器）两种状态都显示绿/黑/黄，[原生截图](ios-safari-svg-style-source.png)字节相同。WebDriver PNG 为 16-bit RGBA，sRGB profile；截图垂直原点与 DOM viewport 不同，通过独立黄色 20px 参照块定位，再读取同一行的三个中心，未把页面外白色像素误判为图标。

四种带页面规则的案例分别覆盖 class、ID/attribute 选择器优先级、引用外祖先/继承、CSS 内渐变与裁剪引用；第五种为不含页面规则的 class 对照。

## 桌面重放

将 [观测收集器](svg-styles-native-observation.test.ts.txt)复制为 `test/browser-unit/svg-styles-native-observation.test.ts`。在 `vitest.browser.config.mts` 的 `browser.commands` 中临时添加：

```ts
async screenshotSVGSource({ iframe }, selector: string) {
  const png = await iframe.locator(selector).screenshot({ scale: 'css', timeout: 5000 })
  return png.toString('base64')
}
```

运行：

```sh
pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/svg-styles-native-observation.test.ts --reporter verbose --silent=false
```

`SVG_STYLE_OBSERVATION` 输出原生截图和当前导出的 RGB 像素。收集器只检查黄色参照及源不变，不断言两者一致；其通过数量不能当修复数量。`SVG_STYLE_POLICY` 是独立的 Blob/getBBox 探索，不能单凭该结果判定全部颜色作用域行为。收集结束后移除临时文件和配置。

## 真机重放

启动仓库 `test/browser/server.mjs` 并让 iPhone 访问 `/test/browser/svg-style-native-probe.html?leak=1`，以及不含查询参数的同一地址。输入位于 `test/browser/fixtures/svg-styles/`；左块用绿色 host fill，中块无 host fill，外部文件中 shared 类分别设置绿/蓝。页面内同名规则通过参数启用。

## 待选契约

1. 保留各浏览器当前页面的实际显示。
2. 统一按外部 SVG 文件样式还原，接受部分浏览器导出与页面颜色不同。

统一文件样式的原型产生绿/蓝，与 Firefox/WebKit 八项 live-page 对照不一致，因此未合入。对照原则参考 [SVG2 use 的作用域与继承](https://www.w3.org/TR/SVG2/struct.html#UseStyleInheritance)，实际行为以上述各引擎测量为准。外部 CSS/字体及 #585 的其余设计仍未解决；npm 未发布。
