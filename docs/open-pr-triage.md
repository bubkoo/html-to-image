# 开放 PR 处理台账

## 2026-11-24 外部 SVG 资源时序的只读观测

干净页面在加载 SVG 前启用资源时序观察和独立 fetch 正向控制，三组浏览器均能记录部分嵌套绘制 URL；6 张源前后截图逐通道相同（每组 17600 RGBA 通道），共 33 列原生场景。
同页多个 use 引用会留下页面目录与文件目录等多条资源记录，单凭这组全页记录不能唯一归属到每个元素，也不能推广到任意缓存历史或 CSP。未据此加入运行时分支。

[14 份控制器、请求/时序记录、源图片及重放](evidence/svg-resource-timing.json)保存实际版本：Chromium 156.0.8078.4、Firefox 159.0、WebKit 27.2。预期 Firefox 1555 不在本机，已明确使用本机 1578/Firefox159；不计为 Firefox157、构建包三引擎或真实 iPhone 复验。
没有调用库导出或更改生产源码，查询资源字节仍故意相同，不声称查询身份已解决。下一步若采用新鲜上下文 HTTP 探测，还须证明缓存、CSP 和资源策略边界可靠；#585 整体保持开放。

原始 28 个 PR 的当前状态与 head 已重新读取，仍为 27 开放、#398 关闭，head 未变。GC 固定镜像下载进程仍在运行，重建脚本仅在该进程结束且准确镜像存在后执行；尚无新环境基线或真实堆采集结果。

## 2026-11-24 恢复推进：重建隔离环境，准备失败后采集

当前 Docker 的容器与镜像清单为空，旧诊断现场不再存在；正在拉取已归档的准确 amd64 镜像摘要，尚未完成新环境基线或实际堆采集。
采集钩子已生成并通过语法解析，测试文件仍为 4520 字节，原始断言与三次回收保留。它只在失败布尔值固定后运行，并先把原始诊断写入 Node 侧回执，再请求快照；语法通过不是类型、运行时或真实失败采集验收。

准确 d75d622 的 PR CI 44369692907：coverage 1234 通过 / 4 跳过，source 1110 通过 / 5 项 Firefox 回收失败 / 4 跳过；直接推送 CI 44369678841：coverage 1234 通过 / 4 跳过，source 1112 通过 / 3 项 Firefox 回收失败 / 4 跳过。
两轮构建包未运行。[104 份完整远端日志/产物及采集准备输入](evidence/gc-observer-controls/heap-resume-summary.json)已归档。主分支/旧 head 的绿色不能代替这些失败；PR 仍为独立诊断草稿，没有生产修复或新增真机结论。

## 2026-11-19 堆快照工具小目标完成，按用户要求暂停

独立 Firefox 157.0 的已知强持有路径正向控制通过；负向样本返回的 3 条路径均包含弱引用/条件 WeakMap/检查器边，没有未经标记的持有路径。每起点最多 20 条路径，不能据此证明完全不可达。
工具尚未用于真实失败现场，不新增库根因、修复或整套测试通过结论。[30 份源码、控制日志、原始快照和清理回执](evidence/gc-observer-controls/heap-tool-controls-summary.json)已归档。

早期失败也保留：未登记 DevTools 时堆文件 IPC 拒绝并终止内容进程；快照前节点地址移动及跨隔间代理身份造成错误匹配。最终方案只在采集期间调用官方登记/撤销接口，保留原始路径并分类，不删除浏览器检查。
设备/系统浏览器未操作；自有容器 Firefox 原文件哈希已恢复，源码/配置/测试无差异，容器已停止。下一步（恢复后）先核对带被动诊断工具但不采集的基线，再于原始失败结果固定后采集实际路径，明确标记检查器引入的根。

## 2026-11-19 原生基线复验失败，撤回唯一触发条件推断

Q1 在原生复制路径只增加一次未使用的 source.implementation 读取，完整覆盖率为 1224 通过 / 1 项 Firefox iframe 回收失败 / 4 跳过。
随后 S1 恢复与此前通过的 I3 逐字节一致的原生基线，也出现同项失败（原生移除控制已回收、目标未回收）。因此之前创建者/导入/属性读取的单轮差异，不能当作稳定的唯一因果隔离。

[68 份完整输入、日志/产物与版本固定的上游源码](evidence/gc-observer-controls/native-baseline-summary.json)已归档。
源码显示 Document 与 DOMImplementation 存在原生持有环且均参与循环回收；这不是泄漏或真实持有根的证明。
下一步转向失败布尔值固定后的实际持有链，覆盖原生复制、测试与 Promise 调用上下文，并分开记录检查器引入的引用。原断言、三次回收、超时和跳过未放宽，无生产修复或新增真机结论。

## 2026-11-19 原生文档创建上下文的单轮对照（基线复验见上）

准确 9a391dc 的本地三引擎覆盖率：M1 由源 implementation 创建文档并 importNode，P1 由源 implementation 创建文档但用自带空 body，两者均为 1224 通过 / 1 项 Firefox 文档回收失败 / 4 跳过。
O1 只改为当前页面 implementation 创建目标并保留 importNode，1225 通过 / 4 跳过。失败两组都是原生移除控制已回收、目标未回收；这个子集不需要库克隆、捕获或 importNode，但尚未查明持有根。

完整库 E1 改创建者仍失败的反例继续保留，不能把原生子集差异当作完整修复。原断言、三次回收、超时、跳过和 4520 字节排序条件不变；M1/P1 失败后的输出断言未运行。
下一步区分 source.implementation 属性读取与创建调用。[167 份输入和完整日志/产物](evidence/gc-observer-controls/native-operations-summary.json)已归档；无生产修改或新增真机结论。

准确 a94c02d 的 PR CI 44364243412 通过 1234 / 1115 / 162（4/4 跳过）；随后准确 93d83ee 的 PR CI 44365244006 失败：coverage 1234，source 1112 通过 / 3 项 Firefox 环境与取消回收失败 / 4 跳过，构建包未运行。
两轮完整日志及上传产物均已保留，不用较早绿色替代新 head 的结果。

## 2026-11-19 克隆路径的进一步缩小

准确 `9a391dc` 的同一 Linux 现场中，原生样式复制 I3 完整通过 1225 / 4 跳过；只切换到库捕获的 J1 为 1224 通过 / 1 项 Firefox iframe 文档回收失败 / 4 跳过。去掉渲染器捕获/任务/快照持有、只调用库 cloneNode 后序列化的 K1 同样失败；两轮诊断均为原生文档已回收、目标文档未回收。这说明本地反例不需要渲染器持有快照，尚未证明根因。

原生复制增加伪元素样式读取的 L1 完整通过 1225 / 4 跳过，不能将这些读取单独认定为根因。各阶段测试文件均 4520 字节，排序缓存仅清除 results.json，原断言、三次回收、超时、跳过未变；K1 的回收断言失败后未执行其图像检查，不声称其输出已验收。[95 份原始记录与配对说明](evidence/gc-observer-controls/matched-clone-summary.json)已归档；下一步隔离原生 importNode/创建文档等操作。

原始 28 个 PR 已重新读取：27 开放、#398 已关闭，各 head 与台账一致。关闭不当作真机交互验收。没有生产修改或新增真机结论。

## 2026-11-19 视频增量已合入，回收诊断恢复

