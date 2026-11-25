## [LRN-20261125-021] best_practice

**Logged**: 2026-11-25
**Priority**: high
**Status**: pending
**Area**: rendering

### Summary
原生 SVGImage 的测量结果正确，不足以授权将图片解码和 Canvas 绘制加入默认 SVG 序列化路径。

### Details
样式处理指令可在不增加元素的 SVGImage 中测轮廓。当前9c09固定39场中36场坐标与XML对照相同且校正后RGBA零差，负外边距3场及额外6负控保持unknown。但当前toSvg与capture明确惰性绘制，测试还固定显式scale/translate、零尺寸SVG和三次稳定化的实际draw计数。默认新增预测量会改变这些合同；不能用36场通过抵消API变化。历史15场原始SHA实际40b6，目录和进度文字不是运行时身份。

### Suggested Action
优先处理源布局的根因。任何测量集成都要单独验证SVG-only不绘制、显式变换、零尺寸、绘制计数、取消和清理；unknown不得回退为原点0。用户已确认保留style/onClone主动设置的16px留白，源布局归一化应在这些回调之前。

### Metadata
- Source: investigation
- Pattern-Key: rendering.measurement-lazy-svg-api-contract
- Related Files: src/capture.ts, test/spec/renderer.test.ts, test/spec/options.test.ts

### Context Maintenance
- Scope: root2f5b369/currentUMD9c09; fixed desktop experiment matrix
- Authority: exact source/API tests and sealed original PNG/SVG bytes
- Revalidation: renderer contract or origin-normalization implementation changes
- Validation: experimental capability only; no production repair
- Last-Validated: 2026-11-25
- Evidence: docs/evidence/svgimage-pi-origin-20261125/summary.json
