# 原生滚动快照：坐标原点与绘制对照

日期：2026-11-14。分支：codex/native-scroll-snapshot-v2。范围：#408 关联的 #81 / #345；这是未完成原型，不代表完整修复。

- 将 #634 的占位尺寸修正接入原生 CSS snap 原型后，稳定 gutter 暴露了坐标原点错误：源 scrollLeft 为 40，副本成为 51，蓝色标记横向偏移 11px。snap 起始边包含预留空间，而 scrollLeft 不包含。按逻辑起始方向计算物理 gutter，并以相反 scroll-margin 保持 snap 区域大小；不要把 gutter 再加到源滚动距离。
- 必须同时验证 LTR/RTL、stable/stable both-edges、静态/已有定位容器。当前共享用例包含 9 组滚动组合，三引擎对整个实际内容视口逐通道比较；不是仅看一个绿色点。
- gutter 的 clientLeft/clientTop 包括边框；使用与 client 指标一致的四舍五入边框宽度，避免高 DPR 分数边框被误认成 gutter。
- 原型中的 Set 展开不能通过 ES5 构建；使用 Array.from，不能只检查现代 ESM。
- WebKit 27.2 的文字首幅导出与源差 264 通道；完全手写 SVG 和给同一冻结 SVG 加无视觉作用属性后的新 URL 重放均差 21 通道，二者彼此相同。新重放与首幅差 243 通道。这证明结果受渲染路径/缓存状态影响，但尚未确定原因，不能用后续重放替换首次输出来宣称原测试通过。
- 内阴影的 234 通道差异同时存在于库、手写 SVG 和新 URL 重放。此前 transform、isolation、will-change、overflow 等试验未解决；不能从手写 SVG 也失败推导出不存在可行表示。
- 源截图、首次输出、手写 SVG、重放和原始输入应成套存入 docs/evidence；临时目录在暂停数日后可能被清理。当前完整定向仍有两个严格失败，不能据此合并原型或关闭旧 Issue。

证据：[native-scroll-v2.json](../docs/evidence/native-scroll-v2.json)。

- 普通 HTML 与内联 SVG 的冻结内容源截图都为零差异，差异出现在 SVG Image 栅格化路径。连续三次同 URL 的首次文字差异仍为 264；只以 XML 注释区分解码地址的三次重绘实验降为 21（最大通道差 1）。该结论支持单独审视 stabilizationAttempts 的缓存语义，不等于已修复全部原生滚动或允许默认放宽像素门槛。

## [LRN-20261115-002] knowledge_gap

**Logged**: 2026-11-15T00:11:27+08:00
**Priority**: medium
**Status**: pending
**Area**: rendering

### Summary
稳定 SVG 的字形末级通道差异与 Canvas 上下文读取模式有关；不能由该正对照直接推出全局修复。

### Details
同一已稳定 SVG 在 WebKit 默认 Canvas / alpha:false / copy 合成均差 21 通道；willReadFrequently:true 为零，叠加 alpha:false 同样为零。内阴影四种控制均差 234。临时全局启用后首次字形仍差 246，独立新解码回归也失败，因此撤回运行时修改；恢复后新重试回归三引擎 12/12。不是精度容差，尚未证明具体硬件后端或普适解法。

### Suggested Action
下一步分别核验首解码、Canvas 绘制与读取路径；不要盲目全局切换上下文选项，不要将 warmed 正对照当默认首帧修复。

### Metadata
- Source: investigation
- Pattern-Key: webkit.svg-image-canvas-readback-parity
- Related Files: docs/evidence/native-scroll-v2.json, test/browser/fixtures/native-scroll.mjs

### Context Maintenance
- Scope: macOS Playwright WebKit 27.2 / Playwright 1.64.1；非真机新验收
- Authority: 同一冻结 SVG、原生源截图、四种上下文控制及撤回后的三引擎回归
- Revalidation: 浏览器版本或 Canvas 路径变化时重验
- Validation: unresolved
- Last-Validated: 2026-11-15
- Evidence: docs/evidence/native-scroll-v2.json

## [LRN-20261115-004] knowledge_gap

**Logged**: 2026-11-15
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
竖向内阴影差异可在无滚动纯色盒重现；原生 SVG 图片正确，转 Canvas 后错误。

### Details
六组 40×40 无文字/无滚动盒在三引擎取真实 HTML 与 SVG img 截图。18 组 img 全像素相同；Chromium/Firefox Canvas 也全相同。WebKit 纵向 ±10px inset 分别差 800 通道，2px blur 差 1792；水平与 spread 正对照为零。可逆 Y 翻转恢复无 blur，但 blur 仍差 796/max6，频繁读取源 Canvas 为 544/max13；不能当作完整修复。Pattern 路径因 foreignObject 报 SecurityError，其他 drawImage 重载、OffscreenCanvas、identity Canvas filter 无效。

### Suggested Action
以无滚动最小输入定位 SVG 到 Canvas 的绘制差异；必须保留模糊阴影反例，不能仅凭无 blur 正对照接入运行时。不要再把差异笼统归因于滚动坐标或 SVG 文件显示。

### Metadata
- Source: investigation
- Pattern-Key: webkit.svg-to-canvas-inset-offset-parity
- Related Files: docs/evidence/native-shadow-canvas.json

### Context Maintenance
- Scope: Playwright 1.64.1 WebKit 27.2；Chromium/Firefox 同输入正对照
- Authority: 18 组原生 HTML/img 截图、完整 RGBA 与可逆轴变换反例
- Revalidation: 浏览器版本、绘制路径变化时重验，仍需 iPhone 验收
- Validation: unresolved
- Last-Validated: 2026-11-15
- Evidence: docs/evidence/native-shadow-canvas.json
