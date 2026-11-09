## [LRN-20261028-001] best_practice

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: ci

### Summary
评估 PR 前核对实际检出的提交，不能将成功检查或覆盖率报告直接视为 PR 代码已通过验证。

### Details
PR #598 的 CI run 36932597879 / job 110605311820 日志显示：检出 master 的 ad4ff590fd39d6bc9ef574c45449f38e68e310c4，执行 51 个测试（另跳过 4 个），随后 Codecov 使用 -C de69c418a9cd432bc6725ad3c2741a25a5900e4b -P 598 上传。实际被测提交与覆盖率归属提交不同。当前 ci.yml 同时监听 pull_request 和 pull_request_target，checkout 未显式指定 ref。

### Suggested Action
CI 已移除分支内的 `pull_request_target`，PR 验证改用 `pull_request` 检出；安装器改为与 lockfile v6 匹配的 pnpm 8 和 frozen lockfile。PR #600 的 run 40830985559 对测试合并提交完成全部测试，并确认第二父提交为 PR head；主分支的旧 `pull_request_target` 工作流仍并行运行。旧工作流向 Codecov 上传主分支覆盖率、此前新工作流未上传 PR 覆盖率，造成误导性的 patch 检查；新工作流用 OIDC 上传实测报告后，Codecov patch/project 检查均通过。父提交校验需要 `actions/checkout` 的 `fetch-depth: 2`。

### Metadata
- Source: investigation
- Related Files: ../.github/workflows/ci.yml
- Pattern-Key: ci.coverage-checkout-provenance

### Context Maintenance
- Scope: html-to-image 当前工作流；本地 master e842e84cf68493f39dcb76f0a879d02d174b3edb
- Authority: 实际 CI job 日志及当前工作流源文件
- Revalidation: 工作流、checkout 或覆盖率上传配置变更后，核对新 run 的真实日志
- Validation: verified（历史 run 的错配；PR #600 新工作流完整测试、父提交校验与 Codecov 上传）
- Last-Validated: 2026-10-29
- Evidence: https://github.com/bubkoo/html-to-image/actions/runs/36932597879/job/110605311820 ; https://github.com/bubkoo/html-to-image/actions/runs/40830985559

## [LRN-20261028-002] knowledge_gap

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: rendering

### Summary
导出重构需先隔离任务状态，并用受控失败样例验证参数传递与异步完成路径。

### Details
在 e842e84 的原函数上进行 Node 最小复现（擦除 TypeScript 类型；浏览器对象和部分依赖使用受控替身）确认：getStyleProperties 首次传入 color 后，后续 width 和空数组都返回 color；5 次并发 resourceToDataURL 请求同一资源触发 5 次 fetch；默认缓存将不同 query 的 URL 合并；命中该缓存后 cacheBust:true 不触发 fetch；createImage 的 decode 拒绝后产生未处理拒绝，外层 Promise 在观察窗口内仍 pending；toBlob 丢失 type/quality；toPixelData 从 200×100 画布只读取 100×50。此验证确认函数控制流，不代表真实浏览器视觉、性能或 WebKit 验证。

### Suggested Action
可变配置、资源请求和错误生命周期已归属单次导出任务；浏览器回归用例覆盖了并发隔离、query 资源身份、Blob 参数、完整像素数据与图片解码拒绝。Chromium 运行通过，Safari/Firefox 与大树性能仍待验证。

### Metadata
- Source: investigation
- Related Files: ../src/util.ts, ../src/dataurl.ts, ../src/index.ts
- Pattern-Key: rendering.capture-state-and-settlement

### Context Maintenance
- Scope: html-to-image 1.11.13 / master e842e84；受控函数级复现
- Authority: 当前源文件与原函数最小复现
- Revalidation: 上述函数或缓存设计变更后，重跑失败对照和真实浏览器用例
- Validation: verified（函数级根因和 Chromium 回归；其他浏览器待验证）
- Last-Validated: 2026-10-28
- Evidence: https://github.com/bubkoo/html-to-image/tree/e842e84cf68493f39dcb76f0a879d02d174b3edb/src

## [LRN-20261028-003] best_practice

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: packaging

### Summary
ESM 发布入口必须从实际构建包导入验证，TypeScript 编译成功不能证明浏览器和 Node 能解析内部模块。

### Details
原 `es/index.js` 保留无扩展名相对导入，Node ESM 报 `Cannot find module .../es/renderer`。源码相对导入使用 `.js` 说明符，构建后在 `es/package.json` 标明模块类型，并以条件导出区分 ESM/CJS。原 CJS/UMD 产物仍可加载。

### Suggested Action
每次改发布入口后运行构建与 `test:package`：实际 `npm pack`，离线安装到临时项目，再从该项目检查 ESM/CJS/UMD 和 TypeScript 类型。PR #600 的 `pull_request` CI 已执行该检查。

