# SVG 阶段、字体与原生参考重放

## 变换后的资源

当前 master 基线为 132c38d。最终共享 fixture 是 test/browser/fixtures/transformed-svg.mjs，测试为 test/browser-unit/transformed-svg.test.ts。只在 try/finally 中把 src/capture.ts / src/clone-node.ts 恢复为基线，保留最终测试文件；运行 Vitest 得到 30 失败 / 6 通过。恢复候选后全部 36 通过。11 个共享模式加独立 cloneNode 兼容对照在三个引擎运行；删除场景对任何库请求抛错，包含同源 iframe，避免只测最终颜色。

完整检查使用 pnpm run test:browser。最后补充测试的完整 coverage/source 与 lint/types 单独复核，生产源码未变，详细范围见 transformed-svg-resources.json。真机报告须绑定提交后重建的同一源码。

## 真实字体与已发布旧版

```sh
mkdir -p /tmp/html-to-image-blob-check/svg-font/legacy
git archive v1.11.13 src | tar -xf - -C /tmp/html-to-image-blob-check/svg-font/legacy
node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild /tmp/html-to-image-blob-check/svg-font/legacy/src/index.ts --bundle --format=esm --platform=browser --target=es2017 --outfile=test/browser/legacy-svg-font-probe.js
```

启动测试服务（本机使用 4373），在三个 CLI 浏览器会话运行 svg-font-historical-compare.js.txt。它调用同一 observeSVGFontGlyphs；当前源码的原生源截图由 Vitest 命令独立核对。六种模式 × 三引擎：旧版默认 15 失败 / 3 通过，手动 fontEmbedCSS 18 通过，当前 18 通过。root-inherited 的旧版正常结果保留为正对照；旧 TTF MIME 不同，不用 data:font/ 前缀断言。历史模块是临时文件，完成后删除；没有发布 npm。

## 外部 SVG 的原生观察

从仓库根目录运行 svg-redirect-observation-server.mjs.txt（可临时复制为 .mjs），监听 4493，提供现有 /es 构建与 /probe 路由。客户端是 svg-redirect-create-scene.js.txt 和 svg-redirect-capture-scene.js.txt；CLI 包装脚本 svg-redirect-observe.js.txt 先创建带唯一地址的场景，等待 use BBox 与网络完成，截源，再导出，再截源。按四列中心比较：重定向的相对 paint、直连相对 paint、纯色 external use、黄色 HTML 块。

真实 iPhone 使用同一服务器和客户端，在浏览器 visible、三个 BBox 为 20×20、原生 use 网络结束后，经 W3C element screenshot 取源图；随后才运行导出，再取源图。PNG 全部原生像素前后相同，数值、UA 和图在 svg-redirect-native-matrix.json 及 svg-redirect-source-*.png。观察器没有把源/输出相等当作通过条件。

[Fetch 标准](https://fetch.spec.whatwg.org/#dom-response-url)提供 Response URL；这里观察的是 SVG 页面绘制，不能据此跳过源页面对照。本轮没有修改 redirect URL 解析或宣称这组差异已修复。
