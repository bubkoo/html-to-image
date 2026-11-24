# SVG 文件自身字体与原生回退

这是一个限定的字体几何结论，没有生产修复。WebKit 仍有严格原生像素差，不计为三引擎全像素通过。

运行 `python3 docs/evidence/svg-file-font-native/verify-archive.py` 核验 43 份原始文件。解包到 `output/playwright/gc-native-controls`，在仓库根运行 `node output/playwright/gc-native-controls/svg-file-font-native-reference.mjs`。控制器独占并最终关闭 4500 HTTP 服务和浏览器。需要对应 ESM 和项目已安装的浏览器。

外部 SVG 文件定义同源 HTTP @font-face，并用该家族和 monospace 回退绘制 AA。正常字体嵌入选项下导出，源 DOM 与前后原生照片不变。另一个仅含文本的 symbol 读取原生几何，再与页面中独立的 16px/20px 回退文本比较：Chromium 精确匹配 20px，Firefox/WebKit 精确匹配 16px。三个浏览器的独立上下文打开同一个 SVG 文件后都加载真实字体，AA 的文字 advance 为 40px，与原生外部 use 的回退不同。Firefox 请求字体文件不等于它已用于外部 use。

Chromium/Firefox 的源与导出逐通道相同。WebKit 有 55 个通道各差 1；按独立回退几何手写的 SVG 图像也出现完全相同的 55 个差异，且与库导出逐字节一致。未加容差、未替换像素，也未将该边界判为精确原生通过。这个受控场景没有证明需要强行嵌入文件自身字体；那样会改变已观测的原生字体几何。

第一次探针误将整个 use 的 bbox 宽度要求为 120，遇到字形左侧悬出而超时。完整失败控制器/日志保留；后续记录 Chromium 120.01953125、Firefox 122 的实际 bbox，并按非空几何确认资源就绪，再核对源前后、独立字体几何和图像。没有修改生产代码或项目回归断言。

归档保留超时探针、首轮像素观测、独立参考复验、全部原生/导出/独立文件/参考 PNG、HTTP 请求与字体集合记录、全像素比较及真实字体/六份源码和 ESM 输入。导出只测了 ESM，没有新增 UMD 或真实 iPhone 验收。其他字体加载状态、HTTP 条件、受限 CSP 和限定 paint 地址继续开放。
