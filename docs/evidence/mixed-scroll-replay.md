# 混合文字滚动验证重放

基线：`b9f2dfd220fcf5a49f86f47d181f1c28607de75d`。候选源码：`42e8012fecc65bf0ea99a10450be2470dda37505`。

共享输入是 `test/browser/fixtures/mixed-scroll.mjs`，14 个 case 不依赖固定系统字体轮廓。源码定向命令：

```sh
pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/mixed-scroll.test.ts
```

它在 Chromium、Firefox、WebKit 中先对 Vitest 测试 iframe 内的源节点截原生 PNG，逐点核对绿色/蓝色标记，再对同一节点捕获并核对像素、DOM 和滚动状态。基线重放仅将 `src/capture.ts`、`src/clone-node.ts`、`src/task.ts`、`src/util.ts` 暂时恢复为基线版本，保留最终 fixture 和测试配置；运行相同命令，随后恢复候选文件。未被旧入口导入的新 helper 对旧源码无影响。42 项捕获全部失败，原生源对照没有失败。初期 nested 输入曾因移动节点重置 scrollTop、取点越界导致对照失败，最终输入先重新对齐内外容器，并完成此基线复验；不把无效输入算库的失败。

完整命令 `pnpm run test:browser` 包含 lint、构建、浏览器测试类型、覆盖率、三引擎源码、安装实际 tarball 的 ESM/CJS/UMD/两代 TS 类型、三引擎构建包。结果 234/344/123，另 1 项既有 WebKit iframe GC 跳过。文件 hash、限制和计数见 `mixed-scroll.json`。

真机使用已提交源码重新构建，打开 `test/browser/smoke.html`，25 项完整结束后由本地服务落盘报告，核对报告 gitHead 为候选源码。新增混合滚动项循环相同 14 个输入，分别使用构建 ESM 和 UMD，验证输出像素及源状态。真机报告不冒充每项原生源截图对照；后者来自上面的桌面三引擎测试。

#451 的独立真机视频输入另见 `ios-video-aspect-input.html.txt`。重放时将其放到 `test/browser/`，把 `test/resources/video/flower.mp4` 复制为旁边的 `video-native-flower.mp4`，构建 `b9f2dfd` 后在真机打开。归档输入通过 fetch 取得字节，再使用明确 video/mp4 MIME 的 Blob；这些临时文件不进入包。原结果只覆盖记录中的暂停帧/尺寸和 contain 模式。
