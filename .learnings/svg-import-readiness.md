# Measure SVG import effects instead of trusting notification order

#640's PR checks passed, while post-merge master coverage failed Chromium supports-active with an import-probe-not-ready diagnostic. The original failure artifact has unchanged source and 800 differing channels; the case took 413 ms, not five seconds. Preserve that result separately from PR acceptance and do not rerun it away.

A use load notification can precede usable geometry. Conversely, both owned CSS imports can have measurable effects while a load listener receives no notification. New fault controls reproduce both old failures. Read valid geometry repeatedly within the existing deadline; positive effects of both imports can prove readiness without a notification. Keep the expired-probe fallback and cancellation behavior. Record load/width details in future failures, while acknowledging that the original artifact lacked those values.

Data stylesheet URLs have an opaque base. Leaving an unresolved relative paint URL unchanged during replay transfers it to the private HTTP document's base, creating a phantom request and changing fallback purple to a fetched red gradient. Preserve invalidity with about:invalid instead. A valid red target plus an explicit network positive control distinguishes this from a fixture that merely cannot load its resource.

Source `7206ada`, baseline `8f39d75`: same 150 controls are 4 fail / 146 pass before and 150 pass after. Full local 1072 / 953 / 153 with 4/4 inherited skips. Real iPhone: 42 native import comparisons, four cancellation controls, smoke 35 PASS / 2 INFO; its file CSS is inactive, so positive active-import behavior is measured in Chromium. [Evidence](../docs/evidence/svg-data-relative-urls/replay.md).