### Metadata
- Source: investigation
- Related Files: ../package.json, ../scripts/check-package.mjs, ../test/package-smoke.mts
- Pattern-Key: packaging.emitted-esm-resolution

### Context Maintenance
- Scope: html-to-image 当前 v2 分支、Node 22/24 本地验证
- Authority: 实际压缩包的隔离安装、Node import/require、TypeScript NodeNext 编译与包文件清单
- Revalidation: 构建器、导出映射、支持的 Node 版本或发布配置改变后重跑
- Validation: verified（本地及 PR #600 CI 的构建和包消费检查）
- Last-Validated: 2026-10-29
- Evidence: ../scripts/check-package.mjs

## [LRN-20261028-004] knowledge_gap

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: rendering

### Summary
预先解码 HTML 图片不等于 WebKit 已把该图片渲染进 SVG `foreignObject`；必须验证最终像素。

### Details
本机 Safari 26.5.2 的随机 800×800 PNG data URL 场景中，源图片 `decode()` 已完成，但单次导出中心像素为透明。对同一份冻结 SVG 进行 3 次栅格化后，中心标记像素正确；重复刷新新随机图仍复现。Chromium 单次导出正常。独立嵌套滚动场景在两种浏览器均丢失可见位置，克隆时将运行时 scroll offset 表达为副本子元素位移和裁剪后，两者在该场景通过。

### Suggested Action
WebKit 大图回归同时记录首次与稳定化后采样；不要以 `img.decode()`、Promise 完成或非空 data URL 代替像素验证。滚动修复继续检查直接文本、sticky/fixed、复杂布局和嵌套滚动。

### Metadata
- Source: investigation
- Related Files: ../test/browser/smoke.html, ../src/capture.ts, ../src/clone-node.ts
- Pattern-Key: rendering.webkit-foreignobject-raster-readiness
- See Also: LRN-20261028-002

### Context Maintenance
- Scope: 本机 Safari 26.5.2、Chromium 156；随机 800×800 图片、pixelRatio 2、嵌套 40×40 滚动容器
- Authority: 实际浏览器像素采样与本地回归页
- Revalidation: 浏览器版本、图片负载、栅格化流程变化时重跑；iOS 与其他 WebKit 版本未验证
- Validation: verified（限定场景）
- Last-Validated: 2026-10-28
- Evidence: ../test/browser/smoke.html

## [LRN-20261028-005] best_practice

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: testing

### Summary
验证 SVG 后代时，测试选择器必须区分被测节点与导出格式自身的 `foreignObject` 包装层。

### Details
Issue #515 的定向回归最初用 `svg foreignObject` 计数，得到 2 而预期 1。实际导出 SVG 自身用一个外层 `foreignObject` 承载 HTML 根节点，另一个才是被测 SVG 内的保留节点；排除节点并未泄漏。改为按原始节点的 `keep`/`omit` 类名断言后，直接验证了 `filter` 对内层 `foreignObject` 的效果。

### Suggested Action
对嵌套 SVG 的回归使用可识别的目标节点及其内容作断言，不用裸标签总数判断克隆是否重复。

### Metadata
- Source: investigation
- Related Files: ../test/spec/renderer.spec.ts
- Pattern-Key: testing.svg-foreignobject-wrapper

### Context Maintenance
- Scope: html-to-image 当前 v2 分支的 SVG 序列化测试
- Authority: `nodeToDataURL` 包装结构及 Chrome Headless 回归结果
- Revalidation: SVG 包装结构或选择器变化时重跑
- Validation: verified（92 项通过、4 项原有跳过）
- Last-Validated: 2026-10-28
- Evidence: ../test/spec/renderer.spec.ts

## [LRN-20261028-006] best_practice

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: ci

### Summary
CI 的 lint 检查应有显式步骤，不能隐含依赖包管理器运行 `prebuild`。

### Details
本项目切到锁文件匹配的 pnpm 8.15.9 后，本地 `pnpm run build` 的输出只执行 `build:esm`、`build:cjs`、`build:umd`，没有执行原有 `prebuild` 中的 `lint`。新工作流增加无修改行为的 `lint:check` 步骤，直接检查源码和新浏览器测试文件。

### Suggested Action
在 CI 中显式运行所有必要质量门禁；发布构建的生命周期脚本只作为开发便利，不作为唯一验证证据。

### Metadata
- Source: investigation
- Related Files: ../package.json, ../.github/workflows/ci.yml
- Pattern-Key: ci.explicit-lint-gate

