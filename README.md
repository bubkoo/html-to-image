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
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';

/* ES5 */
var htmlToImage = require('html-to-image');
```

All the top level functions accept a DOM node and rendering options, and return a promise with the requested output:

- [toPng](#toPng)
- [toSvg](#toSvg)
- [toJpeg](#toJpeg)
- [toBlob](#toBlob)
- [toCanvas](#toCanvas)
- [toPixelData](#toPixelData)

### Reuse and customization (v2 branch)

The existing functions remain the shortest path for one image. Create a renderer
when several captures share defaults, and create a capture when the same DOM
snapshot needs several formats:

```ts
import { createRenderer } from 'html-to-image'

const renderer = createRenderer({ pixelRatio: 2, skipFonts: false })
const capture = await renderer.capture(document.querySelector('#receipt')!)
try {
  const png = await capture.toPng()
  const jpeg = await capture.toJpeg({ quality: 0.85 })
  const blob = await capture.toBlob({ type: 'image/webp', quality: 0.8 })
  // All three outputs use the same frozen DOM snapshot and rasterization.
} finally {
  capture.dispose()
  renderer.dispose()
}
```

For a one-off change, `onClone` edits the detached copy before resource
discovery. For reusable behavior, register a named plugin. A resource resolver
returns a `Blob` to handle a URL, or `undefined` to continue to the next
resolver and then normal `fetch`:

```ts
const renderer = createRenderer({
  onClone: ({ root }) => {
    root.querySelectorAll('[data-private]').forEach((node) => node.remove())
  },
  plugins: [{
    name: 'app-assets',
    resolveResource: async ({ url, kind }, { signal }) => {
      if (!url.startsWith('app:')) return undefined
      return fetch(`/assets/${url.slice(4)}`, { signal }).then((res) => res.blob())
    },
  }],
})
```

Each capture has its own cancellation signal and resource cache. `capture.dispose()`
releases the snapshot; `renderer.dispose()` cancels outstanding work and releases
its captures. Per-call `signal` and `timeout` are supported. `exclude` accepts
CSS selectors for subtrees. See [v2 architecture](docs/v2-architecture.md) for
extension order, migration details, and current limits.

On WebKit, a large embedded image can be blank on the first rasterization.
If affected, opt into repeated rasterization of the same snapshot:

```ts
const png = await htmlToImage.toPng(node, { stabilizationAttempts: 3 });
```

This adds rendering time and is capped at 10 attempts. The default is one.

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
function filter (node) {
  return (node.tagName !== 'i');
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
Get the raw RGBA pixel data. `toPixelData` returns a `Uint8ClampedArray`;
`toImageData` also provides the actual output width and height, which account
for `pixelRatio` and canvas scaling:

```js
const { width, height, data } = await htmlToImage.toImageData(node);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const offset = 4 * (y * width + x);
    const rgba = data.slice(offset, offset + 4);
  }
}
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

## Options

### filter

```ts
(domNode: HTMLElement) => boolean
```

A function taking DOM node as argument. Should return true if passed node should be included in the output. Excluding node means excluding it's children as well.

You can add filter to every image function. For example, 

```ts
const filter = (node: HTMLElement) => {
  const exclusionClasses = ['remove-me', 'secret-div'];
  return !exclusionClasses.some((classname) => node.classList?.contains(classname));
}

htmlToImage.toJpeg(node, { quality: 0.95, filter: filter});
```
or

```js
htmlToImage.toPng(node, {filter:filter})
```

Not called on the root node.

### backgroundColor

A string value for the background color, any valid CSS color value.

### width, height

Width and height in pixels to be applied to node before rendering.

### canvasWidth, canvasHeight

Allows to scale the canva's size including the elements inside to a given width and height (in pixels).

### style

An object whose properties to be copied to node's style before rendering. You might want to check [this reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Properties_Reference) for JavaScript names of CSS properties.

### quality

A number between `0` and `1` indicating image quality (e.g. `0.92` => `92%`) of the JPEG image.

Defaults to `1.0` (`100%`)

### cacheBust

Set to true to append the current time as a query string to URL requests to enable cache busting.

Defaults to `false`

### includeQueryParams

Full URLs, including query parameters, identify resources by default. Set
`false` only to opt into the legacy behavior that treats query variants as the
same resource within one capture.

### imagePlaceholder

A data URL for a placeholder image that will be used when fetching an image fails.

Defaults to an empty string and will render empty areas for failed images.

### pixelRatio

The pixel ratio of the captured image. Default use the actual pixel ratio of the device. Set `1` to
use as initial-scale `1` for the image.

### stabilizationAttempts

Rasterize the frozen SVG this many times and use the last result. This can
help when Safari/WebKit produces a blank embedded image on an initial draw.
Set an integer from `1` to `10`; the default is `1`. It does not re-read the
source DOM. Extra attempts cost time and remain subject to `timeout`.

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
When supplied, `toBlob` returns a blob matching the given image type and quality.

Defaults to `image/png`

### includeStyleProperties

An array of style property names. Can be used to manually specify which style properties are included when cloning nodes. This can be useful for performance-critical scenarios.

## Browsers

Only standard lib is currently used, but make sure your browser supports:

- [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- SVG `<foreignObject>` tag

It's tested on latest Chrome, Firefox and Safari (49, 45 and 16 respectively at the time of writing), with Chrome performing significantly better on big DOM trees, possibly due to it's more performant SVG support, and the fact that it supports `CSSStyleDeclaration.cssText` property.

*Internet Explorer is not (and will not be) supported, as it does not support SVG `<foreignObject>` tag.*

## How it works

There might some day exist (or maybe already exists?) a simple and standard way of exporting parts of the HTML to image (and then this script can only serve as an evidence of all the hoops I had to jump through in order to get such obvious thing done) but I haven't found one so far.

This library uses a feature of SVG that allows having arbitrary HTML content inside of the `<foreignObject>` tag. So, in order to render that DOM node for you, following steps are taken:

1. Clone the original DOM node recursively
2. Compute the style for the node and each sub-node and copy it to corresponding clone 
   - and don't forget to recreate pseudo-elements, as they are not cloned in any way, of course
3. Embed web fonts
   - find all the `@font-face` declarations that might represent web fonts
   - parse file URLs, download corresponding files
   - base64-encode and inline content as dataURLs
   - concatenate all the processed CSS rules and put them into one `<style>` element, then attach it to the clone
4. Embed images
   - embed image URLs in `<img>` elements
   - inline images used in `background` CSS property, in a fashion similar to fonts
5. Serialize the cloned node to XML
6. Wrap XML into the `<foreignObject>` tag, then into the SVG, then make it a data URL
7. Optionally, to get PNG content or raw pixel data as a Uint8Array, create an Image element with the SVG as a source, and render it on an off-screen canvas, that you have also created, then read the content from the canvas
8. Done!


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
