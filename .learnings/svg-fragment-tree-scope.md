# 原生外部 SVG 片段作用域

用户选择跟随当前浏览器页面。必须先测真实 HTTP 源像素：WebKit/iPhone 的片段 paint 可用原页面/ShadowRoot 定义，嵌套 use 仍继承最初宿主；Chromium/Firefox 使用文件。不能把所有依赖一律解释为文件定义。实际 Blob resolver 的虚拟未显示图仍需保留文件图契约；可见原生实例即使经 no-op resolver 也遵循页面。

扁平化多个源树时，只为被引用的 SVG 目标分配私有 ID；提前改所有 SVG ID 会破坏无关 iframe 图片身份。显式 onClone ID 改动应保留。源树必须进入样式副本缓存身份；源生命周期控制必须持有捕获对象直到源 WeakRef 被回收。

能力探针需要正/负/平坦几何对照，保留原 CSP，释放节点、href、Blob URL，取消保留原原因。片段探针失败不得丢掉已有文件/页面样式测量。渐变的原生屏幕与 SVG 图像解码可能各差 153 通道且最大值 1；独立 plain/symbol/foreignObject SVG 相同才可标明边界，不允许像素容差。早期嵌套观测的 symbol/paint 重复 ID 无效，不能作为能力结论。

f3ab937：同102输入旧38失败/64通过，现102通过；全量1225/1106/159，4/4既有跳过；真机68组/136照片，60原生相等+8渐变边界，4取消，smoke37 PASS/2 INFO。三项早期 Firefox GC 失败原因仍未建立，保留日志，不称此绘制修复解决GC。证据 docs/evidence/svg-fragment-paint.json；其余限定地址等边界继续推进。
