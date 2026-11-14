# SVG 到 Canvas 的竖向内阴影对照

这是一组诊断，不是通过的修复回归。详见 [矩阵](../native-shadow-canvas.json)。它将原生滚动原型的阴影差异缩小到无文字、无滚动的 40px 盒子：HTML 与 SVG `<img>` 本身相同，WebKit Canvas 路径不同。全部原始 PNG/JSON 随记录保存。

把 `native-shadow-paint-probe.test.ts.txt` 复制为 `test/browser-unit/native-shadow-paint-probe.test.ts`，运行：

```sh
SCROLLBAR_BOX_EVIDENCE=1 pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/native-shadow-paint-probe.test.ts -t 'without any scroll'
```

当前配置已有 `screenshotScrollSource` / `recordScrollbarBoxEvidence`。结果写入 `.vitest/attachments/scrollbar-box/`。收集器会输出差异，不要求差异为零；三项收集测试通过不可当作三引擎库保真通过。三个未选中的滚动收集项为过滤，不是不支持特性。

同文件第一组滚动诊断依赖未合入的 `native-scroll.mjs`，仅在调查分支运行。重放后移除自行复制的临时测试，不动其他未跟踪文件。Y 翻转实验未接入运行时：模糊阴影反例仍然失败，不得略去或增加像素容差。
