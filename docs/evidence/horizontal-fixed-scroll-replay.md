# Flex positioned-descendant scroll regression

The shared fixture remains `test/browser/fixtures/horizontal-fixed-scroll.mjs`; the original 12 horizontal modes are retained and 22 modes add diagonal/vertical, columns/reverse columns, wrapping/reverse wrapping, RTL, center/baseline alignment and absolute-only descendants. Each mode creates a 40×40 viewport. The browser-reported source containing block places the blue stripe at x=4/y=0; native source screenshots must validate blue/green (and purple for the independent absolute descendant) before capture. Required scroll axes must be nonzero.

```sh
pnpm exec vitest run --config vitest.browser.config.mts test/browser-unit/horizontal-fixed-scroll.test.ts test/browser-unit/fixed-scroll.test.ts
```

All 102 flex source/capture comparisons check every one of the 6400 RGBA channels, in addition to source setup and immutability assertions. With the final fixture unchanged, restoring only `src/clone-scroll.ts` from original parent `4d1bd59` gives 90 failures / 12 passes. Restoring only that file from the previous horizontal candidate `7d66cb4` gives 57 failures / 45 passes. Native setup controls pass on both. Candidate plus the existing fixed source tests passes 192/192. Restore source in `finally` when replaying in a checkout with other work.

The built ESM/UMD smoke case is now `flex scroll preserves positioned descendants`, with every mode exercised through both builds. Historical local-deep PNGs in the JSON are explicitly associated with b4d8d23; they do not represent current native-device validation. Current full-suite, remote and actual-device status are separate fields.

A transform creates a containing block for fixed/absolute descendants ([CSS Transforms](https://www.w3.org/TR/css-transforms-1/#transform-rendering)). Flex-item margins do not collapse ([Flexbox §4.2](https://www.w3.org/TR/css-flexbox-1/#item-margins)). Opposite margin deltas preserve each item's outer size in both dimensions; the native tests establish the resulting row/column/wrap behavior. Keep horizontal-tb, source mappings and the documented exclusions; do not extend the conclusion to arbitrary non-flex layouts, auto margins, anonymous/contents/generated flex items, sticky descendants, vertical writing modes or native scrollbar appearance.
