## [LRN-20261111-003] best_practice

**Logged**: 2026-11-11 (Asia/Shanghai)
**Priority**: medium
**Status**: resolved
**Area**: ci-automation

### Summary
Naturalclar/issue-action v2.0.1 的匹配规则需要显式 `assignees` 数组；没有需要分配的人也须给空数组。

### Details
PR #619 标题命中 `error`，自动标签动作在 `obj.assignees.forEach` 崩溃。此前未命中关键词的 PR 能通过，不能证明规则完整。核对该版本 `src/setIssueAssignee.ts` 和 README 后，为两条规则补 `assignees: []`。该工作流使用 `pull_request_target`，需主分支含修复才能验证；重新打开 PR 触发标签匹配，允许修复后重验失败的 opened 事件。

### Suggested Action
按实际动作版本验证规则的全部必填数组；检查命中与未命中分支。对读取主分支的元数据工作流，区分待合入配置与实际远端运行结果。

### Metadata
- Source: investigation
- Related Files: ../.github/workflows/pr-label-title-body.yml
- Pattern-Key: ci.keyword-labeler-required-assignees

### Context Maintenance
- Scope: Naturalclar/issue-action@v2.0.1 的 title 规则与 pull_request_target 工作流
- Authority: PR #619 失败日志及该动作 v2.0.1 的 setIssueAssignee 源码
- Revalidation: 升级动作、更换规则或触发事件后，重新验证命中关键词的 PR
- Validation: verified in remote keyword-matching workflow
- Last-Validated: 2026-11-11
- Evidence: https://github.com/bubkoo/html-to-image/actions/runs/42888760805

### Resolution
配置修复随 #620 合入 `master` 后，重新打开标题仍含 `error` 的 #619；[远端任务 42889630751](https://github.com/bubkoo/html-to-image/actions/runs/42889630751) 通过并写入 `bug` 标签。修复前后的触发标题未被改名规避。
