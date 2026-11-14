# Disposed font wrappers can retain their source document

A source Document can remain alive even after the private measurement iframe and cached document Promise are removed: the environment also closes over loaded FontFace wrappers borrowed from that source. Clear the private borrowed-font array during disposal. Do not remove faces from the user's FontFaceSet or describe this as browser-cache clearing.

Use paired native removed-frame, no-font, held-owner and dropped-owner controls. Test both opened and unopened private documents; hold the disposed owner through collection and verify its terminal state afterward. Boolean WeakRef assertions avoid retaining a failed document in reports. Source markup and font-set state must remain unchanged. Keep GC count unchanged.

Combined before suites can contaminate later native controls; preserve that history rather than attributing every failure to one defect. Here the combined suite has 5 failures/7 passes, while isolated loaded-font opened/unopened runs each isolate the held-owner defect in Chromium/Firefox with passing native controls. A standalone five-mode single-variable experiment agrees. WebKit's native iframe controls do not collect, so its assertions cover source/font/DOM/terminal state only.

Source 404798d: final 12 source-lifetime controls, targeted 59 (+1 inherited skip), full 1084 coverage / 965 source / 153 package (+4/+4 inherited skips). Real iPhone: ten font geometry/independent-image controls, four cancellation controls, smoke 35 PASS / 2 INFO. No device GC, fractional native compositor, original SPA pressure or HTTP/native cache claim. [Evidence](../docs/evidence/svg-source-font-lifetime/replay.md).
