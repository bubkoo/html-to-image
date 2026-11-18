# HTTP CSS 导入：外部 use 与独立文件的不同结果

这是当前浏览器页面保真规则下的限定等价结论，没有生产修复，也没有新增真机验收。

运行 `python3 docs/evidence/svg-http-import-native/verify-archive.py` 核验 34 份原始文件；解包到 `output/playwright/gc-native-controls` 后，在仓库根运行 `node output/playwright/gc-native-controls/svg-http-import-native-controlled.mjs`。控制器使用并最终关闭自己的 4499 HTTP 服务和全部浏览器。需要项目已安装的浏览器及与归档输入一致的 ESM。

同一 SVG 文件含基础 HTTP 导入、嵌套 HTTP 导入、行内规则和黄色纯色四列。在 Chromium/Firefox/WebKit 的实际外部 use 页面中，前两列均保留紫色基础值；ESM 导出与源截图全 6400 通道相同，源 DOM 与前后截图不变。Chromium 应用行内绿色规则，另两者仍为紫色，不能统一强行应用文件 CSS。

独立上下文打开同一个 SVG URL，三引擎都下载两份 CSS，基础/嵌套/行内三列都变绿、最后一列为黄色。这证明 HTTP 资源和规则有效，外部 use 中的紫色不是无效 CSS 造成。Firefox 外部 use 会请求 CSS，但仍未应用这两条规则；网络下载不能替代实际显示证据。

首次缺少独立文件正向控制的完整观测也保留，复验添加根部直接显示的四列，原 symbol 及导入规则保持相同。归档包含两个控制器、日志、两组原生/导出/前后照片、复验的独立文件照片、请求记录、全像素比较和六份实际源码/ESM。

这只核验同源、基础与嵌套 HTTP import 的受控场景。HTTP 字体、其他导入条件、限定 paint 地址、受限 CSP、UMD 和真实 iPhone 不在本次结论中。不要将独立 SVG 文件的绿色改写成外部 use 的验收标准。
