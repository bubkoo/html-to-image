"""Generate the tiny, original test font. Requires fonttools (not needed in CI)."""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

builder = FontBuilder(1000, isTTF=True)
glyphs = [".notdef", "space", "A", "B"]
builder.setupGlyphOrder(glyphs)
builder.setupCharacterMap({32: "space", 65: "A", 66: "B"})
outlines = {}
for name in glyphs:
    pen = TTGlyphPen(None)
    if name != "space":
        pen.moveTo((0, 0))
        pen.lineTo((800, 0))
        pen.lineTo((800, 800))
        pen.lineTo((0, 800))
        pen.closePath()
    outlines[name] = pen.glyph()
builder.setupGlyf(outlines)
builder.setupHorizontalMetrics({name: (1000, 0) for name in glyphs})
builder.setupHorizontalHeader(ascent=800, descent=-200)
builder.setupNameTable({
    "familyName": "Capture Metrics",
    "styleName": "Regular",
    "uniqueFontIdentifier": "html-to-image Capture Metrics 1",
    "fullName": "Capture Metrics Regular",
    "psName": "CaptureMetrics-Regular",
})
builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
builder.setupPost()
builder.setupMaxp()
addOpenTypeFeaturesFromString(builder.font, "feature kern { pos A space -300; pos space B -300; } kern;")
# Fixed timestamps keep the binary reproducible.
builder.font["head"].created = builder.font["head"].modified = 3406620153
builder.font.recalcTimestamp = False
builder.save(Path(__file__).with_name("font-metrics.ttf"))

# A second original face makes document-local family collisions observable.
# Its glyph only fills the right half, while advances and baselines stay equal.
for glyph in builder.font["glyf"].glyphs.values():
    if hasattr(glyph, "coordinates"):
        for i, (x, y) in enumerate(glyph.coordinates):
            if x == 0:
                glyph.coordinates[i] = (400, y)
for name in glyphs:
    if name != "space":
        builder.font["hmtx"].metrics[name] = (1000, 400)
variant_names = {1: "Capture Frame Metrics", 3: "html-to-image Capture Frame Metrics 1", 4: "Capture Frame Metrics Regular", 6: "CaptureFrameMetrics-Regular"}
# Keep both Macintosh and Windows name records distinct for CoreText too.
for record in list(builder.font["name"].names):
    if record.nameID in variant_names:
        builder.font["name"].setName(variant_names[record.nameID], record.nameID, record.platformID, record.platEncID, record.langID)
builder.save(Path(__file__).with_name("font-frame-metrics.ttf"))
