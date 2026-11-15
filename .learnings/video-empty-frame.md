# 无帧视频的空白区域与海报历史

currentSrc 只说明已选择媒体资源，不证明已有可绘制帧。HAVE_NOTHING 且无 poster 时，保留透明媒体区域及其背景/边框；不能把 0×0 画布的 data:, 当作图片加载。

有 poster 的情况不能机械回退：WebKit 在 pending play 后 pause 可隐藏海报，记录到的 readyState/currentSrc/paused/played/currentTime/seeking/networkState 与初始暂停相同，但原生像素不同。当前修复仅覆盖可确定的无海报空白区域，保留海报历史边界，不能宣称完整视频/浏览器媒体状态支持。

回归必须同时覆盖空 src、已选中但无数据的 HTTP 媒体、play/pause，保留正常已解码视频的原比例测试。共享 fixture 清理时移除 src 并 load()，中止尚未返回媒体数据的请求。构建包和手机使用同一 fixture。