### Context Maintenance
- Scope: html-to-image 当前 v2 分支，pnpm 8.15.9，Node 22/24 本地运行
- Authority: 本地构建输出和显式 lint 运行结果
- Revalidation: 更换 pnpm 版本或脚本定义后重新核对
- Validation: verified（本地；新 GitHub workflow 尚未远端运行）
- Last-Validated: 2026-10-28
- Evidence: ../.github/workflows/ci.yml

## [LRN-20261028-007] knowledge_gap

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: testing

### Summary
旧 Karma/TypeScript ES5 编译链不能可靠构造继承 `HTMLElement` 的自定义元素；真实自定义元素回归应在现代浏览器测试入口运行。

### Details
将原跳过的 Shadow DOM 用例直接改为 `class extends HTMLElement` 后，Chrome Headless 在创建元素时报 `Failed to construct 'HTMLElement': Please use the 'new' operator`，随后 `shadowRoot` 为 null。将旧 Karma 用例限定为普通元素的开放 shadow root，并在 Vitest Browser Mode 中用真正的自定义元素检查三浏览器像素与源内容，两层测试均通过。前者覆盖克隆算法，后者覆盖自定义元素构造与渲染。

### Suggested Action
补浏览器原生类、custom elements 或现代模块功能时，把真实 API 行为放在现代浏览器测试层；旧 Karma 保留可运行的兼容回归，不把测试转译故障归因于渲染实现。

### Metadata
- Source: error
- Related Files: ../test/spec/special.spec.ts, ../test/browser-unit/capture.test.ts
- Pattern-Key: testing.legacy-es5-custom-element-construction

### Context Maintenance
- Scope: 本项目 Karma/karma-typescript、TypeScript 4.9.5 的现有编译链
- Authority: 本地失败日志及修改后的 Chrome Headless、三浏览器运行结果
- Revalidation: Karma 编译目标或测试框架升级后重跑原生自定义元素样例
- Validation: verified
- Last-Validated: 2026-10-28
- Evidence: ../test/browser-unit/capture.test.ts

### Resolution
旧测试验证普通 open shadow root；三浏览器源码测试验证真正 custom element，现有旧套件无跳过项。

## [LRN-20261028-008] knowledge_gap

**Logged**: 2026-10-28 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: rendering

### Summary
滚动副本中不能因为一个直接置顶的 sticky 标题就放弃普通内容的位移；位移产生的 stacking context 还会改变标题的覆盖关系。

### Details
三浏览器最小用例：40×40 滚动容器，顶部 10px 红色 sticky 标题，后续蓝、绿各 40px，`scrollTop=40`。原实现整体跳过校正，导出 y=20 为蓝色，源可见内容为绿色。允许首个、`top:0` 的直接 sticky 子元素保持原位，并位移普通兄弟后，y=20 正确变绿，但 y=5 标题被蓝色覆盖；原因是兄弟的 transform 创建 stacking context。为无显式 z-index 的该标题建立高于普通兄弟的层级后，两处像素在 Chromium、Firefox、WebKit 均正确。

### Suggested Action
处理滚动序列化时同时检查位置和绘制顺序；对 sticky/fixed 的支持按明确布局形态逐项增加，不能从直接置顶标题外推到任意 sticky 或 fixed 布局。

### Metadata
- Source: investigation
- Related Files: ../src/clone-node.ts, ../test/browser-unit/capture.test.ts
- Pattern-Key: rendering.scroll-sticky-stacking

### Context Maintenance
- Scope: 当前 v2 分支、首个直接子元素 sticky 且 top 为 0、纵向滚动
- Authority: 三浏览器失败对照与修复后像素回归
- Revalidation: 滚动克隆策略、stacking 处理或浏览器版本改变后重验
- Validation: verified
- Last-Validated: 2026-10-28
- Evidence: ../test/browser-unit/capture.test.ts

### Resolution
限定形态的 sticky 标题保留原位与绘制层级；其余直接子元素照常位移，其他布局保守回退。

## [LRN-20261102-009] knowledge_gap

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: rendering

### Summary
把 DOM 序列化为 data URL SVG 时，同文档的绝对 `clip-path` URL 需要在副本中改成本地片段；不能把其他文档的同名片段一起改掉。

### Details
Issue #579 的最小浏览器用例在修复前显示：SVG 属性、内联样式与根相对引用保留源页面 URL，三项断言失败。克隆步骤会复制 SVG 属性，也会把计算后的 CSS `clip-path` 写入副本样式；因此需要在这两处处理。解析相对 URL 时用源文档的 `baseURI`，判断同文档时用源 `Document.URL`，比较去掉片段后的完整 URL（含查询）。匹配时仅改副本为 `url(#id)`，外部 origin、其他路径和其他查询参数保持不变。修复后的 SVG 内容和裁剪像素在 Chromium、Firefox、WebKit 通过，构建 ESM 的三浏览器像素测试也通过。

