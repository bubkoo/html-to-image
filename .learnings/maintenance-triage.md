## [LRN-20261111-009] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: dependency-maintenance

### Summary
旧依赖 bump 先核对当前 lock、完整安装树和官方公告对应主版本范围，避免重新引入已删除的依赖链。

### Details
#540 仅改 lock 升级 pbkdf2，而 e32e74c 迁移测试链后已移除该包，当前 lock/安装树均无。#574 仅将 Rollup 3.12.0 升至 3.30.0，当前只有 4.67.4；官方 GHSA-gcx4-mw62-g8wm 与 GHSA-mw96-cpmx-2vgc 的 4.x 修复边界分别为 4.22.4/4.59.0。实际生成 UMD 能区分 IMG 与 SCRIPT currentScript，目录逃逸输出在隔离临时目录中以 FILE_NAME_OUTSIDE_OUTPUT_DIRECTORY 拒绝。此结论只覆盖旧两项 bump，不表示全依赖审计无告警。

### Metadata
- Source: old PR review, local installed tree and official advisories
- Related Files: ../docs/evidence/maintenance-dependency-review.json, ../docs/open-pr-triage.md
- Pattern-Key: maintenance.old-lock-bump-current-reachability

### Context Maintenance
- Scope: a360c43 对应锁文件及安装树，旧 #540/#574
- Authority: 依赖证据 JSON 内的 lock hash、旧 PR head、官方范围及运行结果
- Revalidation: lock、测试链或公告范围改变时
- Validation: verified locally
- Last-Validated: 2026-11-11

## [LRN-20261111-010] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: medium
**Status**: pending
**Area**: blob-preview-example

### Summary
Blob 预览的生成、用户导航和 URL 释放是三个独立阶段，验证应分别记录。

### Details
README 的 toBlob 示例通过链接提供新标签预览，清理函数在链接及已打开预览不再使用后删除链接并 revoke。桌面 Chrome/Firefox/WebKit 实际检查 PNG MIME/尺寸/像素、opener 为空，以及关闭预览后清理导致旧地址 fetch 拒绝。真实 iPhone 生成/读取的 96×60 PNG 像素正确，但 WebDriver 原生 click/touch 未产生 DOM click；已请求一次手动点链接，未把 PNG 生成算作新标签交互通过。

### Metadata
- Source: README example validation
- Related Files: ../README.md, ../docs/evidence/blob-preview-browser-checks.json
- Pattern-Key: docs.blob-preview-generation-navigation-lifetime

### Context Maintenance
- Scope: README helper hash 对应代码、三桌面引擎；iPhone 新标签交互待补
- Authority: 浏览器证据 JSON 分阶段结果
- Revalidation: helper、浏览器导航或 URL 生命周期策略改变时
- Validation: desktop passed; iPhone generation/readback passed, manual navigation pending
- Last-Validated: 2026-11-11
