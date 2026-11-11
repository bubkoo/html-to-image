# 样式复制性能与 #473 原分支重放

本次运行时变化仅为 `cloneCSSStyle` 内 iframe 判断的条件顺序。无关属性先短路，避免对普通元素反复识别跨 realm 类型。功能输出使用现有回归验证；性能通过配对测量验证，没有新增只检查实现调用次数的测试。

## V2 基线 / 候选

[完整样本](style-copy-performance.json)对应 401 个节点、40×8000、class 驱动的绿色行。基线是 `3080a42`，候选源码 hash 已记录。两份代码使用相同 esbuild 0.28.2 IIFE 参数，分别导出 `baseline` 和 `candidate`。三个引擎逐个测量，六轮交替先后顺序，剔除第一轮，取其余五轮中位数。

| 引擎 | 基线捕获 ms | 候选捕获 ms | SVG 完全相同 |
| --- | --- | --- | --- |
| Chromium | 202.8 | 141.6 | 是 |
| Firefox | 135 | 122 | 是 |
| WebKit | 150 | 138 | 是 |

采样另外验证 40×8000 canvas、顶部与底部绿色像素及源 DOM 不变。canvas 总耗时和原始样本保留在 JSON，不能将异步图像绘制波动当作样式阶段收益。这是单一 fixture，不推断所有大 DOM 的加速比；SVG 字节体积不变。

将 [CLI 对照函数](style-copy-performance-replay.js.txt)另存为 `compare.js`，在浏览器会话工作目录中准备 `baseline.js` 和 `candidate.js`。用现有 Playwright CLI 打开仓库静态浏览器页后运行：

```sh
playwright-cli --session style-copy run-code --filename compare.js
```

每份包可用本地锁定版本的 esbuild 编译：`src/index.ts --bundle --format=iife --global-name=baseline --outfile=baseline.js`，候选把 global-name 改成 candidate。基线与候选须在各自版本源码目录中构建，不能把当前源码同时当成两者。实际执行脚本的 hash 和包 hash 存于 JSON；提供的重放脚本只把机器绝对路径改为相对文件名。

## #473 原历史构建

原 head 为 `0b677d591b33c4a92d854095e6935bba0db34ce3`。从 Git 导出其 src，不修改历史源码；用相同 esbuild 构建 IIFE，global-name 为 `pr473`。源码逐文件 hash、构建 hash、三引擎实际输出和 drawImage 输入维度见 [历史记录](pr473-historical-controls.json)。

[尺寸与媒体查询函数](pr473-historical-replay.js.txt)在三引擎证实：17000×20 被缩为 16384×19；40×20000 分成 40×16384 和 40×3616，红/绿/蓝首尾像素正确，但输入图片仍为完整 40×20000。默认调用修改了传入选项，添加 usePageCss:true；简单 min-width 媒体案例三个引擎均绿色。这是实际历史实现，与早前 V2 hook 试验不同。

另一个 [页面 CSS 对照函数](pr473-css-benchmark.js.txt)在 401 节点、40×8000、统一绿色背景的独立样例中比较原 `pr473.js` 与当前构建 UMD（另存为 v2.js）。四次调用去掉首个样本后的中位数：原分支 4–6ms，V2 150–265ms；SVG 13602 字节，对照 V2 约 2.38–2.87MB。两种输出的尺寸、顶部/底部像素和源不变均验证。该 fixture 与上节使用不同 class 前缀、不同计时方式，不能混合两组绝对耗时计算加速比。

两份历史重放函数也用 CLI run-code 的 filename 参数运行，工作目录中须有 pr473.js，页面 CSS 对照还需 v2.js。原分支的页面 CSS 有具体收益；它同时改变字体/伪元素策略、选项和全局 Document，不能整体移植。真实 iOS 上原 #473 的完整行为、任意页面 CSS 保真、大 DOM 压力和内存上界尚未建立证据；本次小优化不代表这些问题解决，npm 未发布。
