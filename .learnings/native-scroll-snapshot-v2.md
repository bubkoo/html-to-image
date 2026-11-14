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
