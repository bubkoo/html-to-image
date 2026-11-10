# Capture architecture (V2)

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

Canvas creation uses the library's document, rather than retaining the source
document for lazy rendering. Returned canvases belong to that library document.
The renderer's task-release callback is bound outside the capture invocation's
lexical environment, which can otherwise retain the source node in Firefox even
after disposal. This source-document release is separate from keeping the private
clone document alive until serialization, as described below.

## Customization contract

For a single capture, `onClone({ root, signal })` may edit the detached root.
`onCloneNode(original, copy)` can edit each element's detached copy after its
children and styles have been copied; it runs child-first, before `onClone`.
`stylePropertiesForNode(original)` selects computed CSS properties for that
element and its pseudo elements before copying; its `undefined` result means
all properties, even when `includeStyleProperties` is set. These per-element
callbacks are synchronous and do not touch the source DOM.
Default style copying keeps inherited CSS custom properties on the nearest
copied ancestor instead of repeating equal values on every descendant. A
different descendant value is copied locally. An explicit style-property list
still copies every requested property on each selected node.
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
retained. Browser HTTP caching is separate: `fetchRequestInit.cache` controls
the normal fetch, and a resolver owns the options of its own requests.
Disposal clears library references and cancels work, without forcing browser
cache eviction or garbage collection.

Clones belong to one private HTML document with a base URL and no browsing
window. Styles and image attributes can therefore change without starting
native image requests outside the resource loader. Source image URLs retain
their original document resolution; embedding also resolves images introduced
by transforms. Decoding uses a temporary image in the active document when
the inert copy cannot decode itself. That image receives only embedded data.

## Font ownership across documents

The capture operation keeps a strong reference to its private clone document
until serialization, and passes it to the SVG serializer. Holding detached nodes
alone allowed WebKit to replace their document/base URI with `about:blank` during
an asynchronous resource load; the same image then acquired relative and absolute
cache identities. The document is released with the completed DOM stage, rather
than retained by the frozen snapshot or a global cache.

Cloning records each copy's source element only for the resource-discovery stage.
The task clears this mapping after font embedding and on disposal. Font collection
uses the copied tree to identify reachable source documents, so excluded iframe
subtrees do not contribute conflicting faces or fetches. Each document supplies its
own stylesheets, adopted stylesheets and source shadow-root rules; relative URLs
retain the owning document's base. Style nodes added by transforms are collected
from the copy as well.

Flattening iframe bodies otherwise makes equal family names from different
documents collide. Faces from additional documents receive private family names;
inline and pseudo/style rules in those copies reference the same names. Descriptors
are read and serialized into new rules because Firefox face descriptors are
read-only. Original face declarations are removed from copied style nodes after
collection, leaving the embedded or explicit face definitions as their source;
local-only sources are preserved. Source stylesheets are never rewritten.

Only a weak document-to-identifier association survives captures. It stores no
response, source element or caller options. Family identifiers remain stable for
`getFontEmbedCSS()` reuse with the same subtree and live iframe documents. Recollect
that CSS after frame navigation/replacement or changing document boundaries.
Explicit CSS using ordinary family names retains its global override semantics.
Generated names are recognized from parsed font-face declarations, including
nested rules; names occurring only in comments do not select document aliases.
This covers CSS-defined faces; it does not extract bytes from arbitrary FontFace
objects created only through JavaScript, or promise isolation between conflicting
font definitions in separate shadow roots of the same document.

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
- DOM cloning yields to browser tasks after about 16 ms by default. Set
  `cloneTimeSliceMs: 0` to disable yielding, or a positive value to adjust the
  interval. Source changes from other page tasks can be observed during a
  time-sliced capture, so keep the source stable until capture completes.
- `onClone`, `onCloneNode` and plugin transforms see a copy in a private
  document whose `defaultView` is `null`. Create added nodes using
  `copy.ownerDocument`; read source layout from `original`. Edits to the
  original DOM after capture completion are absent from the snapshot.
- Access errors for inaccessible iframe documents use the iframe fallback;
  errors from user clone callbacks inside accessible frames reject the capture
  with the original error.
- A zero-sized DOM or explicit zero `width`/`height` may be serialized as SVG
  but cannot become a raster image. Only omitted dimensions use source
  measurements; negative or non-finite dimensions reject capture creation.
- A `clip-path` URL that resolves to the source document and has a fragment is
  localized to `url(#id)` on the detached copy; other documents' URLs remain
  unchanged. The source DOM is not edited.
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
