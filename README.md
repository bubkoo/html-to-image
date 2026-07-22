<h1 align="center">html-to-image</h1>

<p align="center"><strong>✂️ Generates an image from a DOM node using HTML5 canvas and SVG.</strong></p>

<p align="center">Fork from <a href="https://github.com/tsayen/dom-to-image" rel="nofollow">dom-to-image</a> with more maintainable code and some new features.</p>

<p align="center">
<a href="https://github.com/bubkoo/html-to-image/actions/workflows/ci.yml"><img alt="build" src="https://img.shields.io/github/actions/workflow/status/bubkoo/html-to-image/ci.yml?branch=master&logo=github&style=for-the-badge"></a>
<a href="https://app.codecov.io/gh/bubkoo/html-to-image"><img alt="coverage" src="https://img.shields.io/codecov/c/gh/bubkoo/html-to-image?logo=codecov&style=for-the-badge&token=BWweeU2uNX"></a>
<a href="https://www.npmjs.com/package/html-to-image" rel="nofollow"><img alt="NPM Package" src="https://img.shields.io/npm/v/html-to-image.svg?logo=npm&style=for-the-badge" /></a>
<a href="https://www.npmjs.com/package/html-to-image" rel="nofollow"><img alt="NPM Downloads" src="http://img.shields.io/npm/dm/html-to-image.svg?logo=npm&style=for-the-badge" /></a>


</p>

<p align="center">
<a href="/LICENSE"><img src="https://img.shields.io/github/license/bubkoo/html-to-image?style=for-the-badge" alt="MIT License"></a>
<a href="https://www.typescriptlang.org"><img alt="Language" src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=for-the-badge"></a>
<a href="https://github.com/bubkoo/html-to-image/pulls"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge"></a>
</p>

## Install

```shell
npm install --save html-to-image
```

## Usage

```js
/* ES6 */
import * as htmlToImage from 'html-to-image';
import {
  Cache,
  getFontEmbedCSS,
  toBlob,
  toCanvas,
  toJpeg,
  toPixelData,
  toPng,
  toSvg,
} from 'html-to-image';

/* ES5 */
var htmlToImage = require('html-to-image');
```

The rendering functions below accept a DOM node and rendering options, and return a promise with the corresponding output:

