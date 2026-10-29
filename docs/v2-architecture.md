# Capture architecture (working v2 branch)

## Decision

The unit of work is one capture. It copies the source DOM once, applies optional
changes to that detached copy, embeds reachable assets, and serializes a
self-contained SVG. PNG, JPEG, canvas, Blob, and pixels are derived from that
same snapshot. The SVG `foreignObject` and browser Canvas remain the rendering
engine; this project does not implement CSS layout or a second renderer.

There are three public levels:

1. `toPng(node, options)` and other existing functions for one-off use.
2. `createRenderer(defaults)` for shared configuration and named plugins.
3. `await renderer.capture(node, options)` for a frozen, reusable snapshot.

`renderer.capture()` returns after serialization. Later source DOM edits cannot
change its outputs. Its first raster output is lazy; further raster formats
reuse that bitmap. Each returned canvas is independently writable. Call
`capture.dispose()` when finished, especially when keeping snapshots around.
When `stabilizationAttempts` exceeds one, the raster stage draws that same SVG
multiple times and returns the last bitmap; it never re-clones the source DOM.

## Customization contract

For a single capture, `onClone({ root, signal })` may edit the detached root.
For repeated captures, `plugins: [{ name, transformClone, resolveResource }]`
adds named behavior. Registration order is deterministic: `onClone`, then each
`transformClone`; only then are fonts and images discovered. Duplicate plugin
names fail immediately. Defaults and call-specific plugin lists concatenate;
call-specific `style` and `resources` fields merge over renderer defaults.

`resources.resolve(request, context)` runs before plugin resolvers. Each
resolver receives `{ url, kind, contentType }` and a cancellation signal.
Returning `undefined` continues to the next resolver and eventually browser
`fetch`; returning a `Blob` supplies the resource. A resolver exception rejects
the capture. An ordinary network failure records a `resource-error` diagnostic
and applies `imagePlaceholder` where possible. Events from `onEvent` report
stages and warnings. Extensions must honor `signal` for prompt cancellation.

Resource requests and their deduplication belong to one capture. Concurrent
captures cannot share a stale response or a mutable option cache. Full URLs,
including query strings, distinguish resources by default. Set
`includeQueryParams: false` for the legacy identity rule. `cacheBust: true`
appends a new query value to the actual fetch URL. No process-wide cache is
retained.

## Migration and behavior changes

Existing imports and option names remain available. `toBlob` now respects
`type` and `quality`, including zero quality. Pixel output covers the full
scaled canvas. `includeStyleProperties` is scoped to each capture, including an
empty array. Font collection reads stylesheets and leaves the source document
unchanged. Image decoding no longer waits for a future animation frame.

Potentially observable changes:

- Distinct query strings are distinct assets unless `includeQueryParams` is
  explicitly `false`.
- An image that cannot load or decode rejects the capture when no
  `onImageErrorHandler` handles it. Custom resolver errors also reject.
- Operations default to a 30-second timeout. Set `timeout: 0` to disable it.
- `onClone` and plugin transforms see a detached DOM copy. Edits to the
  original DOM after capture completion are absent from the snapshot.
- A zero-sized DOM may be serialized as SVG but cannot become a raster image.
- Scrolled HTML element children are translated inside a clipped detached copy
  so the visible viewport survives serialization. Direct text children and
  sticky/fixed descendants need further fixture coverage.

## Limits and next gates

This branch is an architecture implementation, not a published major release.
SVG descendants now pass through the same clone, exclusion and style pipeline,
but SVG `<use>` references and symbols still need more regression fixtures.
Cross-origin CSS remains subject to browser access and fetch/CORS rules.
`foreignObject` browser support and canvas size limits still apply.
Responsive reflow into a new layout width is not yet a public mode: `width`
controls the captured copy, while `canvasWidth` scales the output bitmap.

Before a release, validate the SVG subtree and shadow/iframe adapters against
real fixtures, expand the initial automated WebKit and Firefox cases, and measure large-tree
memory and resource concurrency. A local Safari 26.5.2 smoke reproduced a
transparent large image on one draw and a correct marker with three draws;
this is a scoped observation, not an iOS or all-WebKit guarantee. Keep further
capabilities behind explicit contracts once their behavior is verified. The
current plugin slots cover removing/changing DOM and supplying private assets.

To repeat the browser smoke after `pnpm run build`, serve the repository root
over HTTP and open `test/browser/smoke.html`. The page displays pixel-based
results for ESM import, nested scrolling, and a newly generated large image;
its image case reports both the single-draw and stabilized pixels.
The same cases run automatically against built ESM with
`pnpm run test:browser:package`; source-level browser cases run with
`pnpm run test:browser:source`. See [test architecture](test-architecture.md).

See [the change-to-test map](v2-regressions.md) for the regression case tied to
each repaired behavior and the remaining validation gates.
