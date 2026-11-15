# GC 观察者诊断边界

901c4bc 与已通过 PR 受测合并树完全相同，主分支仍有三个 Firefox 和一个 WebKit 生命周期失败。已独立验证的回收请求同步缺口不足以解释所有失败，不得以 PR 通过代替 master，也不得重跑后覆盖原失败。

辅助观察先冻结原三次回收的结果，再比较原生/库 owner、计时器和 await/weak-Promise/清空局部变量形式。额外诊断回收不能替换主断言。强持有对象、简单对象 canary、源字体与 frame 清理都是配对控制；只记录纯值，避免诊断自己持有 Document。Mac 的12测试、9原始采样、60辅助观察全过不构成Linux根因。

生产代码未改，分支推送触发器和始终记录标志属于临时排查，合入前必须去掉。证据 docs/evidence/gc-observer-controls.json。