### Suggested Action
处理序列化后会改变 URL 基址的 CSS/SVG 引用时，先区分本地定义与外部资源；既验证输出引用，也验证实际像素和源 DOM 未变。不要仅用同 origin 或同 pathname 判断“同文档”。

### Metadata
- Source: investigation
- Related Files: ../src/clone-node.ts, ../test/browser-unit/clip-path.test.ts, ../test/browser/package.spec.ts
- Pattern-Key: rendering.same-document-fragment-serialization

### Context Maintenance
- Scope: html-to-image v2 分支的 `clip-path` SVG 属性与 CSS 计算样式
- Authority: 修复前 Chromium 失败对照；修复后三浏览器源码和构建 ESM 测试
- Revalidation: 资源基址、SVG 序列化或浏览器 CSSOM 处理改变后重跑
- Validation: verified（本地及 PR #600 run 41379640499 的三浏览器与构建产物测试）
- Last-Validated: 2026-11-02
- Evidence: ../test/browser-unit/clip-path.test.ts ; ../test/browser/smoke.html

## [LRN-20261102-010] unexpected_behavior

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: resources

### Summary
重复的 HTTP `Content-Type` 在不同浏览器中会以带逗号的 Blob.type 进入 `FileReader`，直接生成无效 data URL；Firefox 合并头字段时不一定在逗号后加空格。

### Details
Issue #601 的失败对照产生 `data:image/png, image/png;base64,...`。V2 的图片、CSS 背景和字体都共用 `blobToDataURL`，因此在入口修正 Blob 的媒体类型即可覆盖三个路径；只截取引号之外的第一个逗号，避免破坏合法引号参数。Karma 用例在修复前失败；修复后本地 Karma、三浏览器源码和经真实重复 HTTP 头的构建 ESM 像素回归通过。响应头断言需按逗号拆分并 trim，不能要求固定空格。

### Suggested Action
资源嵌入故障先检查原始响应头、`Response.blob().type`、生成的 data URL 和最终像素，并在实际构建包的 HTTP 路径验证。

### Metadata
- Source: investigation
- Related Files: ../src/resource-loader.ts, ../test/spec/renderer.spec.ts, ../test/browser-unit/capture.test.ts, ../test/browser/server.mjs
- Pattern-Key: resources.duplicate-content-type-dataurl

### Context Maintenance
- Scope: html-to-image V2 的 Blob 转 data URL 路径；Android MAUI WebView 原场景未复测
- Authority: 本地失败对照、Karma 106、三浏览器源码 39、构建包 24 通过
- Revalidation: Blob/FileReader 行为、资源加载路径或浏览器版本变化后重跑
- Validation: verified locally
- Last-Validated: 2026-11-02
- Evidence: ../test/browser/package.spec.ts ; ../test/browser/smoke.html

### Resolution
共用资源转换入口先修正重复 MIME，再交给 `FileReader`；源响应和源 DOM 不变。

## [LRN-20261102-011] project_pattern

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: active
**Area**: release

### Summary
本项目旧 `master` 不是当前 npm 包的精确发布源码，而且旧发布工作流会在任何 `master` 推送后自动运行；V2 切换必须分别保存两种版本身份并隔离 npm 发布。

### Details
公共 npm registry 的 `html-to-image@1.11.13` 指向 `gitHead=9957281`，与 Git 标签 `v1.11.13` 一致；切换前 `master=e842e84`，中间 26 个提交。已将原 `master` 原样归档到远端分支 `archive/v1.11.13`；这个分支不是 npm 发布源码的标签。旧共享 semantic-release 配置按普通 `feat` 规划次版本，只有带 `BREAKING CHANGE` 的提交会规划主版本；旧 release workflow 在推送 `master` 时自动发布且只跑旧测试。V2 工作流已改为手动发布，发布前复用 CI、核对主分支 SHA、实际压缩包、试算版本与 npm 前一版本。真正的远端手动发布路径要在切换后验证。

### Suggested Action
主分支迁移先核对 npm `gitHead`、发布标签和主分支各自的 SHA；保存旧主分支，再让发布工作流独立于合并触发，并在发布前强制检查预期版本。

### Metadata
- Source: investigation
- Related Files: ../.github/workflows/ci.yml, ../.github/workflows/release.yml, ../docs/v2-release-readiness.md
- Pattern-Key: release.archive-master-separate-npm

### Context Maintenance
- Scope: html-to-image 从 1.11.13 迁移到 V2 的主分支切换
- Authority: 公共 npm registry 元数据、本地 Git 标签与历史、远端归档分支指针、共享发布配置
- Revalidation: npm latest、master 指针或发布工作流变化时重查
- Validation: archive verified; release workflow statically validated and PR CI passed, remote dispatch pending
- Last-Validated: 2026-11-02
- Evidence: ../docs/v2-release-readiness.md

