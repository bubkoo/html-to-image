# External SVG font metrics

On source `7a436c2`, the final 33 controls pass; the old runtime from `2aa3cda` fails 11 of them. CSS-connected FontFace ownership failures can preserve successful probing while silently losing the font used for ex units. Reuse the source-document font embedding/resource-loader path; do not enable fetched SVG font declarations merely because they can be parsed.

After requested faces load, non-rendering SVG symbols can retain fallback metrics already computed in Firefox. Recreate the private evaluation tree after font preparation. Await requested FontFaceSet.load promises rather than whole-document font readiness. Preserve skipFonts and explicit fontEmbedCSS precedence, loader error ownership, diagnostic decode failures and private-frame cleanup.

An exact independent SVG image control is necessary to separate library errors from browser paint differences. WebKit's larger/system controls still differ from the native page by 40/20 channels even in that authored image; these are not native pixel passes. Never compensate the measured palette or enlarge a pixel tolerance to make them pass.

Keep the first Firefox full-suite timeout as an unresolved historical stage, rather than claiming its cause from one successful rerun. Final complete local gates are 943 coverage / 824 source / 150 package, plus 4/4 inherited skips. Real iPhone repeats 56 prior native-photo comparisons, adds 10 font geometry/image controls and passes full smoke 34/34. See `docs/evidence/svg-font-units/replay.md` for boundaries and provenance.
