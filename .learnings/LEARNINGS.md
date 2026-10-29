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
