# 滚动条占位与计算尺寸

- 原需求 #408 关联 #81 与 #345；内容偏移、原生滚动条外观和滑块位置要分别核实，尺寸修正不代表整个需求解决。
- Playwright Chromium 默认添加 --hide-scrollbars；系统还会切换到悬浮滚动条。源截图验证须移除前者并固定占位模式，否则会误判库与原生的差异或无法稳定复现。不要改用户系统设置。
- content-box 的 CSSOM used width/height 可能已减去占位，复制到第二个原生 scroller 会再次减去。使用 offset 与 round(used + padding + border) 的实际差额；伪元素 10.5px 声明可能实际只占 10px，不可直接相加。
- 放到滚动编码之后判断保留的空间：普通 overflow:hidden 使用内容视口，无须加回；stable gutter 在 inline 轴仍然保留，必须恢复，另一轴不要恢复。
- 原生源图、完全手写 SVG、库导出图三方对照定位表示层差异；Chromium both-edge 差异实际位于横向滑块，而非角落；Mac 44 通道、Linux 22。只在所有差异都位于横向滚动条带内且 authored/native 差异数相同、library/authored 为零时跳过原生保真，同时保留完整 authored SVG 和盒几何正对照。不要写死平台通道数。其他差异不能按该跳过处理。
- 固定内容取样必须落在真实 client viewport 内；开启占位滚动条后 40px 盒的 25px 坐标可能已经越界。scrolled 用例对 clientLeft/clientTop 起点后的全部内容像素比较。
- 最终回归基线 12 fail/25 pass/2 unsupported；候选 36 pass/3 skips。全量 349 coverage/689 source/138 package。原生原型两项 WebKit 严格失败留在独立分支，不混入此修正。

- 通过 getPropertyValue 读取可选 scrollbar-gutter；旧浏览器可能没有对应 IDL 属性，该方法仍安全返回空字符串。

- 浏览器专用启动选项只能放在对应实例/项目里。Mac WebKit 可能忽略 Chromium 选项，Linux WebKit 会直接报 Unknown option；本地全过不能代替远端跨平台验收。
