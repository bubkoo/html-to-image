## [LRN-20261115-003] best_practice

**Logged**: 2026-11-15T00:13:24+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
远程点击返回成功不能代替可信点击证据；网络地址须按当前接口核实。

### Details
真实 iPhone 上 W3C element click 和 touch actions 均成功返回，但页面没有 click 事件、新标签句柄未增加。PNG MIME/尺寸/红蓝像素正确只证明编码与读取，不能外推预览交互。USB 地址应读取当前设备接口；实际 Wi-Fi 为 en0 的 10.0.0.6，旧 100.82 地址不适合作为当前 Wi-Fi 地址。实际 Wi-Fi 导航仍失败，未确立原因。

### Suggested Action
预览验收同时核对 isTrusted/userActivation、实际新标签、像素、noopener 与 cleanup；没有页面事件就保留未验。先确认接口和手机可达性，再让用户操作。

### Metadata
- Source: investigation
- Related Files: docs/evidence/blob-preview-device-20261115.json
- Pattern-Key: tests.safaridriver-trusted-input-observation

### Context Maintenance
- Scope: SafariDriver / real iPhone Safari 26.6.1，本次网络接口
- Authority: 页面事件记录、窗口句柄和当前接口读数
- Revalidation: 设备、系统、驱动或网络变化后重测
- Validation: verified
- Last-Validated: 2026-11-15
- Evidence: docs/evidence/blob-preview-device-20261115.json