[#647](https://github.com/bubkoo/html-to-image/pull/647) 最终 head `9a2e38f` 的独立 CI 43682587522（受测合并 `4e3dfe3`）通过 1234 coverage / 1115 source / 162 构建包，4/4 既有跳过；CodeQL 43682587514、Codecov 两项及其他检查全过，无待解决审阅。已合入 `f8d1c4b`；主分支 CI 44363483198 已失败：coverage 1234 / 4 跳过，source 1112 通过 / 3 项 Firefox 回收失败 / 4 跳过，构建包未运行；全日志和上传产物已归档。真实 iPhone 六组对照及范围见下文，不把本次增量当成 #451/#585 整体完成。

#646 现场恢复：失败后读取的有限引用图为 54 节点 / 195 边、未找到目标、无读取错误；WeakMap 和取消监听器有正负控制，仍有优化掉的绑定和浏览器内部引用未覆盖，不能证明没有泄漏。原生样式复制/序列化对照完整通过 1225 / 4 跳过；此前暂停中断的 I2 没有完整结果，保留为中断。下一步在同一现场恢复库捕获做配对确认，尚无生产回收修复。[93 份恢复记录](evidence/gc-observer-controls/recovered-summary.json)明确说明主机临时诊断补丁未恢复，不能声称该部分实验已完整可重放。

## 2026-11-15 无帧视频真实 iPhone 验收完成

[#647](https://github.com/bubkoo/html-to-image/pull/647) 的源码 `ea97a25` 在文档 head `783e9c4` 完成真实 iPhone Safari/iOS 26.6.1 验收（非模拟器）：ESM/UMD × 3 模式共 6 对照、12 张源前后照片，每项 11264 RGBA 通道完全相同；完整冒烟 38 PASS / 2 INFO / 0 FAIL，另 4 项取消/清理控制通过。104 份运行输入哈希未变，设备会话和自建测试服务已释放；不声称设备 GC 通过。[203 份原始记录与重放](evidence/video-empty-frame.json)保留前两轮远端失败。

`783e9c4` 的 CI 43676719909 已通过 1234 coverage / 1115 source / 162 构建包（4/4 既有跳过），CodeQL 43676719916、Codecov 两项及其他检查通过。运行输入未变，因此此次绿色不能证明已修复早先 GC 失败，继续由 #646 排查。补充本次证据后的最终 head 仍须检查，尚未合入；整体 #451/#585、海报历史和其他媒体状态继续开放。

## 2026-11-15 相对 SVG 绘制地址的进一步隔离

#585 继续遵循用户选择的当前浏览器页面显示。新增真实 HTTP 三引擎各 11 列对照：属性、行内样式和查询场景在 Firefox/WebKit 原生从 SVG 文件目录解析，导出却采用页面目录，各差 2400 通道；Chromium 全部相同。其他文件名、父目录、绝对地址、缺失 ID、纯片段与纯色控制保留，所有源前后逐通道不变。查询资源故意同色，不能据此声称任意查询身份正确。

[34 份原始记录与重放](evidence/svg-qualified-paint-bases.json)同时保留被否定的 Blob 裁剪能力探针及首次 srcdoc History 操作失败：该探针不能可靠代表 HTTP 绘制地址行为，不据此写运行时分支，也不按浏览器名称猜测。没有生产修复或新增真机结论；相对 paint 继续开放。

#647 第二轮准确 head `9ee0951` 的 CI 43676154456：coverage 1234 通过 / 4 跳过；source 1112 通过 / 3 项 Firefox 回收失败 / 4 跳过；构建包未运行。两套视频用例各 12 项通过，CodeQL 43676154395 通过。完整日志及全部上传产物已归档，无海报视频证据增至 155 份，104 份输入哈希仍一致。PR 保持草稿，未以局部通过合入。

## 2026-11-15 无海报、无帧视频的可见空白区域

源码 `ea97a25` 修复 `currentSrc` 非空被误当成已有帧的问题：无海报且 HAVE_NOTHING 时原生只有背景/边框，旧路径却把 0×0 画布的 `data:,` 当图片加载并失败。现在保留透明媒体区域及原尺寸/背景/边框；已解码帧与海报路径不变。

同一三引擎定向组修复前 9 失败 / 3 通过，修复后 12 通过；原 3 项真实视频比例控制仍通过。完整本地 1234 coverage / 1115 source / 162 构建包、lint/构建/类型/包消费者通过，4/4 既有跳过未增加。ESM/UMD 的 18 个真实源截图对照逐项 11264 通道相同，源前后及输入哈希不变。[203 份原始记录、104 份输入哈希与重放](evidence/video-empty-frame.json)已保存。

额外对照发现 WebKit 初始海报与 pending play/pause 后可以有相同的已记录公开状态、却显示不同画面；不能机械按 readyState 回退海报。该历史状态边界、其他媒体状态与原提案的更广范围继续开放。后续真实 iPhone 已通过（见本页最新验收记录），最终证据 head 远端门禁待验；不按整体视频或 #585 完成。通用 Linux GC 仍由 [#646](https://github.com/bubkoo/html-to-image/pull/646) 独立排查，未发布 npm、未操作旧 PR。

首轮准确 head `a388d1a` 的 CI 43675541223：coverage 1234 通过 / 4 既有跳过；source 1111 通过 / 4 项 GC 失败 / 4 既有跳过，构建包未运行。两套的三引擎视频用例各 12 项全部通过，CodeQL 43675541268 通过。三项 Firefox 环境/取消和一项 WebKit 源文档失败完整保留，不据同名失败判断根因。此为保留的首轮失败；后续真机和远端结果见本页最新验收记录。

## 2026-11-15 本机 Linux 的独立、稳定失败现场

在独立 Docker Linux/amd64 仿真环境，以准确 `9a391dc` 和远端相同的 Node 24.22.2 / pnpm 10.34.9 / Playwright 1.64.1，完整覆盖率连续 7 轮为 1224 通过 / 1 项 Firefox 失败 / 4 既有跳过：移除 iframe 后，原生文档已回收，持有快照的文档仍存活。这是曾出现过的相近生命周期失败，不宣称已在本地复现远端原三项。首轮在 coverage 停止，source/构建包浏览器步骤未运行；单独定向 11 通过 / 1 跳过、随后诊断 source 1106 通过 / 4 跳过不能替代首轮失败。

排序缓存为空的对照中，提前浏览器往返、明确的 MessageChannel 任务边界、仅关闭 captureFrame 超时、仅改变副本文档创建者，都未消除失败。原断言与三次回收保留，未以加回收/延时/放宽像素改成通过；实验源码、配置和测试均已恢复。下一步检查实际持有链。[本机 321 份输入与记录](evidence/gc-observer-controls/local-linux-summary.json)含各阶段完整日志和独立产物；GC 档案共 1238 份文件，明确记录 x86_64 仿真、CPU/内存差异，不能作为 GitHub CI 或真机通过。


## 2026-11-15 HTTP 文件样式与文件字体的原生对照

按 #585 已确定的当前页面规则，基础/嵌套 HTTP CSS 导入在三引擎的外部 use 中均未应用，现有导出与实际源的全 6400 通道相同；同一个 SVG 作为独立文档打开则两项均生效，证明资源和规则有效。Firefox 请求了样式文件也不代表规则用于外部 use。[34 份控制器、照片、请求与源码](evidence/svg-http-import-native.json)保留最初观测与独立文件正向复验；这个限定子集等价，不强行导入以改变原生显示。

文件内 HTTP @font-face 的受控场景也匹配独立回退字体几何；独立文档会加载真实字体，AA 的 advance 变为 40px，不能拿独立文件当外部 use 的标准。Chromium/Firefox 源与导出逐通道相同；WebKit 差 55 通道、各差 1，独立手写回退 SVG 图像有完全相同的差异并与库输出相同，不计为严格原生像素通过。[43 份原始文件](evidence/svg-file-font-native.json)同时保留字形悬出导致 bbox 就绪条件错误的首轮超时。仅验证 ESM，没有生产改动、新增 UMD 或真机结论；其他字体状态、CSP 和限定 paint 仍开放。


## 2026-11-15 未运行 SVG 探针的回收失败：补配对原生控制

#646 的 `6b6150a` 普通 PR/推送仍失败（source 1103/1102 通过，3/4 失败）；逐一核验两次执行的排序快照与恢复哈希后，同配置重跑、仅开放图写入配置仍各有 3 项 Firefox 失败，CC 日志运行却全过。因此不把日志版的绿色或暂时存活对象归为生产根因。完整 PR 图已核验为 150 份 / 458889508 字节，本仓保留清单与两份选中图；推送完整图未下载。1006 次文档观测不是独立泄漏数，日志运行的原主检查全部回收，不能将其中临时 SVG/ImageData 根归给普通失败。

由于未运行 SVG 探针的主检查也失败，新增六种原生环境配对，比较 sandbox、资源策略文档（含基础样式）、Promise reaction 和加载后策略；只在已缓存主结果后的补充观测创建。Mac 定向 12 项和完整 1225 coverage / 1106 source / 159 构建包通过，4/4 既有跳过不变；18 份记录的 306 个补充对象全回收，没有复现 Linux 故障。生产源、原主检查与三次回收命令未改；新控制的 Linux 结论待验。

[824 份原始记录与重放](evidence/gc-observer-controls.json)已保存。下一轮移除已证明会改变观测结果的自动 sandbox/CC 图步骤，保留普通三引擎运行与相同排序输入的重跑；#646 仍为排查草稿，不声称回收问题已修复。

最新 `9a391dc` 的 PR CI 43677392127 / 推送 CI 43677387222 均为 coverage 1225 通过、source 1103 通过 / 3 项 Firefox 失败，构建包未运行，4/4 既有跳过不变。逐项核验相同排序恢复后，PR 重跑仍失败三项，推送重跑 1106 全过；216 次新增原生观测全部回收、没有错误。这些设置差异单独不足以复现原对象留存，不能给单一机制修复信用。[证据](evidence/gc-observer-controls.json)现含 917 份原始文件；新 93 份已下载并核验，随本次证据提交归档。

## 2026-11-15 对照通过受排序缓存影响，固定输入后继续定位

#646 head `20b841a` 普通 PR CI 43671204701 三项 Firefox 失败（source 1103 通过），push CI 43671201382 五项失败（1101 通过）；coverage 均 1225 通过 / 4 既有跳过，构建包未运行。随后三引擎、无日志的写图配置对照均 1106 通过 / 4 既有跳过，CC 写图步骤因此跳过，并未取得远端引用图。

实际安装的 Vitest 5.0.5 会按缓存把上次失败文件提前；日志中 Firefox 的资源取消文件完成顺序从第五位移到第一位。完成顺序不等于精确开跑顺序，但足以揭示排序输入未控制，不能把后续通过归因于运行配置或日志。[92 份准确远端记录及排序器证据](evidence/gc-observer-controls/cc-configuration-pair-summary.json)已保存。

下一轮在 coverage 与 source 之间保存排序结果缓存，后续每轮恢复并核对 SHA256；先同配置重跑，仍失败才切换写图配置，再失败才采集 CC。原回收命令、主测试、三次回收和断言不变，不把对照通过替换正常失败。本地 lint/类型、12 原测试和缓存往返校验通过，23 份本地输入/记录另存；11 组归档共 644 份文件校验通过，生产/构建包未改，草稿继续。

## 2026-11-15 原始 28 项状态重新核对

[本次只读查询](evidence/open-pr-live-refs-20261115.json)确认 28 项提交 head 均未变化，目前 27 项开放；#398 于北京时间 2026-11-15 03:38 由 bubkoo 关闭且未合并。关闭不等于真实点击验收，手机可信点击/新标签页的缺口继续保留。本次未评论或关闭任何旧 PR。

当前主分支为 `901c4bc`。索引已补齐 #632/#633 合入与真机状态，以及 #643/#644 已验收的 SVG 子项；移除仍写“待合入/待远端”的过期描述，同时保留 #644 主分支 GC 失败与草稿 #646 的未解决边界。原始 28 项继续作为完整清单，不因 #398 已关闭而减少目标范围。

## 2026-11-15 一次任务边界不足以解释失败，改用同并发的循环引用日志

#646 head `31e2952` 两轮失败的三个 Firefox 文档，在入口、微任务后、一次任务后均保留（零显式 GC）；普通对象未回收，强对象控制有效。因此不支持靠增加一次任务延时解决。PR CI 43670467884 为 source 1103 通过 / 3 失败；push CI 43670464573 为 1100 通过 / 6 失败，另有两个 Firefox opened-source 和一个 WebKit 冻结源失败。两轮 coverage 1225 通过 / 4 既有跳过，构建包未运行。

前一 head `1e4c799` 的 push CI 43670168332 全部通过（1225 / 1106 / 159），PR CI 43670171072 则有三项 Firefox 失败。四轮全部产物及准确输入另存 134 份原始文件。[逐项结果](evidence/gc-observer-controls/checkpoint-runs-summary.json)不覆盖任何旧失败。

下一轮先仅控制写图所需的运行配置；若仍失败，再在同样三引擎并发下只采集循环引用图，去掉全堆图与逐次回收的文件读写。实际本机 Firefox 已验证关闭全堆图开关；lint/类型和原 12 测试通过。18 份本地输入/记录/日志/图清单独立保存，九组共 529 份原始文件校验通过。Linux 仍待验，原 GC 命令、主断言、回收次数、生产代码及构建包未改，草稿暂不合入。

## 2026-11-15 增加零回收请求的时序对照

#646 下一轮在构造额外环境之前，对原弱引用依次记录入口、微任务后和一次零延时任务后状态；此阶段不调用 GC。原三次回收及已缓存的主断言完全不变，后续结果不能让失败变通过。它用来检查延迟清理/采样问题；自然 GC 未禁用，不能单凭后续回收断定具体浏览器根因。

Mac lint、类型及 12 项既有测试通过，9 个原始文档在三个采样点均已回收；微任务一致性与强对象控制有效，新 canary 未回收。17 份本地准确输入/记录/日志已独立归档，七组共 377 份校验通过。Linux 结果待验，生产代码和构建包未改，草稿暂不合入。

## 2026-11-15 引用日志未复现失败，保留普通门禁结论

草稿 #646 head `1e9da66` 的正常 PR CI 43669494382 为 source 1100 通过 / 6 项 Firefox 失败，push CI 43669490573 为 1101 通过 / 5 项 Firefox 失败；两次 coverage 均 1225 通过、4 既有跳过，构建包未运行。除原三个环境/取消失败，还出现 opened SVG 源文档（有/无字体），PR 另有已移除 iframe 的 capture 生命周期失败，不将范围仍写成三项。

两次独立 Firefox 日志版均 368 通过 / 2 既有跳过，四个原始采样及辅助观察均回收，因此未抓到失败引用链。日志开销、只运行 Firefox、独立进程和执行顺序同时变化，不能宣称根因或修复。[178 份选取记录、索引及准确输入](evidence/gc-observer-controls/root-trace-pair-summary.json)已归档，六组共 360 份文件校验通过。仅传输约 377 KB 提取 ZIP 中全部非引用图条目，未下载约 463/535 MB 的完整图产物，不宣称完整图归档。

已移除高开销日志步骤及逐次图采集，相关两文件准确回到 `b746718`；轻量配对观察仍留在草稿。生产代码/构建包未改，普通失败未解决，长期目标继续，#585 限定 paint 地址等独立缺陷仍开放。

## 2026-11-15 SVG 清理假设未成立，转向引用关系日志

草稿 #646 head `b746718` 的 PR CI 43668914513 为 source 1103 通过 / 3 项 Firefox 失败；push CI 43668909662 为 1102 通过 / 4 失败，另有 WebKit 冻结源文档失败。两轮 coverage 均 1225 通过、4 既有跳过，构建包未运行；PR CodeQL 43668914467 通过。两轮镜像均为 20261111.196.1，失败并非仅发生于 PR 事件。

配对 SVG 移除控制与清除 href 的分支各三种观察形式仍全部保留，虽实际清除 8 个引用，也未足以消除现象；不能据此提交生产清理补丁。较早构造的普通库环境后来回收，部分原始文档也仅在失败采样后回收。辅助 Firefox capture 的无超时/清空源变量控制回收，而原形式保留，但主 Firefox capture 通过，不能直接推为生产根因。[完整 67 份本轮原始证据](evidence/gc-observer-controls/expanded-pair-summary.json)与前轮分开保存；五组归档共 182 份校验通过。

下一步仅在正常门禁失败后追加 Firefox 引用关系日志，日志版结果独立保存且不能替换正常失败。Mac 日志管线、lint/类型及 4 项既有 Firefox 测试通过；尚无 Linux 引用链结论。生产代码、主断言、三次主回收及超时不变，草稿暂不合入。

## 2026-11-15 Linux 配对结果：观察形式不足以解释保留

草稿 [#646](https://github.com/bubkoo/html-to-image/pull/646) head `2a0cc805` 的直接推送 CI 43667097221 全过（1225 / 1106 / 159）；PR CI 43667274475 则 coverage 通过、source 三项 Firefox 失败（1103 通过 / 4 既有跳过），构建包未运行，CodeQL 43667274484 通过。镜像和 CPU 同时不同，不能归因于推送或 PR 事件。

失败 PR 的 source 记录中，已测量环境在三种观察函数下均保留，原生补充控制均回收，普通对象 canary 均回收；该环境源字体为空。未测量环境则在额外诊断后回收。原始 native 控制并非逐项都回收，不能从合并错误文本作统一判断。[63 份远端原始文件及逐套件摘要](evidence/gc-observer-controls/first-pair-summary.json)明确区分 coverage 与 source，不覆盖既有失败。

下一轮只追加配对控制：计时器是否捕获 iframe、双方同样包装的 SVG 移除（只一方清除自有 href），以及辅助 capture 禁用超时。记录顺序及采样年龄，避免把包装/时间变化误算为清理效果。Mac 原 12 测试、9 原始采样和 117 辅助观察通过，尚无 Linux 根因或修复结论。主断言、三次主回收和超时不变，生产代码/构建包未改，草稿暂不合入。四组归档共 115 份原始文件校验通过。

## 2026-11-15 合入后仍有生命周期失败，追加观察者配对控制

[#645](https://github.com/bubkoo/html-to-image/pull/645) 准确 head `88e970f` 的 CI 43664124670 / CodeQL 43664124833、Codecov（patch 不受影响、project 87.42%）全过，已合入 `901c4bc`。但新主分支 CI 43664877371 仍失败：coverage 1225 通过 / 4 既有跳过；source 1102 通过 / 4 失败 / 4 既有跳过，构建包未运行。除原三项 Firefox 文档回收，还出现 WebKit 冻结 SVG 源文档回收失败；主分支 CodeQL 43664877309 通过。PR 受测合并与主分支文件树完全相同，Ubuntu 镜像版本也相同，不把同步缺口修正称为全部生命周期问题已解决。

[24 份准确失败数据与配对控制](evidence/gc-observer-controls.json)保留全部 12 份上传产物。下一步在原三次回收后先固定原始布尔结果，再记录原生/库 owner、有无就绪计时器、三种弱引用观察函数及清空源局部变量的对照；额外三次诊断回收不能改变原始通过条件。主断言、超时和既有跳过不变。仅输出纯值及白名单执行信息，临时比较直接推送与 PR 合并两种运行，生产代码未改；草稿不得作为修复合入。

Mac lint/类型与 12 项既有测试通过，9 个原始采样及 60 条辅助观察均回收、无辅助错误；这不是 Linux 复现，也不计为 60 个新增测试。排查继续，相对 SVG paint 等独立缺陷保留；未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 回收检查与内容进程同步

排查 #644 合入后的三项 Firefox GC 失败时，发现测试工具把父进程的回收请求返回当作内容进程完成。准确工具链 Firefox 157.0 的 20 次日志实验（主页面与实际子页面各 10）均显示：请求返回时当前内容进程的 GC/CC 日志仍在写入，目标页面往返后全部结束写入；进程身份由独立堆标记识别，其他进程仍写入的负对照保留。它证明同步缺口，不证明所有不可达对象一定回收，也不把旧失败重新认定为生产泄漏。

修复源码 `771df53` 只在原 `requestGC()` 后等待实际测试 Frame 往返，仍为三次回收，无固定延时、额外回收、断言/超时/跳过放宽。35 项生命周期检查（另 1 既有跳过）及完整 1225 coverage / 1106 source / 159 构建包通过，4/4 既有跳过未增加。273 份输入中仅测试工具配置改变，生产、fixture、构建包与 #644 真机输入一致，不声称新增真机验收。

[123 份原始记录与重放](evidence/svg-environment-release-gc.json)保留主分支失败全部产物、20 组日志和独立进程反例。未加同步的草稿 head `ffa8c98` 在 Linux CI 43662607630 / CodeQL 43662607463 也通过（1225 / 1106 / 159，日志版 Firefox 368 通过 / 2 跳过），说明基线本身并非次次失败，不将它算为修复效果。438 MB 诊断产物只提取并核验所需日志和 ZIP 索引，不宣称全部堆图已归档。临时采集步骤已移除；新准确 head 的远端与后续主分支检查仍待验。

## 2026-11-15 #644 合入后 Firefox 文档回收失败

[#644](https://github.com/bubkoo/html-to-image/pull/644) 已合入 `8d4991e`，准确 PR head `e664f65` 的 CI 43661113765 / CodeQL 43661113735、Codecov patch 95.06% / project 87.42% 全过（1225 / 1106 / 159，4/4 既有跳过），同源真机验收范围见下节。但主分支 CI 43661748647 失败：coverage 1225 通过 / 4 跳过；source 1103 通过 / 3 项 Firefox 文档 GC 失败 / 4 跳过；构建包未运行。主分支 CodeQL 43661748582 通过，不能以 PR 检查代替本次主分支失败。

两个已释放但仍持有的环境未回收，配对原生文档已回收；待字体取消控制未回收，追加诊断中纯原生/共享字体文档回收，而原生测量和库测量文档仍保留。原因尚未建立，不把绘制修复称为 GC 修复。[全部十份失败产物、日志及准确输入](evidence/svg-environment-release-gc.json)已归档；下一步仅在独立排查分支追加 Linux 持有关系日志，原断言、三次回收、超时及跳过不变，诊断重跑不得覆盖主检查结论。Mac 的三项日志能力验证通过但未复现，不能推广为 Linux 根因或修复。

## 2026-11-15 外部 SVG 片段绘制与源树隔离

源码 `f3ab937` 按用户确定的当前浏览器页面保真处理 #585/#427 的片段绘制。WebKit/真实 iPhone 的外部 `<use>` 可从所在页面或 ShadowRoot 查找同名图案；此前导出错误补齐文件定义。现以私有裁剪能力控制选择作用域，嵌套引用继承原始源树，并将源树纳入缓存身份。实际自定义 Blob 的虚拟依赖图与页面已显示的原生实例分开处理；只为跨源树、被引用的 SVG 目标分配新 ID，保留无关 ID 和明确 onClone 改名。

最终同一 102 输入：父运行时 38 失败 / 64 通过，候选 102 通过，源页面与独立语义参考全部一致。98 项与原生屏幕逐字节相同；4 项 WebKit 渐变各差 153 通道、最大值差 1，独立手写 SVG 同样出现该边界，候选与独立图像完全相同，不计为原生字节相等。完整本地 1225 coverage / 1106 source / 159 构建包及 lint、构建、类型、tarball 消费者通过，4/4 既有跳过未增加。

同一源码真实 iPhone Safari/iOS 26.6.1 的 ESM/UMD 共 68 对照、136 张前后照片完成：60 项原生像素相同，8 项为上述渐变边界；全部 68 项独立图像与原生语义参考正确。另 4 项取消控制、完整冒烟 37 PASS / 2 INFO / 0 FAIL 通过，源码/产物哈希未变，会话与服务已结束。[3206 份原始记录与重放](evidence/svg-fragment-paint.json)保留早期失败，含过度改名导致的三项 iframe ID 断言失败，以及同轮三项原因未明的 Firefox GC 失败；未放宽断言、超时、GC 次数或像素阈值。

前批 [#643](https://github.com/bubkoo/html-to-image/pull/643) 已合入 `be2cf35`：最终 PR CI 43654581144 / CodeQL 43654581143、Codecov patch 95.83% / project 87.12%，主分支 CI 43655366497 / CodeQL 43655366483 全部通过（1108 / 989 / 156）；首轮失败保留历史证据。旧探针曾复用 symbol 与 paint 的同一 `inner` ID，不能据此推断嵌套渐变不支持，原记录已加注。限定/相对属性与行内 paint、不同查询文档及其他边界仍开放，#585 不按整体完成。新 PR 精确 head 远端门禁待验；未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 外部 SVG 重定向最终地址

源码 `bafedeb`（生产修复 `5ece820`）保留 HTTP 最终响应地址，并将它用于 SVG 文件 CSS、相对资源和作用域别名。此前重定向后仍沿用请求前地址，原生绿色渐变被导出成错误目录里真实存在的红色渐变。资源加载仍返回 Blob、复用同一等待 Promise；地址元数据与字节共用缓存身份，释放和迟到响应不能留下旧元数据。自定义 Blob 解析器保留各自请求地址，缓存刷新用的内部参数不成为 SVG 文档身份。

同一最终输入三引擎共 6 项原生对照：只撤回两份运行时文件时 2 失败 / 4 通过（Chromium 每项差 1600 通道、原生与独立参考一致），恢复后 6 项全过；包含真实 HTTP、资源与导入控制的定向组 99 项通过。最终完整本地 1108 coverage / 989 source / 156 构建包及 lint、构建、类型、tarball 消费者通过，4/4 既有跳过未增加。真实 iPhone Safari/iOS 26.6.1 的 ESM/UMD、cacheBust 开/关 4 组原生对照及 8 张前后源照片、4 项取消控制、完整冒烟 36 PASS / 2 INFO / 0 FAIL 全过；其文件 CSS 本来不生效，不称为 Safari 正向外部 CSS 修复。会话与服务已结束。

[首批 259 份原始文件与重放](evidence/svg-response-bases.json)保留两类初始失败：查询参数导致原生与独立参考不等价，以及 USB HTTP 页面缺少 crypto.randomUUID；后者改用 getRandomValues 后在同一最终源码重做桌面全套和真机。另归档尚未修复的真机 paint 差异：限定地址回退紫色，#paint 可引用页面同名蓝色定义，导出仍可能错误补齐文件绿色/红色；桌面 WebKit 与实机行为也不同。查询不同文档、属性/行内地址、片段作用域及其他边界仍开放，不把本子项当作 #585 整体完成。精确 head 远端门禁见本批 PR。

远端首轮 `821413c` 的 CI 43653658279 在 coverage 1108 全过后，source 为 986 通过 / 3 项 Firefox 文档 GC 失败 / 4 跳过，构建包未运行；CodeQL 43653658221 通过。失败日志及 10 份产物已保留，归档总数增为 277。Mac Firefox 144 组隔离对照未复现，不据此归因或宣称修复；`4aa8640` 仅补配对原生移除/测量控制与不持有 Document 的布尔/文本诊断，原三次 GC、严格条件不变。诊断后本地 1108 / 989 通过，生产/构建/真机输入未变；需等待新精确 head 远端门禁。

前批 [#642](https://github.com/bubkoo/html-to-image/pull/642) 已合入 `29bcc92`，其 PR CI 43651983816 / CodeQL 43651983823、Codecov patch 100% / project 87%，以及合入提交的主分支 CI 43652637169 / CodeQL 43652637103 均通过（1084 / 965 / 153）。未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 释放后的源字体引用（#560）

源码 `404798d` 修复私有 SVG 测量环境在释放后仍持有已加载 `FontFace`、连带保留源文档的问题：清空内部借用引用，不修改源页面字体集合或浏览器缓存。独立五组实验及 opened/unopened 隔离控制表明，Chromium/Firefox 原生对照可回收，而保留已释放环境且加载字体时不能；单变量清空后可回收。完整旧版组合为 5 失败 / 7 通过，其中含顺序相关的原生对照失败，因此不把五个失败均归因于此根因。两个字体隔离组各 2 失败 / 1 通过，无字体对照 3 通过；最终三引擎 12 项通过，原三次 GC、源字体/DOM/终态断言保持不变。WebKit 原生 iframe 对照也未回收，仅验收 DOM、源字体和释放状态，不宣称 GC。

完整本地 1084 coverage / 965 source / 153 构建包及 lint、构建、类型、tarball 消费者通过，4/4 既有跳过未增加。同一源码真实 iPhone Safari/iOS 26.6.1 通过 10 项字体几何/独立图像像素控制、4 项取消控制及完整冒烟 35 PASS / 2 INFO / 0 FAIL；不把字体控制称为小数边缘原生屏幕像素或设备 GC 通过。设备会话与服务已结束。[原始证据与重放](evidence/svg-source-font-lifetime.json)含 49 份归档文件；精确 head 远端门禁见本批 PR。原 20 MB SPA、浏览器缓存与 WebKit/设备 GC 边界仍开放。

前批 [#641](https://github.com/bubkoo/html-to-image/pull/641) 已合入 `648443e`，其精确合入提交的主分支 CI 43649156211 / CodeQL 43649156200 均通过（1072 / 953 / 153）；#640 的主分支失败 43645977092 保留历史记录。#585 相对属性/行内 paint、重定向和其他独立缺陷继续推进，未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 导入就绪时序与无效相对 URL

#640 已合入 `8f39d75`，但合入后主分支 CI 43645977092 在覆盖率阶段出现 Chromium supports-active 失败（1059 通过 / 1 失败 / 4 既有跳过），后续 source/package 未运行；主分支 CodeQL 43645977070 通过。原始产物中源页面前后不变、独立参考匹配原生，导出差 800 通道，并报告导入探针未就绪。该场景用时 413ms，不把它称为五秒超时，也不把 PR 检查通过当作主分支验收。

后续源码 `7206ada` 改按有效几何确认就绪：加载通知先到而几何仍为零时继续等待，两个导入已生效但缺少通知时也可确认；保持五秒期限、取消与超时保留基础策略。另修复 opaque data CSS 的相对 URL 在重放时错误借用页面 HTTP 基准、额外下载红色 paint 并覆盖原生紫色回退的问题。两类故障均有受控回归与原生对照。

同一最终 150 项，旧运行时 4 失败 / 146 通过，候选全过。完整本地 1072 coverage / 953 source / 153 构建包通过，4/4 既有跳过未增加；真实 iPhone Safari/iOS 26.6.1 的 42 项原生导入对照（84 张前后源照片）、4 项取消控制及完整冒烟 35 PASS / 2 INFO 全过，设备与服务均已结束。Safari 文件 CSS 在这些场景本来就不生效，不把此结果称为 Safari 的正向外部导入验证。817 份原始文件、合入后失败产物及 [重放方法](evidence/svg-data-relative-urls.json)已归档；远端门禁与后续合入状态见本批 PR。

Firefox/WebKit 的普通 SVG 属性/行内样式相对地址、重定向最终地址、原生合成器和受限 CSP 等仍开放，不统一改写所有 URL，也不整体关闭 #585。未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 SVG data CSS 导入与取消释放

最终生产与验证源码 `37ea117` 按用户选定的当前浏览器页面保真处理 #585 的 data CSS 导入子集。Chrome 原生外部 SVG 会使用 data 导入，且受检 layer 优先级按平铺处理；构造样式表会丢掉导入，标准 layer 重放也会改变画面。现通过独立能力探针确认行为，在惰性文档解析后经现有资源加载器展开有效 data 导入，覆盖嵌套、条件、MIME、编码及循环；Firefox/WebKit 保持实际页面的文件样式行为。可选探针失败保留原有测量结果，未允许 HTTP 导入绕过资源边界。

同一最终 102 项原生/生命周期对照：旧运行时 `270ecb4` 为 28 失败 / 74 通过，候选 102 全过；另 36 项与原生 HTML CSS 对照的 layer、编码、URL token 控制全过，共 138 项。完整本地 lint/构建/类型/tarball/消费者、1060 coverage / 941 source / 153 构建包通过（4/4 既有跳过）。新增回归另抓到 data 地址内部的 url(...) 字符串和导入 CSS 的 #paint 被错误改写：原生蓝色、导出红色，差 800 通道；现按 token 处理并保留文件样式片段引用。[原始证据与重放](evidence/svg-data-imports.json)保留首轮真机取样过早、远端 GC/覆盖率失败及中间测试脚本失败，不放宽像素断言或覆盖率门槛。

同时修复 #560 相关的取消持有：私有文档全程监听取消，自定义资源回调的等待也响应取消；释放时还清空缓存文档 Promise，并阻止再次打开已释放环境。只移除 iframe、撤回回调等待修复时，Chromium/Firefox 强制 GC 仍失败；只撤回文档 Promise 清空则 5 失败 / 4 通过，完整 9 项生命周期控制全过，GC 次数仍为 3。WebKit 只验收 DOM 移除、原因及源页面一致，不宣称其原生 iframe GC 或完整 SPA 压力场景通过。

同一源码在真实 iPhone Safari/iOS 26.6.1（非模拟器）重复原有 56 项，新增 ESM/UMD 共 40 项原生截图对照（80 张前后源照片）全过，合计 96 项原生场景、136 张源照片；另 4 项取消/释放控制、完整冒烟 35 PASS / 2 INFO 全过。设备会话与服务已结束。远端门禁/合入状态以 [PR #640](https://github.com/bubkoo/html-to-image/pull/640) 的精确 head 为准。相对 paint/重定向、opaque data CSS 相对 URL、原生合成器、受限 CSP、HTTP 文件样式/字体等仍开放；#585/#560 不按整体完成处理，未发布 npm、未评论或关闭旧 PR。

前批 #639 已合入 `270ecb4`；合入后主分支 CI 43637604172 / CodeQL 43637604213 均通过，计数 943 / 824 / 150。

## 2026-11-15 外部 SVG 字体单位验收

[源码 7a436c2](https://github.com/bubkoo/html-to-image/commit/7a436c2d5736da563e318d7ed8d27962fc47c3f9) 修正已加载页面字体未进入私有测量文档，导致外部 SVG 的 `ex` 长度改用备用字体的问题。按源文档的已加载字体族，经现有资源加载器准备 data 字体；只等所需字体加载完成，再创建新的测量树，避免非渲染 symbol 保留旧字体度量。`skipFonts` 不下载字体，显式 `fontEmbedCSS` 仍优先；解码失败给诊断，调用者解析失败保留 cause。受检 head 的远端门禁与合入状态以对应 PR 检查/说明为准。

同一最终 33 项对照，旧运行时 11 失败 / 22 通过，候选 33 全过。完整本地 lint/构建/类型/tarball、943 coverage / 824 source / 150 构建包均通过，另有 4 / 4 项既有条件跳过。三引擎 loaded 20px 的真实页面全像素对照全部一致；WebKit 的 30px 和系统字体场景仍差 40 / 20 通道，独立手写 SVG 图片也有完全相同差异，因此这两项只按独立图像/几何控制验收，不算页面像素通过。[证据及重放](evidence/svg-font-units.json)保留首轮 Firefox 全套超时，未增加超时或放宽断言。

同一源码的真实 iPhone Safari/iOS 26.6.1（useSimulator:false）已重复原有 56 项原生截图对照，新增 10 项字体独立图像像素与真实源宽度控制，并通过完整冒烟 34/34（另 2 INFO）。新增 10 项不是额外的原生屏幕像素通过数，宽度另按 0.001px 量化比较。控制会话与测试服务均已结束。#638 合入后的主分支 CI 43634349894 / CodeQL 43634350021 也已通过，计数 922 / 803 / 147。

相对绘制资源/重定向、原生合成器差异、受限 CSP 等剩余边界仍开放；这不是整个 #585 完成声明。未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 #637 源码门禁与真机验收

[PR #637](https://github.com/bubkoo/html-to-image/pull/637) 已合入 `5b456a1`。最终证据 head `475a4cb` 的 [CI 43632692714](https://github.com/bubkoo/html-to-image/actions/runs/43632692714)、[CodeQL 43632692697](https://github.com/bubkoo/html-to-image/actions/runs/43632692697) 和两项 Codecov 均通过；增量 87.40%、整体 86.33%，原目标 86.12% 未改。合入后 [主分支 CI 43633225813](https://github.com/bubkoo/html-to-image/actions/runs/43633225813)、[CodeQL 43633225800](https://github.com/bubkoo/html-to-image/actions/runs/43633225800) 也通过，仍为 922 / 803 / 147。验证源码/fixture 是 `56e8a22`，生产源码与构建产物仍与 `2a94455` 字节一致。

合入后的[相对绘制资源新观测](evidence/svg-relative-paint-current/replay.md)确认：Chrome 的源与导出全像素一致，Firefox/WebKit 各差 2400 通道；三引擎的源 DOM 与前后原生截图均未改变。请求路径证明原生 URL 基准不同，不能统一改为最终响应地址。该项仍未修复，本轮没有新增真机结论。

同一套最终 87 项样式/依赖对照，旧运行时为 55 失败 / 32 通过，候选 87 全过；另有 18 项资源、取消、CSP 回退、字体归属与循环引用控制，总计 105 全过。覆盖率改为真实三引擎 Istanbul 合并，固定图片旧回归仍限 Chromium；完整本地及远端为 922 coverage / 803 source / 147 构建包，已有条件跳过分别 4 / 4。真实页面 CSS 导入的 layer/supports/media、无效 URL 回退、禁用样式以及离线文档引用循环均已验证。

真实 USB iPhone Safari/iOS 26.6.1（能力报告 useSimulator:false）上，ESM / UMD 各 28 组原生源截图逐 8-bit RGBA 通道一致，共 56 项；默认字体和受限 CSP 另 4 项控制、完整冒烟 33/33 也通过。原始 16-bit sRGB 截图、源/导出 PNG、完整记录与逐文件 SHA 见 [最终证据](evidence/svg-native-style-scope.json)。已结束设备控制及测试服务，未将 UA 旧系统 token 当作真实系统版本。

CSP 禁止 Blob 时仅证明保留原有导出并给诊断，完整样式保真仍未解决；不可读匹配规则、外部文件 CSS 导入/字体、重定向及更广嵌套行为仍开放，不能关闭 #585。初次 Linux CSS 来源、300 文件大小标签及 Chromium-only 覆盖率失败均保留；原始数据完整打包，没有改变门槛。未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 外部 SVG 输出规则已确认

用户已选择以当前浏览器页面实际显示作为外部 SVG 的输出标准。[决策记录](evidence/svg-native-page-contract.json)覆盖 `<use>` 的文件/主页面样式作用域、继承、依赖与重定向原生差异。后续须与同一引擎真实源页面做像素/几何对照，不能仅凭独立 SVG 文件重放一致就称保真。现有矩阵仍是失败观测，运行时修复尚未交付；下方“契约待选”属历史阶段。#636 合入后主分支 `e73c405` 的 CI 43614944731、CodeQL 43614944730 也已通过。未发布 npm、未评论或关闭旧 PR。

## 2026-11-15 最新合入结果与未完成边界

[#634](https://github.com/bubkoo/html-to-image/pull/634) 已合入 `f340ddf`，[#635](https://github.com/bubkoo/html-to-image/pull/635) 已合入 `9d2991f`。#635 最终 head `2e85b49` 的 CI 43613759043（测试合并提交 `84ec52e` 的第二父提交即该 head）、CodeQL 43613758977、Codecov patch/project 全部通过；远端与本地组合检查均为 353 coverage（另 1 跳过）、701 source（另 4 跳过）、141 构建包。真实 iPhone 精确组合源码 `3f8bbdf` 完整 31/31，最终提交只补文档/证据，输入 hash 一致。[详细记录](evidence/svg-raster-retry-cache.json)保留首轮 WebKit 连接关闭及透明输出的失败日志，随后独立及完整复核通过；初次异常根因未定。合入后主分支 CI 43614127837 / CodeQL 43614127835 也已通过；CI 校验实际 checkout 为 `9d2991f`，计数仍为 353/701/141（另 1/4/0 跳过）。

原生滚动调查保存在 [99cc2ef](https://github.com/bubkoo/html-to-image/blob/99cc2ef/docs/evidence/native-scroll-v2.json)，没有 PR、没有合入。新的 Canvas 四组控制表明：稳定 SVG 字形的末 21 通道差异在 willReadFrequently:true 时为零，但直接全局启用后首次绘制仍失败、独立解码对照也改变；运行时实验已撤回。内阴影仍差 234 通道，两项严格失败未改为通过。下方“待 #634/#635 验收”保留为历史阶段；旧 PR 未评论或关闭，npm 未发布。

### #398 本次真机交互补验

[原始记录和输入](evidence/blob-preview-device-20261115.json)：真实 iPhone 的 README helper 生成 image/png、96×60（DPR 3）红蓝像素均正确。SafariDriver 的原生 element click 与 touch actions 都返回成功，但 click 记录为零、window handles 未增加；未使用合成 click，也没有把命令返回当成可信点击通过。实际 Mac Wi-Fi 地址 10.0.0.6 的手机导航仍报告网络丢失，未修改网络或安全设置。该项仍缺可达页面上的可信打开、新标签 noopener 与清理验证，不能按完整真机验收处理。

## 2026-11-15 组合验收：#634 已合入，#635 待最终远端检查

#634 已合入 master `f340ddf`：最终文档 head `10dac15` 的 CI 43613028495、CodeQL 43613028389 通过；其运行时与已实测 30/30 的 `1626445` 一致。原源码 Codecov patch/project 通过，文档 head 已成功上传 coverage，尚未单独报告 Codecov 状态。主分支检查另行跟进。[尺寸证据](evidence/scrollbar-box-dimensions.json)明确手机悬浮滚动条与桌面占位滚动条的覆盖范围。

#635 已基于该主分支组合，源码 `3f8bbdf` 的 lint/构建/类型/tarball、353 coverage（另 1 跳过）、701 source（另 4 跳过）、141 构建包均通过；真实 USB iPhone Safari 26.6.1 完整 31/31，33 条报告已落盘。新增重试场景和尺寸场景同时保留，ESM/UMD 均运行。[原始真机报告](evidence/ios-safari-raster-retry-3f8bbdf.json)与[完整验证记录](evidence/svg-raster-retry-cache.json)已归档。首轮源码检查出现多项 WebKit 透明图后连接关闭；失败记录保留，未修改断言、延时、跳过或容差，新的独立 WebKit检查和完整三引擎检查通过，最初浏览器异常根因未确立。初始独立源码 `8c68469` 的 CI/CodeQL/Codecov 和真机 30/30 也分别归档；不冒充组合提交的远端验收。

以下“等待真机/没有手机/草稿 #634”是历史记录。最终证据 head 仍待远端检查；两项原生滚动 WebKit 严格像素失败、#398 可信点击和外部 SVG 样式语义选择仍保留边界，未关闭旧 PR，未发布 npm。

## 2026-11-14 SVG 重绘缓存修正候选

#632/#633 已合入 master；#634 的 1626445 仍为检查全绿的草稿、等待真机。原生滚动新原型保留在 [2e0fbc7 调查分支](https://github.com/bubkoo/html-to-image/blob/2e0fbc76a3123ac3572b805685b44b6d027f1c5c/docs/evidence/native-scroll-v2.json)，其两个严格 WebKit 原生像素失败没有删除，也没有并入本候选。

本候选从 master 7d8d350 独立修正 #498 相关重绘路径：同一个 SVG URL 的新 Image 可能继续使用首次不完整解码。只在额外尝试的内部图片地址中加入文档级唯一 XML 注释，令其重新解码；视觉内容、元素/选择器/片段引用、保存的 SVG 和单次默认行为不变，不重克隆源，也不增加固定等待或按两图相同提前结束。

[回归与完整检查](evidence/svg-raster-retry-cache.json)：同一最终用例旧源码 4 失败 / 8 通过，候选三引擎 12/12；包含真实字体下旧重绘仍差 243 通道的直接复现、可控解码缓存故障、默认单次/健康对照、源后续变化、SVG 裁剪与渐变引用、冻结输出及完成后的栅格复用。完整本地 coverage/source/package 为 341/665/138，另 1 项既有 GC 跳过，lint/ESM/CJS/UMD/类型/tarball 通过；构建包新场景同时运行 ESM 和 UMD。远端检查及本提交真机仍待验，不按整个 #498 或所有 Safari 白图报告已解决处理。

原始讨论重新核对：#498 仍开放；其标题关联 #461 是已关闭 Issue、#478 是已关闭 PR。#591 作者已在[原始报告](https://github.com/bubkoo/html-to-image/pull/591#issuecomment-6575677342)中说明旧 V2 187c4bc 在 iPhone 11 / iOS 26.2 的 13 项夹具、16 轮测试中默认及 2/4 次模式均完整，并自行关闭 #591。这是作者的历史实测，不是本候选的新设备验收，也不等于可沿用到 WKWebView。历史原始报告中的 osFromUserAgent 只表示 UA token，不单独证明真实系统版本。当前 USB 没有识别到 iPhone；未关闭或评论旧 PR，未发布 npm。

## 2026-11-14 补充验收：#634 真机 30/30

准确源码 `1626445` 的 PR CI 42976558545、CodeQL 42976558526 与 Codecov patch/project 均通过；真实 USB iPhone Safari 26.6.1 完整 smoke 30/30，12 种盒模型/滚动输入无跳过。[原始报告](evidence/ios-safari-scrollbar-box-1626445.json)和[逐项几何记录](evidence/ios-scrollbar-box-metrics-1626445.json)已归档。本次手机使用悬浮滚动条，stable gutter 实际占位为零；此结果证明移动端兼容，不能替代桌面占位滚动条的严格源截图对照。设备 OS 版本来自 SafariDriver capabilities（26.6.1）；UA 的 `CPU iPhone OS 18_7` 是兼容 token，不是实测系统版本。

本次仅补充文档/证据，已核对运行时、fixture、配置的 SHA256 与真机源码一致。证据提交的最终检查通过后合入 #634。下方 11 月 11 日“没有手机/待真机”是历史状态。完整原生滚动外观和两项 WebKit 像素差异仍未解决；#398 手动预览的可信点击、新标签和清理也仍待独立验证。未关闭旧 PR，未发布 npm。

## 2026-11-11 最新状态：滚动条占位尺寸候选 #634

#632 已合入 master 67b2ec2，#633 已合入 master 7d8d350；各自准确源码的真机验收已归档。#633 最终 head 1c6b184 的 PR CI 42961919142、CodeQL 42961919318、Codecov，以及 master CI 42962301112 / CodeQL 42962301137 全部通过。下方较早的“待验/未合并”文字保留为历史阶段，不代表当前状态。

继续按 #408 原关联的 #81 / #345 处理。新候选修复独立根因：CSSOM 的 content-box 尺寸已扣除滚动条占位，再复制到原生滚动容器会重复扣除。按实际外框与已解析尺寸的差额恢复占位，仅处理仍保留该空间的轴；滚动后 hidden 仍保留 stable inline gutter 的情况也覆盖。没有读取伪元素声明的 10.5px 当作实际厚度。

[尺寸证据](evidence/scrollbar-box-dimensions.json)：最终同组旧源码 12 失败 / 25 通过 / 2 特性跳过，候选 36 通过 / 3 跳过。完整本地 coverage/source/package 为 349/689/138，另 1/4/0 跳过，lint/构建/类型/tarball 均通过；HTML 格式收敛后相关构建包复验 9/9。Chromium 明确关闭测试框架默认隐藏滚动条和系统悬浮模式，旧 iframe/粘性标题内容取样改到真实内容视口内。两个 Firefox legacy 选择器不支持；Chromium both-edge gutter 的原生横向滑块差异未计为通过：Mac 44 通道、首轮 Linux CI 22 通道。库与手写 SVG 全像素相同；仅当全部原生差异都位于横向滚动条带内、手写 SVG/原生差异数也完全相同时单独跳过原生保真验收，额外几何正对照和其他内容像素仍严格验证，不放宽容差。先前称为角落差异不准确，已按 PNG 坐标修正。

[草稿 PR #634](https://github.com/bubkoo/html-to-image/pull/634) 尚待最终提交的远端和真机验收；前两轮 CI 分别暴露 Mac 通道数硬编码与误传 Chromium 专用启动选项的问题；已按差异区域核对，并仅在 Chromium 实例/项目设置选项。本地再次全过，最终提交的远端及真机仍需各自验收。目前 USB 列表没有 iPhone，Safari 不能创建可用会话，不能沿用 #632/#633 的真机报告。#398 手动页面在 USB/同 Wi-Fi 均不可达；临时外网入口也未建立（DNS 失败、Mac 安全软件拦截隧道工具），未修改安全设置。原生滚动条完整外观/滑块位置及两个 Issue 的其他布局边界仍未解决；未关闭或评论旧 PR，未发布 npm。

另一个原生滚动状态原型保留在 codex/native-scroll-snapshot 的 b9e9d5b，存在两个严格 WebKit 源像素失败，未进入本尺寸修正。

更新于 2026-11-11。按创建 [PR #603](https://github.com/bubkoo/html-to-image/pull/603) 前的 52 个开放 PR 编号逐一登记。`master` 已包含 V2，尚未发布 V2 到 npm。已向下节 22 个 PR 回复具体证据并关闭；无关的 #517 也已说明后关闭。其余“关闭”仍为建议动作，不能当作已完成。旧分支的补丁不能因 CI 变绿就直接合并到 V2。

## 2026-11-11 剩余 28 项的当前处置索引

本轮重新核对全部 28 个旧 PR 的原需求、head 与现行代码/测试；锁文件项复核同一 head 的既有归档。下面是当前处置路径；完整 head、来源和边界见 [审计索引](evidence/open-pr-current-audit.json)。本轮 SVG 变换修复及真实字体新验收仍以候选的真机/远端记录为准；旧 PR 未被评论或关闭。“核心等价”不代表所有原应用或旧平台都已复测。

| PR | 原需求 / 当前处置 | 主要证据 | 未覆盖或待定条件 |
| --- | --- | --- | --- |
| [#585](https://github.com/bubkoo/html-to-image/pull/585) | 整体提案按独立根因处理；样式、导入、重定向最终地址与所在树片段作用域已有修复，至 #644 已合入并有准确源码的真机证据。 | [样式证据](evidence/svg-native-style-scope.json)、[片段绘制](evidence/svg-fragment-paint.json)、[重定向地址](evidence/svg-response-bases.json) | 按用户选定的当前浏览器显示；限定 paint、CSP、不可读规则、HTTP 文件 CSS/字体、广泛性能及一般 GC 仍开放，不整体移植原提案。 |
| [#581](https://github.com/bubkoo/html-to-image/pull/581) | SVG text 的 font-family 属性应选择并嵌入真实网络字体。核心等价，补齐真实字形验证。 | [svg-font-glyphs.test.ts](../test/browser-unit/svg-font-glyphs.test.ts) | 含直接 SVG 根入口；原中文字库字节、完整原应用及旧平台未整体复测；不移植附带工具链/参考图改动 |
| [#577](https://github.com/bubkoo/html-to-image/pull/577) | repeating-linear-gradient 经样式序列化仍重复。核心等价。 | [svg-style.test.ts](../test/browser-unit/svg-style.test.ts) | 当前回归核对多个实际色块；不把原补丁 cssText 字符串断言当全部视觉证明 |
| [#575](https://github.com/bubkoo/html-to-image/pull/575) | SVG 后代应获得计算后的 CSS 变量值。核心等价。 | [svg-style.test.ts](../test/browser-unit/svg-style.test.ts) | 原 Recharts/MUI sandbox 未整体验收；本次网页工具未能访问该链接，若需同项目验收需可导出源码/样式 |
| [#574](https://github.com/bubkoo/html-to-image/pull/574) | 更新旧 Rollup 3.x 锁文件依赖。已被现行工具链替代，不移植旧锁。 | [maintenance-dependency-review.json](evidence/maintenance-dependency-review.json) | 只证明该旧 bump 的目的与现行安装树；不代表完整依赖安全审计 |
| [#568](https://github.com/bubkoo/html-to-image/pull/568) | srcdoc iframe 中的跨 realm 子元素不能被 instanceof 丢弃。核心等价；相关文档字体缺陷已由 #623 修复。 | [iframe-fonts.test.ts](../test/browser-unit/iframe-fonts.test.ts) | 不可读跨源 iframe、纯 JS FontFace 字节不在范围 |
| [#560](https://github.com/bubkoo/html-to-image/pull/560) | SPA 缓存使用 capture/renderer 生命周期；#625 与 #642 分别修复已证实的文档/借用字体引用根因。 | [resource-policy.test.ts](../test/browser-unit/resource-policy.test.ts)、[字体生命周期](evidence/svg-source-font-lifetime.json)、[后续 GC 排查](evidence/gc-observer-controls.json) | 后续严格 Linux GC 检查仍有失败，不能概括为一般释放已解决；不宣称清空浏览器缓存或复现原 20 MB SPA。 |
| [#540](https://github.com/bubkoo/html-to-image/pull/540) | 旧锁中的 pbkdf2 3.1.2 升级。相关旧依赖已移除，不重新引入旧测试链。 | [maintenance-dependency-review.json](evidence/maintenance-dependency-review.json) | 不代表无关依赖不存在其他问题 |
| [#533](https://github.com/bubkoo/html-to-image/pull/533) | 后台导出不应强制等待 requestAnimationFrame。已有路径不等待 RAF，不增加重复等待开关。 | [renderer.test.ts](../test/spec/renderer.test.ts) | 只证明库内路径；不保证浏览器或系统不暂停后台页面 |
| [#511](https://github.com/bubkoo/html-to-image/pull/511) | 禁用字体字号缩小以保留字形和换行。#621 已移除全局取整/缩小，不新增 opt-out 开关。 | [font-metrics.test.ts](../test/browser-unit/font-metrics.test.ts) | 不外推全部原段落、字体、旧浏览器组合 |
| [#504](https://github.com/bubkoo/html-to-image/pull/504) | 图片解码、SVG/HTML 图片处理、异步错误恢复。保留 V2 独立实现；#619 已补齐异步错误回调等待。 | [image-errors.test.ts](../test/browser-unit/image-errors.test.ts) | 不按整体重构已移植或所有原应用图片问题已解决处理 |
| [#499](https://github.com/bubkoo/html-to-image/pull/499) | 读取现代 SVG use href。核心等价，#627 补齐空 href 优先级等边界。 | [svg-use.test.ts](../test/browser-unit/svg-use.test.ts) | 复杂外部样式/重定向语义仍按独立 SVG 边界处理 |
| [#498](https://github.com/bubkoo/html-to-image/pull/498) | Safari 图片初次绘制缺失，提出多次延时重绘。保留显式 stabilizationAttempts，拒绝按图片数写入共享重绘计数。 | [renderer.test.ts](../test/spec/renderer.test.ts) | 原应用的可运行 DOM、图像/字体字节、设备与复现步骤缺失；不宣称固定等待能解决全部 #461/#556/#569 |
| [#482](https://github.com/bubkoo/html-to-image/pull/482) | 字体/图片嵌入出错后继续。不采用无条件吞错；保留诊断/占位与用户错误拒绝。 | [image-errors.test.ts](../test/browser-unit/image-errors.test.ts) | 资源解析器或用户回调失败必须可见；不把缺失内容当无条件成功 |
| [#473](https://github.com/bubkoo/html-to-image/pull/473) | usePageCss、大页面输出分片与性能。原 head 已实测；#629 仅解决明确的复制开销，不整体移植。 | [pr473-historical-controls.json](evidence/pr473-historical-controls.json) | 页面 CSS 模式/新分页 API 未实现；原实现先解码整图且宽度被缩放，缺少大 DOM 样本及内存/尺寸目标 |
| [#451](https://github.com/bubkoo/html-to-image/pull/451) | 视频原始比例与显示区域比例不同导致变形。#617 独立修复原始帧尺寸，真实 iPhone contain 对照通过。 | [video.test.ts](../test/browser-unit/video.test.ts) | 未复测全部 object-fit、流媒体/CORS、播放时序及高 DPR 成本 |
| [#443](https://github.com/bubkoo/html-to-image/pull/443) | 不同 URL 需要不同 RequestInit。以 resources.resolve 替代第二套生成器 API。 | [resource-policy.test.ts](../test/browser-unit/resource-policy.test.ts) | 受控私有 Cookie 图片与公开图/字体双源已验证；原业务 URL/登录及完整 fixture 未取得，resolver 自行管理请求选项和 signal |
| [#442](https://github.com/bubkoo/html-to-image/pull/442) | 图片与公开字体的凭据配置不同，并报告 iOS 空白。URL/kind resolver 覆盖混合凭据核心需求；原 iOS 故障保留条件。 | [resource-policy.test.ts](../test/browser-unit/resource-policy.test.ts) | 原私有资源 URL、CORS 响应、凭据和完整故障 fixture 未验；include 不是所有 iOS 请求的统一要求 |
| [#430](https://github.com/bubkoo/html-to-image/pull/430) | 缓存进行中的请求避免短时间重复加载。核心等价；#622 另消除 WebKit 副本的额外原生请求。 | [resource-policy.test.ts](../test/browser-unit/resource-policy.test.ts) | 缓存限单次捕获，不承诺跨捕获响应永不变化 |
| [#427](https://github.com/bubkoo/html-to-image/pull/427) | 外部 SVG use 的依赖、变换后引用、样式子集、重定向最终地址与所在树片段作用域已有分批修复，至 #644 已合入。 | [svg-fragment-paint.json](evidence/svg-fragment-paint.json)、[svg-response-bases.json](evidence/svg-response-bases.json) | 限定/相对 paint、文件 CSS/字体、CSP 等仍开放；输出按用户选定的当前浏览器显示，不宣称任意 sprite 完成。 |
| [#409](https://github.com/bubkoo/html-to-image/pull/409) | CSS 尺寸、canvasWidth/Height、pixelRatio 输出一致。#618 修复零值/NaN；不采用重设 canvas 属性破坏 DPR 的旧补丁。 | [dimensions.test.ts](../test/browser-unit/dimensions.test.ts) | 原个人项目设备/完整 fixture 未复验；不是任意超大画布的保证 |
| [#408](https://github.com/bubkoo/html-to-image/pull/408) | 保留可见滚动位置。#630/#631/#633 及占位尺寸 #634 已合入，受测源码有真实 iPhone 对照。 | [positioned-scroll.json](evidence/positioned-scroll.json)、[scrollbar-box-dimensions.json](evidence/scrollbar-box-dimensions.json) | 原生滚动条外观/滑块与原型两个严格 WebKit 像素失败仍开放；其他布局和原应用条件不外推。 |
| [#407](https://github.com/bubkoo/html-to-image/pull/407) | 把额外 CSS 放进输出副本。使用 onClone 插入 style 的现有原语，不新增 extraStyleContent。 | [scrollbar-extension-probes.json](evidence/scrollbar-extension-probes.json) | 自定义 CSS 注入不等于源原生滚动条外观/位置已保留 |
| [#401](https://github.com/bubkoo/html-to-image/pull/401) | 应调用并等待 decode，而不是覆盖方法。核心等价；保留可用图片 decode 拒绝不悬挂的边界。 | [renderer.test.ts](../test/spec/renderer.test.ts) | 图片可解码不等于所有 WebKit foreignObject 首绘问题已解决 |
| [#400](https://github.com/bubkoo/html-to-image/pull/400) | 允许配置 fetch cache:no-cache。已有 fetchRequestInit.cache，不新增 cacheDisable。 | [resource-policy.test.ts](../test/browser-unit/resource-policy.test.ts) | 真实请求/重新验证指令已验；不强制假定默认 HTTP 缓存会命中 |
| [#398](https://github.com/bubkoo/html-to-image/pull/398) | 原 PR 已于 2026-11-15（北京时间）被 bubkoo 关闭且未合并；内容 head 未变。Blob PNG 在新标签页预览。README helper 与三引擎交互已验；保留单数 toBlob API。 | [blob-preview-browser-checks.json](evidence/blob-preview-browser-checks.json) | 真机 PNG 生成/读取通过；可信点击开启新标签及之后清理仍需一次物理点击 |
| [#393](https://github.com/bubkoo/html-to-image/pull/393) | 支持 SVG use href 属性。核心等价，现代/旧命名空间及优先级有回归。 | [svg-use.test.ts](../test/browser-unit/svg-use.test.ts) | 同 #499 的属性级结论，不扩大为全部外部 SVG 样式兼容 |
| [#376](https://github.com/bubkoo/html-to-image/pull/376) | 允许额外伪元素，尤其非标准滚动条。不把通用伪元素列表等同于滚动条完成；继续原生外观验证。 | [scrollbar-extension-probes.json](evidence/scrollbar-extension-probes.json) | 按 #345 保留源轨道/滑块外观和位置的明确要求验证；非标准伪元素有引擎差异 |

下文较早的分组/候选计数是历史记录；与本表冲突时，以本表链接的已验证范围和后续完成报告为准。外部 SVG 输出语义、原生滚动条保真及真机 Blob 链接物理点击仍保留明确待定条件，不因表中编号齐全就当作长期目标已完成。

## 2026-11-11 fixed 滚动源页面对照（#408 / #345 / #594）

独立原生截图发现早期 transformed-fixed + sticky 测试的期望有误：滚动 50px 后 fixed 已在 -50px，源顶部为绿色，旧导出和测试却期待蓝色。三个引擎均复现，不能继续把旧测试通过当页面保真证据。[独立原生 PNG、计数与范围](evidence/fixed-scroll.json)和[重放](evidence/fixed-scroll-replay.md)已归档。

候选使用源浏览器 offsetParent 区分当前容器、其他祖先或视口。纵向块流内有 fixed 后代时复用伪元素流偏移，避免把普通包装层变成新的 fixed 包含块；只给随当前容器滚动的 fixed 调整 inset，保留已有变换。直接横向/斜向 fixed 同样按实际关系处理。30 个输入覆盖 CSS 建立包含块的多种方式、sticky 两种顺序、普通/混合/深层/嵌套 fixed、已有变换、bottom/auto/right/RTL 和源 important。最终输入在基线 72 失败、18 通过，原生源对照全通过；候选 90 通过。完整 lint/构建/类型/tarball、264 覆盖率、434 源码（另 1 项既有 GC 跳过）及 126 构建包检查通过；源码 `aba8ed5` 的最终 30 输入分别经 ESM/UMD，真实 iPhone Safari 完整 26/26 通过，[最终报告](evidence/ios-safari-fixed-options-aba8ed5.json)已归档。独立原生源像素对照来自相同运行时代码的 c3b2d09；#631 已合入 master（132c38d），PR/主分支 CI、CodeQL 与 PR Codecov 均通过。

横向/斜向的深层 fixed 包装组合、已有 inline before 与绝对定位回退、任意捕获根偏移、其他未测布局及滚动条外观仍保留边界；不按整个 #408/#345 已解决处理。

## 2026-11-11 长期目标基线

后续进展：尺寸修复已随 [#618](https://github.com/bubkoo/html-to-image/pull/618) 合入 `master`（`319da08`），CI、CodeQL 和 Codecov patch/project 全部通过。图片异步错误回调修复已随 [#619](https://github.com/bubkoo/html-to-image/pull/619) 合入 `master`（`de9136c`），PR 与主分支 CI、CodeQL、PR Codecov patch/project 通过；组合真机验收为 15/15，报告对应源码 `841908f`，见 [发布验收记录](v2-release-readiness.md)。旧 #409/#504 的完整应用场景仍保留各自边界，npm 不发布。

GitHub 实时查询剩余 28 个开放旧 PR：#577、#504、#585、#430、#581、#473、#482、#575、#393、#499、#427、#401、#451、#511、#568、#540、#560、#498、#533、#376、#408、#409、#574、#443、#442、#400、#407、#398。后续新增 PR 单独登记，不混入这份基线。

[#624](https://github.com/bubkoo/html-to-image/pull/624) 已合入 master（`8bddd81`）：Blob 预览示例与旧依赖结论已归档；PR CI/CodeQL 和主分支 CI/CodeQL 均通过。#398 真机新标签交互仍按证据保留未完成状态。

本轮新增的仓库自动化缺陷已由 #620 合入 `master`：标题规则补齐 `assignees: []`，支持重新打开 PR 后重验。#619 在相同关键词标题下重新运行标签任务成功；该问题与图片运行时代码分开修复。

逐项核对原始需求、V2 行为和回归证据，给出已等价解决、可复现缺陷修复、设计取舍或具体外部阻塞的结论。修复须先失败后通过，并完成三引擎、实际构建包和远端检查；涉及 iOS 行为时验证真机。保留未发布 npm 的边界；部分覆盖不作完整解决。

- **#409：尺寸契约已核对，独立边界修复随 #618 合入。** 原补丁在已设置像素尺寸后又把画布属性改回 CSS 尺寸，会覆盖 `pixelRatio`；不直接移植。V2 已分开设置 CSS 尺寸与像素缓冲区。核对中发现 `width`/`height` 的 `||` 回退吞掉显式 `0` 和 `NaN`，本分支改为仅对未指定尺寸使用源尺寸，副本样式也保留零值。三引擎修复前各 4 项尺寸回归失败、修复后通过，另有 1×/2× 源码和 2× UMD 像素验证。原关联项目缺精确设备信息，不把这一独立边界修复等同于复现其全部故障。
- **#408：部分覆盖，保留。** 当前已覆盖纵横滚动、已有变换、嵌套滚动及限定的 fixed/sticky 组合；混合直接文本、行内和复杂定位仍有限制。关联 #345 同时要求自定义滚动条外观，当前裁剪/隐藏滚动条不等于保留外观，不能宣称 #345 全部解决。
- **#427/#499/#393、#575/#577/#581：已有实现已随 #603 合入主分支。** 下文“待本分支 CI”是历史状态；这些旧 PR 仍开放，后续按各自完整 fixture 和剩余边界决定处置。

候选 `8103b7b` 本地完整检查：覆盖率回归 172/172、三引擎源码 159/159、实际压缩包 ESM/CJS/UMD/类型通过。新增冒烟项后构建包 69/69，真实 iPhone Safari 14/14，通过报告见 [发布验收记录](v2-release-readiness.md)。首轮定向运行还出现一次 WebKit 1× 像素透明，后续定向和完整运行未复现；尺寸回退修复不能作为该时序现象已解决的证据。

## 2026-11-11 资源策略复核

- **#430 / #429：V2 已按单次捕获缓存进行中的 Promise。** 同 URL 的两张图片和 CSS 背景只发一次库请求，同一冻结快照输出 PNG/像素不重新获取。复核同时发现 WebKit 在活动文档中改写脱离页面的副本会额外发送 3 次原生图片请求；修复已随 [#622](https://github.com/bubkoo/html-to-image/pull/622) 合入 `master`（`c742a11`），改用无窗口的私有文档，回归要求额外请求为 0。CSS 相对 URL 的锚点解析在 WebKit 产生不同缓存键，改用 URL 解析后同一资源只加载一次。SVG href.baseVal 在 WebKit 只更新旧 xlink 属性、留下有效的相对 href，现显式写入副本属性；现代和旧属性都验证冻结 SVG 与默认单次绘制像素。
- **#560：不恢复全局缓存及手动清空接口。** 每次捕获独立；服务端红→蓝→绿的变化分别被同一 renderer 的新捕获及旧 facade 的新调用读取。`capture.dispose()` / `renderer.dispose()` 后拒绝复用。证据针对资源请求复用范围和释放后的 API 状态，不等于浏览器 HTTP 缓存已清空、强制 GC 或原 SPA 内存压力已复测。
- **#400：已有 `fetchRequestInit: { cache: 'no-cache' }`，无需新增 `cacheDisable`。** 可缓存 HTTP fixture 改变内容后，三个引擎均须发出带重新验证指令的新请求并得到蓝色像素；默认请求是否缓存由浏览器决定，不强制假定会命中缓存。冻结的调用选项保持不变。
- **#443 / #503：已有 `resources.resolve` 可按 URL 返回 Blob，`undefined` 使用正常 fetch。** 实际双源 fixture 验证带 cookie 的私有图片与省略凭据的公开图片/字体同时正确，负面对照全局 include 因 wildcard CORS 失败。不新增旧补丁的第二套 RequestInit 生成器；resolver 自行负责请求选项、状态检查和 signal。
- **#442 / #361：受控的混合凭据需求可由上述 resolver 满足；保留原 iOS 故障边界。** include 不是所有 iOS 资源的统一要求，cacheBust 也不是凭据方案。原应用的资源 URL、CORS 响应和可运行 fixture 缺失，不能按该 Issue 的全部空白问题已解决关闭。

本候选本地完整检查通过：覆盖率回归 190/190、三引擎源码 213/213、构建包 105/105，以及 lint、构建、测试类型和隔离 tarball 的 ESM/CJS/UMD/双版本 TypeScript 消费检查。源码 `5cbf99d` 真实 iPhone Safari 完整 20/20 通过，[原始报告](evidence/ios-safari-resource-policy-5cbf99d.json)已归档；#622 的 CI、CodeQL、Codecov patch/project 及主分支 CI/CodeQL 全部通过。

本候选也修正同源 iframe 适配器过宽的 catch：仅访问不可读文档时回退，用户克隆回调抛错必须原样拒绝。修复前三个引擎均吞掉该错误，修复后回归核对同一 Error 对象。副本 `ownerDocument.defaultView` 现在为 null，迁移约定和创建新节点的方法已写入 README。

## 2026-11-11 iframe 字体复核（#568）

已随 [#623](https://github.com/bubkoo/html-to-image/pull/623) 合入 `master`（`a360c43`）。最终源码 `f4ab94e` 真机 21/21、本地 204/255/111，PR CI、CodeQL、Codecov patch/project 和主分支 CI/CodeQL 均通过；下述初版与首轮失败记录是历史对照。

V2 的 Element 遍历及 #616 已解决直接捕获外部 realm 节点时跳过后代的问题，本候选继续保留原始 `srcdoc` 验证，并增加实际几何字体和像素。发现独立缺陷：捕获 iframe 本身或它的祖先时，克隆已包含 frame body，字体收集却只查外层文档；不同文档同名字体也会在扁平副本中互相覆盖。

候选按副本来源文档收集字体与相对地址，附加文档的字体只在副本中改为各自名字；源 DOM、普通和 adopted 样式表不变。支持嵌套 iframe、body 内字体规则、含逗号/撇号的家族名、重复捕获的字体 CSS、普通名称的显式覆盖、变换新增字体和 local-only 来源；过滤掉的 iframe 不下载它的同名字体。旧 #568 的字符串类型补丁不移植。

以 #623 前的主分支 `c742a11` 回放初版 39 项定向测试，三个引擎各 8 项失败（共 24 项）；修复后三引擎 39/39、本地覆盖率 203/203、源码 252/252、构建 ESM/UMD 111/111 通过。实际 tarball 的 ESM/CJS/UMD/双版本 TypeScript、lint、构建、浏览器测试类型也通过；源码 `036f1db` 真实 iPhone Safari 21/21 通过，[原始报告](evidence/ios-safari-iframe-fonts-036f1db.json)已归档；该初版的资源计数失败及最终修复见下节。复用含 iframe 的 fontEmbedCSS 要保留同一捕获子树及 frame 文档，导航或替换后重新收集。跨源不可读 iframe、纯 JavaScript FontFace 字节和同一文档内不同 ShadowRoot 的同名字体隔离不在此结论内。

### #623 远端复检补充

首轮 [CI](https://github.com/bubkoo/html-to-image/actions/runs/42904242209) 的字体回归通过，但 WebKit 资源用例记录了多余请求。本地追踪发现：同一 capture 的背景先使用绝对地址，新插入图片随后处于 `about:blank` 文档，保留相对地址，形成两个缓存键。现在捕获流程显式持有私有文档直到序列化，不给地址加猜测性回退，也不放宽请求计数。去掉该持有的 12 轮/三引擎对照为 2/36 失败；恢复后 36/36，通过期间 clone base URI 也必须保持不变。

同时补齐显式字体 CSS 的语义边界：注释里出现生成的字体名不能当作有效 face，三个引擎在初版各 1 项失败。现通过 CSSOM 读取实际声明后再选择文档别名，42/42 字体定向检查与上面的资源对照合计 78/78 通过；最终本地完整检查已通过：覆盖率 204/204、三引擎源码 255/255、构建包 111/111，以及 lint、构建、类型与 tarball 消费检查；最终源码 `f4ab94e` 真实 iPhone Safari 21/21 通过，[原始报告](evidence/ios-safari-document-ownership-f4ab94e.json)已归档；最终 PR 与主分支 CI/CodeQL、PR Codecov 两项检查均已通过。早期 `036f1db` 的真机 21/21 是该候选及其七种字体场景的记录，不能代替此补充的最终验收。

## 2026-11-11 文档与旧依赖补丁复核

| PR | 结论 | 可复核证据与边界 |
| --- | --- | --- |
| [#398](https://github.com/bubkoo/html-to-image/pull/398) | 原需求是通过 Blob 快速预览，实际 API 是单数 toBlob。README 新增生成预览链接、由用户点击打开新标签页、返回清理函数的例子；处理 null Blob、noopener 和显式 revoke，不新增 toBlobs API。 | 从 README 原样提取 helper，使用当前构建 ESM 在 Chrome/Firefox/WebKit 检查 PNG MIME、尺寸、红/蓝像素、opener 为空，以及关闭预览后清理链接、旧地址 fetch 拒绝。[浏览器记录](evidence/blob-preview-browser-checks.json)包含 helper hash。真实 iPhone 已生成并读取正确的 96×60 PNG；自动点击未产生 DOM 事件，新标签页交互及其后清理仍待一次手动点击，不计作真机全流程通过。 |
| [#540](https://github.com/bubkoo/html-to-image/pull/540) | 已由工具链迁移取代，无需移植旧锁文件。 | 原 PR 仅改 pnpm-lock，将 pbkdf2 3.1.2 升到 3.1.3。迁移提交 e32e74c 移除了相关旧依赖；当前 lock 不含 pbkdf2，完整安装树也没有此包。不能为合并旧 bump 而重新引入已移除的测试链。 |
| [#574](https://github.com/bubkoo/html-to-image/pull/574) | 当前 Rollup 4.67.4 已覆盖旧 bump 的目的，无需退回 3.x 锁文件。 | 原 PR 仅将锁文件中的 3.12.0 升到 3.30.0；官方 [DOM clobbering 公告](https://github.com/rollup/rollup/security/advisories/GHSA-gcx4-mw62-g8wm) 的 4.x 修复版为 4.22.4，[目录逃逸公告](https://github.com/rollup/rollup/security/advisories/GHSA-mw96-cpmx-2vgc) 为 4.59.0。当前安装树仅有 4.67.4；生成 UMD 的 IMG/SCRIPT currentScript 分支及隔离临时目录中的越界输出拒绝均实测通过。[依赖记录](evidence/maintenance-dependency-review.json)保存版本、lock hash、原 PR head 与行为结果；这不是整棵依赖树的安全审计。 |

## 2026-11-11 源文档持有复核（#560）

已随 [#625](https://github.com/bubkoo/html-to-image/pull/625) 合入 master（`6b6bf2a`）。PR 与主分支 CI/CodeQL、PR Codecov patch/project 均通过；合入源码与真机候选一致。

本轮另复现了与全局资源缓存不同的引用问题：保留已 dispose 的快照对象时，延迟绘制函数仍持有源 ownerDocument；Chromium 中移除 iframe 后请求 GC，文档仍可经 WeakRef 读取，丢弃快照才消失。候选改由库所在 document 创建 canvas，并将任务释放函数绑定在捕获调用环境之外，避免 Firefox 通过内联释放回调间接保留源节点。

最终定向回归在旧源码上 11 项全部失败，候选 11 项通过、1 项有界跳过：三引擎均验证独立源文档可回收、延迟绘制和已 dispose 快照，以及移除 iframe 后 canvas 的所属文档、像素和独立副本；Chromium/Firefox 另验证 iframe 文档可回收。WebKit 的无捕获 iframe 对照仍保留原生文档，因此不对它作该项 GC 承诺。本地完整检查 208/266/114、构建、类型及 tarball 均通过（源码另有 1 项上述有界跳过）；[定向证据](evidence/capture-source-lifetime.json)已归档。源码 `6c7de81` 真实 iPhone Safari 22/22 通过（ESM/UMD 输出，不声称真机 GC），[原始报告](evidence/ios-safari-capture-lifetime-6c7de81.json)已归档；远端检查已通过；不等于原 SPA 的完整内存压力场景已复测。

## 2026-11-11 自定义样式与伪元素复核（#376 / #407）

#407 的附加 CSS 可由已有 onClone 在副本中插入 style 完成，不增加重复的 extraStyleContent 接口。#376 的非标准伪元素列表原补丁可用逐节点扩展复现，但不能把通用 CSS 注入等同于原生滚动条的完整截图：早期 a360c43 上的原 HTML/CSS 结构在 Chromium/WebKit 未滚动时可经注入显示红黑滚动条，scrollTop=50 后仍因 cloneScrollState 的隐藏/位移路径消失；Firefox 不支持那组 WebKit 专有规则。该测量是原序列化逻辑在 V2 hook 中的适配，不是历史分支完整构建回放。[早期测量及重放输入](evidence/scrollbar-extension-probes.json)已归档。复核原帖后确认：外观、尺寸和位置已经是明确需求；撤回早先的范围选择，按 #345 继续验证。

复核另发现独立的既有缺陷：默认 ::before/::after 背景图只进入生成的样式规则，资源阶段只读取行内 style，三个引擎输出红色底色。候选从无窗口解析文档的 CSSOM 读取规则背景/遮罩，复用现有嵌入流程；直接 URL、分组规则、变换新增遮罩、相对地址和缓存复用有真实 HTTP 回归，旧源码六项全部失败。@import 保留而不加载/展开，font-face 保留原策略，非 CSS style 块与生成内容中的 URL 字面文本不会被当成图片。本地 210/272/117（源码另有 1 项既有 GC 跳过）、lint/构建/类型/tarball 已通过，[证据](evidence/pseudo-style-resources.json)已归档；源码 `58de76f` 真实 iPhone Safari 23/23 通过，[原始报告](evidence/ios-safari-pseudo-resources-58de76f.json)已归档；#626 已合入 master（fd28e2c），PR/主分支 CI、CodeQL 与 PR Codecov 均通过。

#473 的 usePageCss 不能仅凭更小体积替代计算样式：在当前 V2 hook 注入的受控对照中，@media(min-width:1px) 在 Firefox/WebKit 的 SVG 图像输出不生效，改为 all 后生效；这不是 #473 整体替代实现的运行结论。其分页函数先解码完整 SVG，再对宽度缩放、对高度分片，仍需分别度量 CSS 体积、完整图像解码和输出内存，不能声称已解决大 DOM 性能。

## 2026-11-11 SVG 引用依赖复核（#585 / #427 / #499 / #393）

复核 #585 的外部 SVG 需求时，确认当前代码只复制被引用节点，漏掉旁边的渐变、裁剪、遮罩和其他符号。候选按原文档/ShadowRoot 建立依赖图，递归导入属性与行内样式中的引用；外部文档各自分配副本 ID，处理循环和重叠子树，复用单次捕获的资源加载器。相对 image/feImage 地址保留资源文档及 xml:base 的解析基准。SVG use 无片段时选择文档根元素，与 [SVG 2 use 规则](https://www.w3.org/TR/SVG2/struct.html#UseElement)一致。

另修复现代 href 的空值被旧 xlink:href 覆盖、无 href 图片误请求当前页面，以及被筛掉的内部定义又被补回的问题。原始 DOM 不变；本地依赖仍走既有克隆回调。三引擎最终定向 42 项在旧源码上 29 项失败、13 项通过，候选全部通过。WebKit 蓝色的微小原生偏差及特殊编码 ID 均与同引擎独立 SVG 对照精确比较，没有放宽像素容差。[依赖证据](evidence/svg-reference-dependencies.json)记录范围和源文件 hash，本地完整检查 220/302/120（源码另 1 项既有 GC 跳过）、lint/构建/类型/tarball 均通过；源码 `180ff94` 真实 iPhone Safari **24/24 通过**，[原始报告](evidence/ios-safari-svg-dependencies-180ff94.json)已归档；#627 已合入 master（545ff83），PR/主分支 CI、CodeQL 与 PR Codecov 两项均通过。

这不是 #585 的整体移植：外部兄弟样式表/字体、变换阶段新增引用及重定向后的基准 URL 尚未建立证据；其 live reflow、三态 filter、调用者缓存和通用 iOS 重绘方案仍分别核对。不能因此关闭整个 #585，也不能把 #498 的延时重绘视为通用根因修复。

### 外部 SVG 样式：实际页面与独立图片对照的边界

后续使用真实 HTTP external use 的页面截图重新核对，发现先前“独立 SVG 图片应为绿色/蓝色”的对照不足以证明各引擎页面截图一致。相同输入含两个外部图标、页面内黄色 !important 规则和独立黄色参照块：Chromium 原生为绿/蓝/黄，Firefox 为黄/黄/黄，WebKit 为绿/黑/黄；当前 master 导出三个引擎均为黄/黄/黄。去掉页面内规则后，Chromium 原生仍为绿/蓝/黄、导出为绿/黑/黄；Firefox/WebKit 的原生与导出都是绿/黑/黄。原生 iPhone Safari 在有/无页面规则两种状态都为绿/黑/黄，截图字节相同。

[15 组完整像素记录](evidence/svg-styles-native-matrix.json)、[真机截图](evidence/ios-safari-svg-style-source.png)和[重放方法](evidence/svg-styles-native-replay.md)已保存。这些是差异观测，不是修复通过数。作用域样式原型能按文件产生绿/蓝，但与 Firefox/WebKit 的八组实际页面对照不一致，未合入。已明确提出决策：忠实保留各浏览器当前页面，或统一按外部 SVG 文件样式还原；该阶段尚未收到选择；现已确认当前页面保真，样式后续见 #637。独立的 SVG 引用依赖修复 #627 保持已有验证范围，#585 仍未整体解决。

## 2026-11-11 大页面与样式复制复核（#473 / #585）

本轮实际打包并运行 #473 原 head `0b677d5`，没有改历史源码。三引擎均把 17000×20 输出缩为 16384×19；40×20000 则分成 40×16384 与 40×3616，首尾红/绿/蓝标记正确，drawImage 的输入仍是完整 40×20000 图片。这证明了特定纵向分片行为，没有建立源图片解码或总内存的上界。[历史执行记录](evidence/pr473-historical-controls.json)保存输入、源码与构建 hash。原分支的简单 @media(min-width:1px) 案例在三引擎都为绿色；先前 V2 hook 的失败不能当作该历史实现失败。两者的 style 所在位置不同，尚未用单变量实验确定原因。

401 节点、40×8000 的简单 CSS 样例中，原页面 CSS 方案的 SVG 为 13602 字节，当前 V2 为约 2.38–2.87MB；四次 PNG 运行、去掉首个样本后的中位数分别为 4–6ms 和 150–265ms。这是单一受控样例的描述性测量，不是大 DOM 压力测试，也不能把更小样式表等同于任意页面保真。usePageCss、字体/ShadowRoot/iframe 的作用域以及完整图像解码仍需分别处理，不整体移植旧分支的全局 Document 或选项修改。

继续定位 V2 的复制成本时，发现每一个样式属性都会对普通节点调用跨 realm iframe 类型识别。候选先检查属性是否为 display、值是否为 inline，再执行类型识别，保留原复制顺序和 CSSOM 写入。相同构建器、同一 401 节点输入、六次交替运行的配对对照中，捕获中位数 Chromium 202.8→141.6ms、Firefox 135→122ms、WebKit 150→138ms，三个引擎 SVG **字节完全相同**且源 DOM 不变。[性能证据](evidence/style-copy-performance.json)记录全部样本；这是前后耗时对照，不伪造新增的功能失败计数。批量 CSS 写入的实验只有约 2% 捕获收益，且未保持字节相同，已撤回。

本地 lint/构建/类型/tarball、覆盖率 220、源码 302（另 1 项既有 GC 跳过）、构建包 120 全部通过。源码 `c2f78c1` 真实 iPhone 的配对捕获中位数 135→124ms、SVG 字节一致；构建 ESM/UMD 完整 24/24 通过，[配对记录](evidence/ios-style-copy-paired.json)与[冒烟报告](evidence/ios-safari-style-copy-c2f78c1.json)已归档；[#629](https://github.com/bubkoo/html-to-image/pull/629) 已合入 master（`b9f2dfd`），PR/主分支 CI、CodeQL 与 PR Codecov 均通过；SVG 体积和大页面内存问题没有因此解决，#473/#585 不按整体完成处理。[重放与范围](evidence/style-copy-performance-replay.md)说明两个不同的对照实验。

## 已有对应实现：已回复并关闭的 22 个旧 PR

| PR | 对应结果与回复边界 |
| --- | --- |
| [#602](https://github.com/bubkoo/html-to-image/pull/602) | Issue #601 的重复 `Content-Type` 已在 V2 共用 Blob 转换入口独立修复，并有真实 HTTP 响应头、图片和背景图的三引擎测试；原 Android MAUI WebView 未复测。 |
| [#599](https://github.com/bubkoo/html-to-image/pull/599) | XML 非法控制字符的输出清理已有回归；原 Edge 环境未复测。 |
| [#598](https://github.com/bubkoo/html-to-image/pull/598), [#597](https://github.com/bubkoo/html-to-image/pull/597), [#595](https://github.com/bubkoo/html-to-image/pull/595) | V2 已独立实现逐节点样式选择、逐节点克隆回调和单次捕获的样式隔离；均有行为和构建包验证。 |
| [#596](https://github.com/bubkoo/html-to-image/pull/596), [#580](https://github.com/bubkoo/html-to-image/pull/580) | 本地片段保留及同文档绝对 `clip-path` URL 已分别覆盖；不同文档 URL 的行为也有断言。 |
| [#592](https://github.com/bubkoo/html-to-image/pull/592), [#589](https://github.com/bubkoo/html-to-image/pull/589) | data URL 解码等待和解码拒绝后不悬挂已有回归；原完整 fixture 与 iPhone 内存压力场景未复测。 |
| [#590](https://github.com/bubkoo/html-to-image/pull/590), [#550](https://github.com/bubkoo/html-to-image/pull/550) | `toBlob` 已传递 MIME 和质量，包含 `quality: 0` 的测试。 |
| [#583](https://github.com/bubkoo/html-to-image/pull/583), [#521](https://github.com/bubkoo/html-to-image/pull/521) | SVG 后代递归克隆与 `filter` 已有回归；ReactFlow 原项目未复测。 |
| [#576](https://github.com/bubkoo/html-to-image/pull/576), [#551](https://github.com/bubkoo/html-to-image/pull/551) | 同源 iframe 的 body 仅克隆一次已有回归；跨域 iframe 不在范围内。 |
| [#563](https://github.com/bubkoo/html-to-image/pull/563), [#380](https://github.com/bubkoo/html-to-image/pull/380) | 构建后的 ESM 导入及 npm 压缩包消费测试已覆盖路径扩展名问题；正式 npm 发布尚待验证。 |
| [#526](https://github.com/bubkoo/html-to-image/pull/526), [#397](https://github.com/bubkoo/html-to-image/pull/397) | README 的像素数据示例和公开 `Options` 类型已在 V2；核对贡献者原文后回复。 |
| [#514](https://github.com/bubkoo/html-to-image/pull/514), [#507](https://github.com/bubkoo/html-to-image/pull/507) | 字体规则遍历支持分组规则，`font-family` 通过 CSS 属性读取；三引擎 SVG 字体属性测试补充了使用路径。 |
| [#518](https://github.com/bubkoo/html-to-image/pull/518) | 当前构建与类型检查通过。关闭前还需逐项比对该 PR 的具体类型修改，避免把“能编译”误当成完全等价。 |

上述已有 V2 修复与测试的详细对应关系见 [v2-issue-pr-tracker.md](v2-issue-pr-tracker.md)。回复用“在 `master` 中独立解决”，不要写成“合并了你的 PR”。

## 本轮补齐：待本分支 CI 通过后回复

| PR | 处理 |
| --- | --- |
| [#427](https://github.com/bubkoo/html-to-image/pull/427) | 外部 SVG use 的依赖、变换后引用、样式子集、重定向最终地址与所在树片段作用域已有分批修复，至 #644 已合入。 | [svg-fragment-paint.json](evidence/svg-fragment-paint.json)、[svg-response-bases.json](evidence/svg-response-bases.json) | 限定/相对 paint、文件 CSS/字体、CSP 等仍开放；输出按用户选定的当前浏览器显示，不宣称任意 sprite 完成。 |
| [#575](https://github.com/bubkoo/html-to-image/pull/575), [#577](https://github.com/bubkoo/html-to-image/pull/577), [#581](https://github.com/bubkoo/html-to-image/pull/581) | V2 当前实现已通过新增 Chromium、Firefox、WebKit 回归：SVG 后代的 CSS 变量、重复渐变的多个周期、SVG `font-family` 属性选中的字体文件。无需移植旧补丁；原 PR 的完整 fixture 尚未运行。 |

## 部分覆盖：保留讨论，不按完整修复关闭

2026-11-11 字体路径复核（#511 / #415）：

- 原字号缩小来自历史 #270 对 #132 末词换行的绕过。当前三引擎都把 `20.75px` 改成 `19.9px`，可见的第二行消失，13.75px 文字也出现像素位移；每个引擎修复前各 5 项失败。已随 [#621](https://github.com/bubkoo/html-to-image/pull/621) 合入 `master`（`9a0be4f`），移除全局取整/缩小，默认保留源计算字号；V2 不增加 `skipFontSizeShrink` 开关。
- 受控字体的 auto/normal/none 字距、8.75/13.75/20.75px、1×/2× 输出及 #132 的原始 flex 结构均有回归。当前三引擎移除字号改写后通过，不改写源 `font-kerning`。原帖没有完整段落 fixture 或可靠环境信息，不能宣称全部字体、旧浏览器和应用组合已复测。

2026-11-11 图片路径复核：

- **#504：发现新的异步错误处理回归。** V2 已等待图片解码并保留 `decode` 方法，但调用 `onImageErrorHandler` 后未等待其返回值，导致异步恢复前冻结快照、回调拒绝被忽略。修复已随 #619 合入并等待回调 Promise；三引擎修复前各 2 项失败、修复后恢复后的绿色像素和原始异常传播通过，源图片不变。原 PR 的整体重构与完整应用 fixture 未移植。
- **#482：不采用无条件吞掉错误的方案。** V2 有资源诊断、占位图和图片错误回调；资源解析器异常、用户回调异常与未处理图片错误仍须拒绝捕获，避免把缺失内容当成成功快照。异步图片回调的遗漏按上项独立修复。
- **#401：当前解码等待路径已有覆盖。** `renderer.test.ts` 验证延迟 `decode()` 不被提前完成、不替换原方法，以及可用图像的 decode 拒绝不悬挂；构建包和真实设备另有 canvas/大图像素。尚未以原项目 fixture 证明全部问题解决。
- **#533 / #502：V2 不再等待动画帧。** `renderer.test.ts` 令 `requestAnimationFrame` 抛错后仍能导出；不新增旧 PR 的等待开关。此断言只证明内部路径不依赖动画帧，不保证浏览器后台标签页不会被系统挂起。

| PR | 剩余问题 |
| --- | --- |
| [#591](https://github.com/bubkoo/html-to-image/pull/591) | V2 有可选的多次栅格化，并在真实 iPhone 16 Pro Safari 验证过首帧透明、重绘成功；它不是 PR 的“两次相同才停止”算法。原帖的全部图像组合及其他 iOS 场景尚未证明。 |
| [#568](https://github.com/bubkoo/html-to-image/pull/568) | 原跨 realm 遍历需求已等价覆盖；另外发现的文档字体及生命周期缺陷已随 #623 合入。最终 `f4ab94e` 真机 21/21、字体定向 42/42、完整本地和远端检查通过，见上方记录；不外推至不可读跨源 iframe 或纯 JS FontFace 字节。 |
| [#451](https://github.com/bubkoo/html-to-image/pull/451) | [PR #617](https://github.com/bubkoo/html-to-image/pull/617) 复现了视频原始比例 960×540、显示区域 240×160 且 `object-fit: contain` 时的拉伸：修复前顶部留白变成视频画面。按视频原始宽高截取帧后，三引擎源码与构建 UMD 均导出正确的顶部留白与中心画面。原 PR 的截图页面、其他 `object-fit` 组合及高分辨率视频的资源成本尚未复测。 |

## 待复现和设计：拆成小问题处理，每个修复补回归

| 优先级 | PR | 下一步 |
| --- | --- | --- |
| 高 | [#409](https://github.com/bubkoo/html-to-image/pull/409), [#408](https://github.com/bubkoo/html-to-image/pull/408) | #409 的 CSS/像素尺寸分离已验证，零值/NaN 修复已随 #618 合入，见上方基线；#408 为部分滚动覆盖，自定义滚动条外观及复杂布局仍需独立复现。 |
| 高 | [#498](https://github.com/bubkoo/html-to-image/pull/498), [#442](https://github.com/bubkoo/html-to-image/pull/442), [#585](https://github.com/bubkoo/html-to-image/pull/585) | 用原 fixture 分离 iOS 资源获取和首次空白等根因；#585 是大范围替代实现，不整体移植。真实 iOS 回归需重新测目标场景。 |
| 中 | [#401](https://github.com/bubkoo/html-to-image/pull/401), [#482](https://github.com/bubkoo/html-to-image/pull/482), [#504](https://github.com/bubkoo/html-to-image/pull/504), [#533](https://github.com/bubkoo/html-to-image/pull/533) | 对照 V2 的图片加载、解码和资源错误路径；先构造能失败的用例，避免重复修复或吞掉用户回调错误。 |
| 中 | [#560](https://github.com/bubkoo/html-to-image/pull/560), [#430](https://github.com/bubkoo/html-to-image/pull/430), [#400](https://github.com/bubkoo/html-to-image/pull/400), [#443](https://github.com/bubkoo/html-to-image/pull/443) | 已有逐项结论与真实 HTTP fixture，见资源策略复核；已随 #622 合入；本地 190/213/105、真机 20/20、PR CI/CodeQL/Codecov 和主分支 CI/CodeQL 通过。 |
| 中 | [#511](https://github.com/bubkoo/html-to-image/pull/511), [#376](https://github.com/bubkoo/html-to-image/pull/376), [#407](https://github.com/bubkoo/html-to-image/pull/407), [#473](https://github.com/bubkoo/html-to-image/pull/473) | #511 的字号缩小修复已随 #621 合入 master，真机 16/16，见字体复核；其余继续评估伪元素注入、附加 CSS 和大页面分片的实际输出语义及资源成本。 |
| 低 | [#398](https://github.com/bubkoo/html-to-image/pull/398) | README 已有新预览示例，桌面三引擎通过；真机 PNG 生成/读取通过，新标签交互等待手动点击，见文档复核。 |

## 维护与无关内容

| PR | 处理 |
| --- | --- |
| [#574](https://github.com/bubkoo/html-to-image/pull/574), [#540](https://github.com/bubkoo/html-to-image/pull/540) | 已核对原改动、当前 lock/安装树和官方公告，两项旧锁文件 bump 均被现行工具链取代；见上方依赖记录，不直接移植旧锁文件。 |
| [#517](https://github.com/bubkoo/html-to-image/pull/517) | Reservation 页面与 DOM 转图片库无关；已说明范围后关闭。 |

以下为 #603 前的历史分组，并非本次 28 项目标的当前完成度。

历史合计：22 个已有对应实现、6 个本轮补齐、3 个部分覆盖、18 个待复现或设计、2 个依赖维护、1 个无关内容，共 52 个。

## 2026-11-11 混合文字滚动修复（#408 / #345 / #594）

此前包含直接文本或行内子元素时直接回退，导出丢失 scrollTop，源视口绿色而截图为红色。候选对正向纵向滚动、horizontal-tb 的块级容器，用副本 ::before 的流偏移表达滚动量；不包裹、不重排真实子节点。已有块级 ::before 保留内容，仅调整顶边距；空伪元素的 1px 高度防止与后续负边距合并。私有规则位于 SVG 外层最先声明的层，其 important 优先级依据 [CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/#layer-order)，避免源 ID 或分层 important 规则覆盖偏移。

14 种共享输入覆盖直接/换行文字、padding/border、首块负边距、结构选择器和分层 important、已有 before/after、sticky、变换包含块中的直接 fixed、嵌套、RTL 纵向、纯行内元素和同源 iframe。三引擎均先截取浏览器实际源页面作为像素对照，再核对捕获像素和源不变；最终输入在旧源码 42/42 失败，源对照无失败，候选 42/42 通过。完整 lint/构建/类型/tarball、234 覆盖率、344 源码（另 1 项既有 GC 跳过）及 123 构建包检查通过。[证据与范围](evidence/mixed-scroll.json)已归档，源码 `42e8012` 真实 iPhone Safari 完整 25/25 通过（新增 14 场景分别经 ESM/UMD 验证），[原始报告](evidence/ios-safari-mixed-scroll-42e8012.json)已归档；[#630](https://github.com/bubkoo/html-to-image/pull/630) 已合入 master（7169372），PR/主分支 CI、CodeQL 与 PR Codecov 全部通过。

横向/斜向混合文字、竖排、已有 inline before、绝对定位组合、其他 fixed 包含块及原生滚动条外观仍有边界；#408/#345 不按全部完成处理。

另对 #451 在 `b9f2dfd` 做了独立真实 iPhone 验证：960×540 视频暂停在 0 秒，240×160 object-fit:contain；默认 1 次与稳定化 3 次输出均保留上下紫色留白和中心视频像素，源不变。[原始记录](evidence/ios-video-aspect-b9f2dfd.json)及[输入](evidence/ios-video-aspect-input.html.txt)已归档。使用明确 video/mp4 MIME 的 Blob；最初静态 HTTP 输入在捕获前即不被设备支持，不能算库的回归。没有验证流媒体、CORS、播放时序、高 DPR 输出或所有适配组合。

## 2026-11-11 SVG 变换阶段与真实字体验收

本候选把 SVG 引用解析从克隆阶段移到资源阶段，并让 iframe 子树服从外层变换。新增/改向引用现在在 onClone/插件之后发现，移除的引用不先发起库请求；主源树节点回调仍在变换前，辅助局部定义的回调在资源导入时运行，README 已说明。基线 30 失败 / 6 通过，候选 36 通过；[阶段证据](evidence/transformed-svg-resources.json)区分共享场景与内部 cloneNode 兼容对照。

#581/#534 的六种入口/设置已补有效字体与像素：未经修改的发布源码 v1.11.13 默认 15 失败 / 3 通过，手动嵌入 18 通过；当前 V2 18 通过，含直接 SVG 根、负对照和实际源截图。没有新增字体运行时改写。[字体证据](evidence/svg-font-glyphs.json)与[重放](evidence/svg-resource-evidence-replay.md)已归档。

#585 的重定向/相对 paint [最终原生矩阵](evidence/svg-redirect-native-matrix.json)使用独立地址与源截图先后对照，纯色 external use 和黄色块验证源图有效。Chrome/真机 Safari 的相对 paint 为白底，Firefox/桌面 WebKit 为绿色；库输出为重定向红、直连绿。源全图像素保持不变，未合入统一最终 URL 的运行时改动，契约现已确定为当前页面保真，该重定向/相对 paint 修复仍未完成。

当前本地构建、类型、tarball、构建包 132 通过；最终全量 coverage/source 为 282/488（另 1 项既有 GC 跳过），字体 MIME 观察修正后再验三引擎源码 18、ESM/UMD 包 3 均通过。真机和远端待验；不关闭旧 PR，不发布 npm。


### 横向 fixed 初版（由下方二维 flex 扩展取代）

#408/#345 剩余边界复现：单行横向 flex 中，给普通包装子元素加 transform 会改变深层 fixed 的定位参照。最终 12 输入 × 三引擎的源截图控制全部有效，旧源码 33 项失败 / 3 项通过。候选用保持外部主轴尺寸的相反侧边距表达位移，仅调整原参照为当前滚动容器的 fixed/absolute inset；没有新增包含块。加原有 fixed 用例定向 126 通过，完整/真机/远端状态见[证据](evidence/horizontal-fixed-scroll.json)。对角、自动侧边距、多行 flex、匿名文本及 sticky 等仍不在此结论内，不作为整个旧 PR 完成。


## 当前验收缺口复核

GitHub 重新核对的 28 个旧 PR 均仍开放，head 与已读版本一致，索引文件均存在。#443 的受控双源 Cookie/公开资源测试已经通过；缺少的是原业务 URL/登录与完整应用 fixture，二者不能混写为“凭据对照未验”。

#632 的 CI/CodeQL/Codecov、#633 的 CI/Codecov 已通过，二者仍待当前真机验收；#633 转向 master 后还需 CodeQL。[具体缺口及验收条件](v2-issue-pr-tracker.md#当前验收缺口复核)集中记录真机、SVG 输出和滚动条范围，原始 head/证据复核见[审计索引](evidence/open-pr-current-audit.json)。


## 二维 flex 定位后代扩展候选

#633 的初版只修横向单行，但同一“普通项目新增 transform 改变 fixed/absolute 包含块”的根因仍存在于斜向、纵向、列布局和换行。现按两个滚动轴分别施加和为零的一对物理边距，保持项目外部尺寸和 flex 行分配，不新增包含块；定位后代仍按原 offsetParent 调整 inset。

最终同一 34 输入 × 三引擎：原父版本 4d1bd59 为 90 失败 / 12 通过，初版 7d66cb4 仍有 57 失败 / 45 通过，原生源控制均有效；候选的 102 项逐一比较完整 40×40 图像的 6400 个 RGBA 通道，全部相同，含原有 fixed 对照定向 192 通过。本地完整 coverage/source/package 为 316/590/135，另 1 项既有 GC skip，lint/构建/类型/tarball 均通过。[证据](evidence/horizontal-fixed-scroll.json)明确区分 b4d8d23 的历史横向 PNG 与本次完整源像素测试。

该候选支持 horizontal-tb 下 flex 的行/列/反向/换行/RTL、center/baseline 对齐及 absolute-only；非 flex、位移轴未解析 auto 边距、匿名文本/contents/生成项目、sticky、竖排、任意捕获根偏移和原生滚动条仍保留边界。新的远端检查和真实 iPhone 结果待验，不能沿用上一版通过数；#632/#633 未合并，不发布 npm。


## 普通块流与定位参照扩展候选

#633 继续处理普通块布局：沿用不会折叠的 before 纵向流偏移，组合横向相反边距，移动实际流盒及受支持 block before/after；定位后代按原 offsetParent 处理，真实子节点不包装、不重排。库插入的伪元素样式节点不作为内容流盒。新增 WeakSet 记录已克隆源元素，源映射清理和 dispose 一并清理，保留文档生命周期约束。

最终 55 输入 × 三引擎，165 个完整 40×40 原生源/导出图在 6400 个 RGBA 通道上零容差相同。恢复 clone-scroll.ts/task.ts 的原始父版本 4d1bd59 为 141 失败 / 24 通过，恢复上一 flex 候选 f3f997e 为 51 失败 / 114 通过；源控制全部有效，只接受完整 165 项、无浏览器未处理错误的运行。含旧 fixed/mixed 对照定向 297 通过，完整 coverage/source/package 为 337/653/135，另 1 项既有 GC skip，lint/构建/类型/tarball 均通过。[当前证据](evidence/positioned-scroll.json)与[重放](evidence/horizontal-fixed-scroll-replay.md)已更新；旧 horizontal JSON 明确标记 f3f997e 历史范围。

全量检查保留未克隆 absolute 包含块的原回退：捕获树外原点尚未重建，不能直接套当前容器偏移。水平匿名文本/inline/contents/float/sticky、未解析 auto 边距、部分伪元素、竖排、其他捕获根坐标和原生滚动条仍未完整覆盖。

[不滚动渐变观察](evidence/gradient-native-precision.json)另外验证：WebKit 源页面及原生计算样式往返为 [0,128,0,255]，库和完全手写 foreignObject 都为 [0,128,1,255]，最大通道差 1；Chrome/Firefox 为零。定位标记改为实色硬边界，仍严格比较全部像素；没有把渐变记为逐字节相同或实现通用校正。该观察探针是独立归档，不进入 CI 回归计数。

本版最新 PR head 的远端检查和真机待验；Mac 尚未识别原 USB iPhone，不沿用旧 26/26。#632/#633 未合并，不关闭旧 PR，不发布 npm。


## 2026-11-11 重连后的准确提交真机验收

#632 的准确 head 4d1bd59 重建后，真实 USB iPhone Safari（iOS 18.7、Safari 26.6.1、DPR 3、非模拟器）完整 28/28 通过；六种 SVG 字体入口的实际源截图、自动/显式红色字形、skipFonts 白色负对照及源不变控制全部通过。[原始报告](evidence/ios-safari-svg-transforms-4d1bd59.json)与[字体源截图](evidence/ios-native-font-4d1bd59.json)已归档。PR CI/CodeQL/Codecov 通过，#632 已合入 master 67b2ec2。

#633 的准确 head 9584645 重建后，真机完整 29/29 通过；另先截 55 种实际源元素，再捕获，每个 40×40 图像的 6400 个 RGBA 通道零容差一致，源 DOM/滚动不变。[原始报告](evidence/ios-safari-positioned-scroll-9584645.json)、[55 种源截图](evidence/ios-native-positioned-9584645.json)与[重放](evidence/ios-native-source-replay.py.txt)已归档。Safari 元素截图可能包含裁剪外的变换后代，因此按 DPR 裁取源视口；整张溢出图缩小造成的早期源控制失败不计入通过数。重放到新主分支后源码/fixture 字节一致，真机记录保留原始 revision；最终主分支目标的远端检查及合入状态另行记录。

#398 自动 USB 页面可生成 96×60 PNG，但退出自动化后，手动 Safari 无法访问 USB 和同一 Wi-Fi 地址。可信点击、新标签和清理仍待网络可达后验收，未用合成点击替代。

原需求复核：#408 关联 [#81](https://github.com/bubkoo/html-to-image/issues/81) 与 [#345](https://github.com/bubkoo/html-to-image/issues/345)。#81 的关闭来自 stale 机器人，不等于修复；其原 sandbox API 为 HTTP403、预览为 HTTP400。#345 已明确要求颜色、尺寸、轨道/滑块外观和位置，撤回此前要求用户缩减范围的选择。现有部分布局修复不等于两个 Issue 整体解决。