### Resolution
原 `master` 已归档；V2 通过验收后才切换；npm 另行手动发布。

## [LRN-20261102-012] project_pattern

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: customization

### Summary
逐节点定制需要两个不同的时点：计算样式复制前选择属性，子节点与样式复制后修改副本；同一次属性选择还必须传给伪元素。

### Details
V2 的 `onClone` 可以改整份副本，但无法可靠地把源元素映射回各副本。`onCloneNode` 在递归装饰末尾运行，子先于父，便于按源元素修改 copy；`stylePropertiesForNode` 在复制计算样式前运行一次，结果同时传给主元素与 `::before`/`::after`。显式 `[]` 保留 inline 但不拷贝计算属性；`undefined` 表示完整计算列表，覆盖全局限制。带非空 `cssText` 的快速路径只在没有显式列表时可用。修复前两个新用例失败，修复后 Karma、三引擎源码及构建包通过。

### Suggested Action
扩展克隆流水线时先定义回调时点、遍历顺序、源 DOM 不变性和伪元素继承规则，再提供公共选项；用输出内容和像素共同检验。

### Metadata
- Source: investigation
- Related Files: ../src/clone-node.ts, ../src/clone-pseudos.ts, ../src/types.ts, ../test/spec/renderer.spec.ts
- Pattern-Key: customization.per-node-stage-contract

### Context Maintenance
- Scope: V2 的逐节点定制与样式选择，PR #597/#598 的独立实现
- Authority: 修复前失败对照、Karma 108、三浏览器源码 45、构建包 27 和类型测试
- Revalidation: 克隆顺序、CSSStyleDeclaration 路径或公开选项语义变化后重跑
- Validation: verified locally
- Last-Validated: 2026-11-02
- Evidence: ../test/browser-unit/capture.test.ts ; ../test/browser/package.spec.ts

### Resolution
按阶段暴露两个同步入口，并保持每个节点的样式选择与伪元素一致。

## [LRN-20261102-013] failed_attempt

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: test-infrastructure

### Summary
直接把共享构建配置和 TypeScript 升至 5.5.4 会使旧 Karma 测试的 CommonJS 文件失去浏览器包装，报 `exports is not defined`；新浏览器测试和产物检查通过不能替代 109 个旧回归。

### Details
试验升级 `typescript@5.5.4`、`@bubkoo/rollup-config@2.0.0`、`@bubkoo/tsconfig@2.0.0`，并分别试过 `karma-typescript@5.5.4` 与 5.5.3。两种 Karma 插件版本均能编译 30 个文件，但日志没有原来的 “Bundled imports”，Chrome Headless 执行 0 个用例并从 `src/apply-style.js` 等位置报 `exports is not defined`。同一试验的构建、Vitest 三引擎、实际 npm 压缩包和类型检查通过。恢复原锁文件与 TypeScript 4.9.5 后 Karma 109/109 通过。当前证据定位在旧 Karma 打包链与 TS5 输出的组合；未证明插件内部的具体失效语句。

### Suggested Action
先将旧套件迁移到新的浏览器运行器并保留等价回归，再升级 TypeScript 与共享构建配置；不要靠仅检查构建包成功来宣称测试迁移完成。

### Metadata
- Source: failed local upgrade experiment
- Related Files: ../karma.conf.js, ../tsconfig.json, ../docs/test-architecture.md
- Pattern-Key: infra.karma-typescript-ts5-bundling

### Context Maintenance
- Scope: 本项目 Karma/karma-typescript 5.5.x、TypeScript 5.5.4 与共享构建配置 2.0.0
- Authority: 升级后 Karma 0/0 和 `exports is not defined` 日志；还原后 Karma 109/109
- Revalidation: 旧测试迁移或 Karma 打包器修复后重试升级
- Validation: verified failure and rollback
- Last-Validated: 2026-11-02
- Evidence: ../docs/test-architecture.md

### Resolution
本轮依赖升级已撤回，主分支候选继续使用经验证的锁文件。用户决定在 V2 切换期间保留旧 Karma 回归与新浏览器测试并行运行，测试迁移另行推进；迁移与等价覆盖是升级 TS5 的前置条件。

## [LRN-20261102-014] solution

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: release-validation

### Summary
真实设备冒烟页只把结果写在屏幕上，会把上传长截图变成验收前置工作；应由页面向同源测试服务器回传结构化结果，并在服务器侧标记候选提交。

