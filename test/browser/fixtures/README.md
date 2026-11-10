# Font metrics fixture

`font-metrics.ttf` is an original 1.1 KB test font covered by this repository's
MIT license. `A` and `B` are solid rectangles; the space is empty. Every glyph
advances 1000 units. A `kern` feature reduces the `A`/space and space/`B`
pairs by 300 units, so tests can distinguish enabled kerning from disabled
kerning without relying on fonts installed on the host.

The tests measure each browser's actual source text layout, then check the
same pixels in exported images. They exercise fractional font sizes, a
two-line paragraph, a tightly fitting last word, and explicit/default kerning.
The unit suite separately retains the flex layout from Issue #132.

To regenerate with FontTools 4.60.2:

```sh
python3 -m venv /tmp/html-to-image-font-tools
/tmp/html-to-image-font-tools/bin/pip install fonttools==4.60.2
/tmp/html-to-image-font-tools/bin/python test/browser/fixtures/generate-font-metrics.py
```

The generator uses fixed timestamps for reproducible output. The checked-in
font is used directly by tests; Python and FontTools are not required by CI
or by library consumers.