- [toPng](#toPng)
- [toSvg](#toSvg)
- [toJpeg](#toJpeg)
- [toBlob](#toBlob)
- [toCanvas](#toCanvas)
- [toPixelData](#toPixelData)

Go with the following examples.

#### toPng
Get a PNG image base64-encoded data URL and display it right away:

```js
const node = document.getElementById('my-node');

htmlToImage
  .toPng(node)
  .then((dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    document.body.appendChild(img);
  })
  .catch((err) => {
    console.error('oops, something went wrong!', err);
  });
```

Get a PNG image base64-encoded data URL and download it (using [download](https://github.com/rndme/download)):

```js
htmlToImage
  .toPng(document.getElementById('my-node'))
  .then((dataUrl) => download(dataUrl, 'my-node.png'));
```

#### toSvg
Get an SVG data URL, but filter out all the `<i>` elements:

```js
function filter(node) {
  return node.tagName === 'I' ? 'remove' : 'keep';
}

htmlToImage
  .toSvg(document.getElementById('my-node'), { filter: filter })
  .then(function (dataUrl) {
    /* do something */
  });
```

#### toJpeg
Save and download a compressed JPEG image:

```js
htmlToImage
  .toJpeg(document.getElementById('my-node'), { quality: 0.95 })
  .then(function (dataUrl) {
    var link = document.createElement('a');
    link.download = 'my-image-name.jpeg';
    link.href = dataUrl;
    link.click();
  });
```

#### toBlob
Get a PNG image blob and download it (using [FileSaver](https://github.com/eligrey/FileSaver.js)):

```js
htmlToImage
  .toBlob(document.getElementById('my-node'))
  .then(function (blob) {
    if (window.saveAs) {
      window.saveAs(blob, 'my-node.png');
    } else {
     FileSaver.saveAs(blob, 'my-node.png');
   }
  });
```

#### toCanvas
Get a HTMLCanvasElement, and display it right away:

```js
htmlToImage
  .toCanvas(document.getElementById('my-node'))
  .then(function (canvas) {
    document.body.appendChild(canvas);
  });
```

#### toPixelData
Get the raw pixel data as a [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) with every 4 array elements representing the RGBA data of a pixel:

```js
var node = document.getElementById('my-node');

htmlToImage
  .toPixelData(node)
  .then(function (pixels) {
    for (var y = 0; y < node.scrollHeight; ++y) {
      for (var x = 0; x < node.scrollWidth; ++x) {
        pixelAtXYOffset = (4 * y * node.scrollHeight) + (4 * x);
        /* pixelAtXY is a Uint8Array[4] containing RGBA values of the pixel at (x, y) in the range 0..255 */
        pixelAtXY = pixels.slice(pixelAtXYOffset, pixelAtXYOffset + 4);
      }
    }
  });
```

#### React
```tsx
import React, { useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';

const App: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)

  const onButtonClick = useCallback(() => {
    if (ref.current === null) {
      return
    }

    toPng(ref.current, { cacheBust: true, })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = 'my-image-name.png'
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.log(err)
      })
  }, [ref])

  return (
    <>
      <div ref={ref}>
      {/* DOM nodes you want to convert to PNG */}
      </div>
      <button onClick={onButtonClick}>Click me</button>
    </>
  )
}
```

## Migration notes

- `filter` now runs for the root and every descendant element and must return `keep`, `unwrap`, or `remove`. Boolean callbacks no longer exclude nodes.
- The standalone `backgroundColor` option has been removed. Use `style: { backgroundColor: '...' }`.
- Output bounds are measured from the styled and filtered clone. Consumer-provided dimensions and layout-changing styles can therefore change the output size, and filtering can reduce it.
- Resource caching is now opt-in and caller-owned. The library no longer retains fetched resources in a module-global cache for the application lifecycle, and `includeQueryParams` now defaults to `true`.

## Options

### filter

```ts
(domNode: HTMLElement) => 'keep' | 'unwrap' | 'remove'
```

A function invoked for the root node and every descendant element. Return `keep` to preserve the node and process its descendants, `unwrap` to omit only the node while preserving its descendants, or `remove` to omit the node and its entire subtree.

You can add a filter to every image function. For example:

```ts
const filter = (node: HTMLElement) => {
  const exclusionClasses = ['remove-me', 'secret-div'];
  return exclusionClasses.some((classname) => node.classList?.contains(classname))
    ? 'remove'
    : 'keep';
}

htmlToImage.toJpeg(node, { quality: 0.95, filter });
```

### width, height

Width and height in CSS pixels applied to the cloned root before layout and computed-style capture. They determine the logical SVG or canvas output size without modifying the original DOM node. If only one dimension is supplied, the other is measured after the clone has reflowed.

### canvasWidth, canvasHeight

Scale the final canvas, including its contents, to the given logical width and height in pixels. These options do not change the cloned node's layout; use `width` and `height` for that.

### style

An object whose properties are applied to the cloned root before layout and output-size measurement. Layout-changing properties such as `width` and `height` therefore affect the capture bounds. The original DOM node is not modified.

To set the output background, provide it through `style`:

```js
htmlToImage.toPng(node, {
  style: { backgroundColor: '#fff' },
});
```

See the [CSS properties reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Properties_Reference) for JavaScript property names.

### quality

A number between `0` and `1` indicating image quality (e.g. `0.92` => `92%`) of the JPEG image.

Defaults to `1.0` (`100%`)

### cacheBust

Set to `true` to append the current time as a query string to resource requests. Cache-busted requests bypass reads and writes for a caller-provided `Cache`.

Defaults to `false`

### cache

A caller-owned resource cache. Resource caching is opt-in: when `cache` is omitted, fetched images, fonts, stylesheets, and external SVG definitions are not retained between render calls. The library does not create a module-global resource cache that remains alive for the application lifecycle.

```js
import { Cache, toPng } from 'html-to-image';

const cache = new Cache();
await toPng(firstNode, { cache });
await toPng(secondNode, { cache });
```

Reuse the same instance to reuse fetched resources. Create a new instance, or stop retaining the old one, to start with an empty cache and allow its entries to be released.

### includeQueryParams

Controls resource cache keys when `cache` is supplied. `true` keeps the query string, so `/image.png?v=1` and `/image.png?v=2` use different entries. `false` strips the query string before constructing the key, so those URLs share an entry. The requested URL is never changed by this option.

Defaults to `true`

### imagePlaceholder

A data URL for a placeholder image that will be used when fetching an image fails.

Defaults to an empty string and will render empty areas for failed images.

### onImageErrorHandler

An error handler called when an embedded image fails to load. If the handler completes successfully, the image error is considered handled and a later decode failure is ignored. Errors thrown by the handler, including rejected promises it returns, are propagated to the rendering call.

### pixelRatio

The pixel ratio of the captured image. Default use the actual pixel ratio of the device. Set `1` to
use as initial-scale `1` for the image.

### preferredFontFormat

The format required for font embedding. This is a useful optimisation when a webfont provider
specifies several different formats for fonts in the CSS, for example:

```css
@font-face {
  name: 'proxima-nova';
  src: url("...") format("woff2"), url("...") format("woff"), url("...") format("opentype");
}
```

Instead of embedding each format, all formats other than the one specified will be discarded. If
this option is not specified then all formats will be downloaded and embedded.

### fontEmbedCSS

When supplied, the library will skip the process of parsing and embedding webfont URLs in CSS,
instead using this value. This is useful when combined with `getFontEmbedCSS()` to only perform the
embedding process a single time across multiple calls to library functions.

```javascript
const fontEmbedCSS = await htmlToImage.getFontEmbedCSS(element1);
html2Image.toSVG(element1, { fontEmbedCSS });
html2Image.toSVG(element2, { fontEmbedCSS });
```

### skipAutoScale

When supplied, the library will skip the process of scaling extra large doms into the canvas object.
You may experience loss of parts of the image if set to `true` and you are exporting a very large image.

Defaults to `false`  

### type

A string indicating the image format. The default type is image/png; that type is also used if the given type isn't supported.
When supplied, the toCanvas function will return a blob matching the given image type and quality. 

Defaults to `image/png`

### includeStyleProperties

An array of style property names. Can be used to manually specify which style properties are included when cloning nodes. This can be useful for performance-critical scenarios.

## Browsers

Only standard browser APIs are used, but make sure your browser supports:

- [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- SVG `<foreignObject>` tag
- `HTMLImageElement.decode()`
- `TextDecoder`
- `CSS.escape()`
- `String.prototype.matchAll()`

The automated test suite runs in Chrome. The library targets modern Chrome, Firefox, and Safari, with Chrome generally performing better on large DOM trees.

### iOS/WebKit

For canvas-based outputs, iOS waits for rendering to settle and draws the generated SVG to the canvas a second time on a later frame. This is an automatic workaround for a WebKit issue where images or other elements can be missing from the first canvas draw. iPadOS devices using a desktop-style user agent are detected as well.

*Internet Explorer is not (and will not be) supported, as it does not support SVG `<foreignObject>` tag.*

## How it works

There might some day exist (or maybe already exists?) a simple and standard way of exporting parts of the HTML to image (and then this script can only serve as an evidence of all the hoops I had to jump through in order to get such obvious thing done) but I haven't found one so far.

This library uses a feature of SVG that allows having arbitrary HTML content inside of the `<foreignObject>` tag. So, in order to render that DOM node for you, following steps are taken:

1. Clone the original DOM node recursively and apply the configured filter. External SVG `<use>` definitions and their referenced dependencies are copied into the clone. Video frames and posters are replaced with images while preserving the computed video styles.
2. Apply consumer-provided dimensions and styles, attach the clone to an off-screen container, and wait for browser layout and paint work to settle.
3. Read browser-computed styles, then apply them to the clone in a batched write pass. Measure the output from this styled and filtered clone.
   - and don't forget to recreate pseudo-elements, as they are not cloned in any way, of course
4. Embed images
   - embed image URLs in `<img>` elements
   - inline images used in `background` CSS property, in a fashion similar to fonts
5. Embed web fonts
   - find all the `@font-face` declarations that might represent web fonts
   - parse file URLs, download corresponding files
   - base64-encode and inline content as dataURLs
   - concatenate all the processed CSS rules and put them into one `<style>` element, then attach it to the clone
6. Serialize the cloned node to XML
7. Wrap XML into the `<foreignObject>` tag, then into the SVG, then make it a data URL
8. Optionally, to get PNG content or raw pixel data as a Uint8Array, create an Image element with the SVG as a source, render it on an off-screen canvas, and read the content from the canvas. On iOS, clear and redraw the same canvas on a later frame to avoid incomplete first draws.
9. Done!


## Things to watch out for

- If the DOM node you want to render includes a `<canvas>` element with something drawn on it, it should be handled fine, unless the canvas is [tainted](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image) - in this case rendering will rather not succeed.
- Rendering will failed on huge DOM due to the dataURI [limit varies](https://stackoverflow.com/questions/695151/data-protocol-url-size-limitations/41755526#41755526).

## Contributing

Please let us know how can we help. Do check out [issues](https://github.com/bubkoo/html-to-image/issues) for bug reports or suggestions first.

To become a contributor, please follow our [contributing guide](/CONTRIBUTING.md).

<a href="https://github.com/bubkoo/html-to-image/graphs/contributors">
  <img src="/CONTRIBUTORS.svg" alt="Contributors" width="740" />
</a>


## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