### Details
原验收页有 User-Agent、DPR、逐项 `PASS`/`FAIL` 和大图首次/稳定化像素，但 Mac 侧无法读取。新增仅在测试服务器 4173 端口接受的同源 JSON POST，限制正文大小与字段，保存 `test-results/mobile-smoke-reports/<id>.json`。服务器补充接收时间、请求地址和 `git rev-parse HEAD`；页面显示 `REPORT SAVED <id>` 或收集错误。Playwright 在 Chromium、Firefox、WebKit 中完整运行页面，验证收据和实际落盘文件；无同源 Origin 的 POST 返回 403。浏览器 User-Agent 不能精确证明设备机型，仍需设备持有人确认。

### Suggested Action
真实 iOS 验收时，在最终候选提交的服务上刷新页面，读取自动报告并核对全部断言和提交 SHA；不要只根据用户说“打开了”判定通过。

### Metadata
- Source: real-device acceptance workflow
- Related Files: ../test/browser/smoke.html, ../test/browser/server.mjs, ../test/browser/package.spec.ts
- Pattern-Key: validation.mobile-smoke-report

### Context Maintenance
- Scope: 本项目真实设备验收页及本地测试服务器
- Authority: 三浏览器完整页面测试、落盘 JSON 与无 Origin 请求的 403
- Revalidation: 服务器或冒烟页修改后重新运行完整页面测试
- Validation: verified locally
- Last-Validated: 2026-11-02
- Evidence: ../docs/v2-release-readiness.md

### Resolution
报告回传链路已具备自动测试；真实 iOS 的报告仍需实际设备刷新生成。

## [LRN-20261102-016] solution

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: test-infrastructure

### Summary
CI 中 Codecov 上传步骤成功，不代表独立的 `codecov/patch` 与 `codecov/project` 检查通过；本地“改动源码行已命中”的统计也不能代替远端对部分分支和项目总覆盖率的计算。

### Details
PR #603 初次远端 CI 与 CodeQL 均通过，但 Codecov patch 为 78.87%，低于 79.23% 门槛，project 为 78.70%，比 `master` 低 0.54 个百分点。GitHub check-run 的报告指出 `src/clone-node.ts` 有 4 行未覆盖、11 处部分覆盖；此前只看本地 LCOV 的改动行比例会漏掉部分分支。针对异常 `<use>` URL、错误片段转义、外部 SVG 缺失符号、外部 `xlink:href` 增加实际行为回归后，Karma 115/115；最新远端 Codecov patch 88.73%，project 79.41%（比基线高 0.17 个百分点），两项检查均通过。首次本机 Karma 全套运行另遇到既有视频对图偶发空白，复跑 115/115 通过；新增 SVG 用例在两次运行都通过。

### Suggested Action
对 PR 以最终 head SHA 核对独立 Codecov check-run 的结论和缺口明细；针对缺少的实际行为补测试，再判断覆盖率。不要只凭上传步骤为绿或本地行覆盖率宣布门槛通过。

### Metadata
- Source: PR #603 CI and Codecov check-run investigation
- Related Files: ../.github/workflows/ci.yml, ../test/spec/svg.spec.ts, ../src/clone-node.ts
- Pattern-Key: ci.codecov-upload-vs-checks

### Context Maintenance
- Scope: 本项目 PR #603 的 Karma LCOV 上传与 Codecov patch/project 检查
- Authority: 最新提交 `61d3ddf` 的远端 CI、Codecov check-run；本机 Karma 115/115
- Revalidation: 覆盖率提供方、上传源或阈值调整后重新核对
- Validation: verified locally and in PR checks
- Last-Validated: 2026-11-02
- Evidence: https://github.com/bubkoo/html-to-image/pull/603

### Resolution
补齐资源引用的异常与旧式属性回归后，两项远端覆盖率检查由失败转为通过。

## [LRN-20261102-017] solution

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: test-infrastructure

### Summary
迁移 Jasmine 回调用例时，Vitest 会把调用 `done()` 的用例列为通过，却另外报告未处理异常；首次加载 `pixelmatch` 时，Vite 的依赖优化还会重载测试页并使用例数变成 0。

### Details
把原有 `(done)` 用例改成原生 `async` 并等待完整 Promise 链；把 spy 和异步匹配器改为 Vitest API，开启 `restoreMocks`。旧 fixture 由测试服务器按原 `/base/test/resources/` 路径提供，不改 fixture 内容。`optimizeDeps.include` 显式包含 `pixelmatch` 后，冷启动不再触发测试页重载。本机 115 项原回归在 Chromium 下通过，合并新用例后的覆盖率运行有 138 项。

### Suggested Action
迁移测试运行器时检查未处理异常、实际用例数与冷启动；不能仅凭测试摘要中的“passed”判定回调式用例已正确等待。

### Metadata
- Source: local Vitest migration and cold-start failure
- Related Files: ../vitest.browser.config.mts, ../test/spec/basic.test.ts, ../test/spec/renderer.test.ts
- Pattern-Key: test.vitest-legacy-async-and-optimizer

