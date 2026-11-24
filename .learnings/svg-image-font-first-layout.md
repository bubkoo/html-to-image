# Draft: SVG image font readiness is an image-creation ordering boundary

## Observation

With the frozen WebKit DPR1 visible-text SVG, the first target draw differs by 264 channels on default Canvas and 246 on software. Decoding a separate minimal image that actually uses the same embedded font URL before creating the target reduces the target's first draw to 21/max1 default and 0 software. No warm draw, timer, RAF or target re-export is required for that local positive. Reversing those two decode operations leaves the target first draw at 264/246.

Two repeats across independent default/software contexts preserve the distinction. Same URL with HTML glyphs, SVG text or a different family prepares it; an unused face, wrong-family text or a distinct valid URL containing the same 1120 font bytes does not. These controls comprise 28 contexts; the complete follow-up comprises 61.

## Negative evidence

Accessible SVG object/iframe documents can report one loaded face, fonts.ready and completed element geometry without preparing the SVG-image path. After-target FontFace URL/bytes loading, adding the face and awaiting top-document fonts.ready, raw font fetch, unrelated image decode, image public-property reads, synchronous carrier layout/resize, font-face relocation and font-display changes do not fix the target. They should not be used as generic readiness signals for the private SVG image document.

## Interpretation and boundary

The operation order and URL identity support an SVG-image font-resource/cache dependency established before the target's first layout. This is not a directly instrumented proof of a unique WebKit internal cache or invalidation object. The saved pinned engine implementation waits for the image document's Window load, without exposing its private FontFaceSet readiness.

Default Canvas still differs by 21 channels after preparation. Software zero is restricted to this glyph fixture; previous backend/blur/fractional controls remain valid. Do not add arbitrary waits, hidden prepainting, global all-font preparation or extra target exports as a default production fix from this result.

## Evidence

`font-lifecycle-followup/assessment.json`, `event-results.json`, `order-results.json`, raw first PNGs and per-control warm SVGs. All work is output-only. Browsers and loopback services were closed before the main thread's exclusive final gates continued.
