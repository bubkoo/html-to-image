# 相对 SVG 绘制地址：未修复的页面保真反例

验收标准来自用户选择：跟随当前浏览器页面实际显示。此记录没有生产修复，也不是 iPhone 验收。

先运行 `python3 docs/evidence/svg-qualified-paint-bases/verify-archive.py` 核对 34 份原始文件。将归档解到 `output/playwright`，从仓库根目录运行 `node output/playwright/svg-qualified-paint-url-identity.mjs`。需要项目已安装的 Playwright 浏览器和与输入清单匹配的 ESM；控制器拥有并最终关闭本地 4496 服务和浏览器。

三引擎各 11 列：属性、行内样式、其他文件名、父目录、不同查询、缺失 ID、绝对其他文件、纯片段、绝对本文件、纯色和黄色。源前后逐通道一致。Chromium 源与导出相同；Firefox/WebKit 各差 2400 通道，差异仅在属性、行内和查询三列。查询控制的资源字节相同，因此不能据此推广为任意不同查询的资源身份正确。

服务记录显示该 HTTP 场景下 Chromium 从页面目录解析相对属性/行内地址，Firefox/WebKit 从 SVG 文件目录解析；导出均错误地采用页面目录。其他文件名和父目录控制说明不能统一删除 URL 的文件部分、只保留片段 ID。

`svg-relative-base-capability-complete.mjs` 使用独立 4497 服务检验 Blob 裁剪与命中测试。它的结果不能可靠区分上述 HTTP 绘制地址行为，不作为运行时策略。首轮尝试对 srcdoc 调用 History.replaceState 被 Chromium 拒绝，失败日志与部分照片同时保留；完整复验已移除该操作。

归档包含控制器、HTTP 观测、源前后/导出 PNG、比较结果、失败探针、运行时源/ESM 和 104 份输入哈希。不要用 Blob 探针、独立 SVG 文件或桌面 WebKit 替代各浏览器实际源画面及真实 iPhone 验收。
