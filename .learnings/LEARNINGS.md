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
公共 npm registry 的 `html-to-image@1.11.13` 指向 `gitHead=9957281`，与 Git 标签 `v1.11.13` 一致；切换前 `master=e842e84`，中间 26 个提交。已将原 `master` 原样归档到远端 `archive/pre-v2-master`。旧共享 semantic-release 配置按普通 `feat` 规划次版本，只有带 `BREAKING CHANGE` 的提交会规划主版本；旧 release workflow 在推送 `master` 时自动发布且只跑旧测试。V2 工作流已改为手动发布，发布前复用 CI、核对主分支 SHA、实际压缩包、试算版本与 npm 前一版本。真正的远端手动发布路径要在切换后验证。

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
