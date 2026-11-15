# Firefox 回收请求的同步边界

Playwright Firefox 157 的 Heap.collectGarbage 请求通知子进程，而返回路径没有等待子进程完成。GC/CC 原始写入状态的20次实验（主页面/真实子页面各10）显示，requestGC 返回后当前内容进程仍在写日志，实际页面往返后写入结束。进程必须由自己的堆标记识别，不能要求无关进程也结束。旧 canary 实验在读回时已经执行 page.evaluate，因此隐含了同样的屏障，不能证明 requestGC 本身等待完成。

Vitest collectGarbage 命令在同一请求后等待实际测试 Frame 的 evaluate 往返，再恢复测试。回收次数、严格 WeakRef 断言、超时、像素标准和跳过均不变。不把这个测试工具修正称为生产内存泄漏修复，也不保证所有不可达对象必然回收。旧失败和未修正但偶尔通过的 Linux 基线必须保留。

771df53：35项生命周期+1既有跳过；全量1225/1106/159，4/4既有跳过。生产与构建字节未变。证据 docs/evidence/svg-environment-release-gc.json；新远端门禁以最终 head 为准。#644 主分支43661748647失败仍是历史事实。
