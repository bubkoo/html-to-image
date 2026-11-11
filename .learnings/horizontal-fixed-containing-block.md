## [LRN-20261111-021] Scroll encoding preserves positioned containing blocks

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: high
**Status**: pending
**Area**: scroll flow / containing blocks

### Summary
给普通包装节点添加 transform，会使 fixed/absolute 后代重新定位。二维 flex 的相反边距与普通块流的纵向偏移需要组合使用；不能把 flex 边距的“不折叠”性质直接套到普通块流。

### Details
共享物理边距编码。Flex 两轴成对位移；块流沿用空 before 的 1px 高度与负边距，或已有 block before 的 top 边距，横向再移动实际流盒与 block before/after。库为伪元素插入的无行内盒样式 STYLE 不参与流盒判断。真实子节点不包装、不重排。定位 inset 按源 offsetParent 归属处理。

全量检查保留了原“捕获树外 absolute 参照”的回退约束：其坐标原点尚未重建。新增 WeakSet 标记被克隆的源元素，不持有强引用；clearCloneSources/dispose 同步清理。局部捕获之外的原点不能直接套入当前容器偏移。

最终 55 输入 × 三引擎：原父版本 141 失败 / 24 通过，上一 flex 候选 51 失败 / 114 通过，原生源控制全部有效；候选 165 项逐一比较 6400 RGBA 通道，零容差全部相同，含旧 fixed/mixed 定向 297 通过。旧候选的 PNG/计数标注历史，不沿用为当前或真机通过。

WebKit 的渐变另做不滚动控制：源与计算样式往返一致，库和完全手写 SVG foreignObject 均出现相同 1 级蓝通道差异。布局标记采用实色硬边界，保持严格像素比较；观察独立归档，不把该渐变宣称为逐字节相同。

### Metadata
- Source: #408 / #345 / #594
- Related Files: ../src/clone-scroll.ts, ../src/task.ts, ../test/browser/fixtures/positioned-scroll.mjs, ../docs/evidence/positioned-scroll.json
- Pattern-Key: scroll.preserve-containing-blocks-and-flow

### Context Maintenance
- Scope: horizontal-tb 二维 flex 与受支持块流；外部坐标、水平匿名文本/inline/float/sticky、auto 边距、部分伪元素、竖排及原生滚动条保留边界
- Authority: 精确 4d1bd59 与 f3f997e，还原 clone-scroll.ts 和 task.ts，最终共享输入保持不变；排除未运行全部 165 项的基础设施失败
- Validation: 定向 297；完整 coverage/source/package 337/653/135（既有 GC skip 1），lint/build/types/tarball 通过；远端/真机状态见证据
- Last-Validated: 2026-11-11

### Native screenshot evidence
准确 head 9584645 真机 29/29，以及 55 个实际源截图/导出全像素对照通过。Safari 元素截图可包含裁剪外变换后代；须按源视口和 DPR 裁取，不能整张缩小。初始源控制失败已排除。#345 的外观范围原帖已明确，不应要求用户选择省略；#81 stale 关闭不算修复。

#633 最终 1c6b184 CI/CodeQL/Codecov 均通过，337/653/135；已合入 master 7d8d350。主分支 7d8d350 的 CI 42962301112 / CodeQL 42962301137 亦通过，完整计数和准确 checkout 已独立确认。