### Context Maintenance
- Scope: 本项目 Jasmine/Karma 到 Vitest Browser Mode 的迁移
- Authority: 回调迁移前 Vitest 报 4 passed 加 2 unhandled errors；预优化前出现 0 test 与页面重载；修复后 115/115 与 138/138
- Revalidation: 升级 Vitest/Vite 或改变 fixture/依赖优化配置后重跑冷启动和完整回归
- Validation: verified locally
- Last-Validated: 2026-11-02
- Evidence: ../docs/test-architecture.md

## [LRN-20261102-018] solution

**Logged**: 2026-11-02 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: browser-rendering

### Summary
WebKit 能正确读取源 canvas 和克隆出的 PNG，却可能把包含异步解码图片的 SVG 栅格化成透明图；内部快照图片改用同步解码提示后，小 canvas 的最终像素稳定。

### Details
新增实际 UMD 构建包用例，在 Chromium、Firefox、WebKit 导出红蓝 canvas。修复前 WebKit 两个输出像素透明，源 canvas 和克隆 PNG 的相同位置均有颜色；将 `createImage` 的 `decoding` 从 `async` 改为 `sync` 后，默认一次栅格化的 WebKit 用例连续五次通过，旧 canvas 与视频 WebKit 用例通过，完整本地构建包 39/39 通过。单独增加 `stabilizationAttempts: 3` 曾仍然失败，不能以重试代替解码时序修复。移动端冒烟页也增加了 canvas 像素场景，等待真实 Safari 验收。

### Suggested Action
遇到 WebKit 图片空白时分段检查源像素、克隆图片、序列化 SVG 和最终画布，并在实际构建包中断言关键像素；不要只断言 data URL 非空或 Promise 成功。

### Metadata
- Source: built-package cross-browser regression
- Related Files: ../src/util.ts, ../test/browser/package.test.ts, ../test/spec/canvas.test.ts
- Pattern-Key: webkit.foreignobject-nested-image-decode

### Context Maintenance
- Scope: 本项目 V2 的 canvas/video 克隆图片和 SVG 栅格化
- Authority: 修复前 WebKit 透明输出与源 PNG 有色的分段诊断；修复后五次 WebKit 和全套本地测试
- Revalidation: 更换 WebKit/Playwright 版本或修改 `createImage` 时重跑构建包 canvas 用例
- Validation: verified locally
- Last-Validated: 2026-11-02
- Evidence: ../docs/v2-regressions.md

## [LRN-20261110-020] solution

**Logged**: 2026-11-10 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: browser-rendering

### Summary
HTML 合法注释中的 `--` 会使复制出的 SVG 失去 XML 可解析性；注释没有视觉内容，应在克隆时丢弃。

### Details
Issue #570 的 `bad -- XML comment` 被旧克隆流程保留，Chromium 的新源码测试在修复前报 `parsererror: Unexpected token '--'`。在 `cloneNode` 的统一入口跳过注释后，源码测试和实际 UMD 构建包在 Chromium、Firefox、WebKit 均验证 SVG 可解析、红色像素正确、源注释不变。已有对非法文本控制字符的序列化清理仍独立工作。本地覆盖率回归 139/139、三引擎行为 72/72、构建包测试 42/42 均通过。

### Suggested Action
HTML DOM 进入 XML/SVG 快照时，先按节点的视觉语义处理注释；不要在序列化后的字符串上删除类似注释的片段，以免误伤文本或样式内容。

### Metadata
- Source: Issue #570 failing-before-fix and cross-browser package regression
- Related Files: ../src/clone-node.ts, ../test/browser-unit/xml-comments.test.ts, ../test/browser/package.test.ts
- Pattern-Key: html-to-svg.comment-node-xml-compatibility
- Validation: verified locally; PR #606 and merged master CI passed

## [LRN-20261110-021] solution

**Logged**: 2026-11-10 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: browser-rendering-performance

### Summary
计算样式会在每个后代枚举继承的 CSS 自定义属性；逐节点复制相同值使大型 SVG 快照膨胀。

### Details
Issue #542/#536 提到大 DOM 卡顿，但缺少可复现的原始页面，不能直接归因。合成场景的 100 个变量在 100 个子节点上被重复复制；新三引擎测试在改动前全部失败，改动后验证祖先、shadow、slot 的继承，独立文档、子节点覆盖、像素和显式属性列表。构建后 UMD 也在三引擎验证。100 节点场景中，每个继承变量由 101 份降为 1 份，SVG 少约 168 KB；仍需真实大 DOM fixture 才能判断浏览器卡顿是否解决。

