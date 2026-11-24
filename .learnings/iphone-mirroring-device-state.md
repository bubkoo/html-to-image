## [LRN-20261125-010] best_practice

**Logged**: 2026-11-25T02:02:04+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
iPhone Mirroring 与 Safari USB 自动化需要不同的手机锁屏状态，连接成功不能记作产品验收。

### Details
镜像窗口明确提示 iPhone in Use / Lock your iPhone to connect。用户锁屏后，点击同一窗口的 Connect 成功显示真实手机主屏幕。View → Spotlight 可打开手机搜索；通过 System Events 输入前必须让 iPhone Mirroring 成为 frontmost，单独向 process 发 keystroke 未改变输入框。之后已看到 Safari 搜索结果。用户随后要求至少四小时内不做真机验证，已退出镜像释放设备；未操作网络设置，也没有任何候选产品的真机通过结论。

### Suggested Action
按实际验证方式检查设备状态：镜像保持手机锁定，Safari USB 自动化按其连接反馈处理。镜像连接、浏览器启动、测试页面加载与产品断言分别记录。保留网络设置；设备暂不可用时推进桌面工作。

### Metadata
- Source: investigation
- Related Files: output/playwright/native-scroll-followup/device-deferral-20261125.json
- Pattern-Key: tests.iphone-mirroring-lock-and-input

### Context Maintenance
- Scope: 当前 Mac 的 iPhone Mirroring 和已配对真实 iPhone
- Authority: 镜像窗口原文、连接后窗口截图、前台输入与搜索结果
- Revalidation: macOS、iOS 或远程输入方式变化后重测
- Validation: verified connection only; product acceptance not performed
- Last-Validated: 2026-11-25
- Evidence: output/playwright/native-scroll-followup/iphone-mirroring-connect.png; output/playwright/native-scroll-followup/iphone-mirroring-connected.png; output/playwright/native-scroll-followup/device-deferral-20261125.json