### Suggested Action
复制计算样式时，对未显式选择的 CSS 自定义属性比较父子计算值；相同值由复制后的父节点继承，不要写入每个子节点。保持显式选择列表和不同的子节点覆盖值。

### Metadata
- Source: Issue #542/#536 and failing-before-fix cross-browser regression
- Related Files: ../src/clone-node.ts, ../test/browser-unit/css-variables.test.ts, ../test/browser/package.test.ts
- Pattern-Key: html-to-svg.inherited-custom-property-duplication
- Validation: verified locally; PR #607 and merged master CI passed; reported heavy-DOM freezes remain unverified

## [LRN-20261110-022] solution

**Logged**: 2026-11-10 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: browser-rendering-performance

### Summary
避免重复序列化继承变量后，还要检查比较过程是否对每个同级节点重复读取同一父节点的计算值。

### Details
20 个子节点的三浏览器受控回归在修复前均观察到父节点 `--fill` 被读取 21 次。按捕获任务缓存父节点的变量值后，每次不超过 2 次；缓存于克隆阶段结束即清理，下一次捕获源变量变化仍得到新值。400 节点、300 变量的本机计时变化较小，不能据此认定 Issue #542/#536 的真实冻结已解决。npm 旧版对捕获根节点特有变量可能漏复制，性能对照必须先检查输出语义。

### Suggested Action
性能回归先断言可观察的重复操作次数与输出正确性，再用合成计时判断量级；对照旧版时确认两端复制了同一批样式。

### Metadata
- Source: failing-before-fix cross-browser regression and local synthetic benchmark
- Related Files: ../src/task.ts, ../src/clone-node.ts, ../test/browser-unit/css-variables.test.ts, ../docs/v2-performance.md
- Pattern-Key: html-to-svg.inherited-style-read-cache
- Validation: verified locally; reported heavy-DOM freezes remain unverified

## [LRN-20261110-023] solution

**Logged**: 2026-11-10 (Asia/Shanghai)
**Priority**: high
**Status**: resolved
**Area**: browser-rendering-performance

### Summary
Promise 微任务不会让浏览器处理计时器或绘制；大型 DOM 克隆需要主动让出主线程。

### Details
400 和 2000 节点的合成页面中，旧克隆流程虽是异步 Promise 链，10 ms 计时器在整个导出期间仍无法执行。300 节点的三浏览器回归在修复前均失败；按约 16 ms 克隆时间片用 `MessageChannel` 浏览器任务让出后，计时器可在复制中途执行，SVG 节点数不变。2000 节点的最长停顿从约 0.8–1.0 秒降到约 0.19–0.24 秒，总耗时在不同单轮运行中接近；资源处理和 SVG 序列化仍有长任务。原 Issue #542/#536 页面缺失，不能认定已解决。

### Suggested Action
将主线程响应性与总耗时分开度量。对大型导出记录计时器最长间隔、各阶段耗时和输出语义；避免用微任务边界当作浏览器调度让出。

### Metadata
- Source: failing-before-fix cross-browser regression and local synthetic event-loop benchmark
- Related Files: ../src/task.ts, ../src/clone-node.ts, ../test/browser-unit/capture.test.ts, ../docs/v2-performance.md
- Pattern-Key: html-to-svg.cooperative-clone-scheduling
- Validation: verified locally; original heavy-DOM freezes and full serialization responsiveness remain unverified

## [LRN-20261110-024] solution

**Logged**: 2026-11-10 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: browser-rendering

### Summary
滚动容器有直接 fixed 子元素时，不应放弃整个容器的滚动修正；位移正常内容后还要保留 fixed 的叠放顺序。

### Details
三浏览器对照中，源页面的 fixed 蓝色覆盖层与滚动后的绿色内容可见，旧导出却在内容区显示未滚动的红色。根因是 `cloneScrollState` 一看到直接 fixed 子元素就整体退出。仅跳过 fixed 的位移后，绿色内容出现但蓝色覆盖层被变换后的兄弟元素压住；这些兄弟元素形成了新的 stacking context。为自动层级的 fixed 副本设置层级后，两处像素均正确。额外验证 fixed 子元素在滚动容器视口外仍可见、RTL 负 `scrollLeft` 保持正确，源 DOM 不变。深层 fixed/sticky 组合仍需单独验证。

### Suggested Action
滚动副本的正常流内容、固定层和叠放顺序要分别对照像素；只检查滚动后内容颜色会漏掉覆盖层回归。

### Metadata
- Source: Issue #594 follow-up and failing-before-fix cross-browser pixel regression
- Related Files: ../src/clone-node.ts, ../test/browser-unit/capture.test.ts, ../test/browser/package.test.ts
- Pattern-Key: html-to-svg.fixed-child-scroll-viewport
- Validation: verified locally in three browser engines; original Windows fixture and nested fixed layouts remain unverified
