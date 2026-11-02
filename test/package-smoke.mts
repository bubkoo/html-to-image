import {
  createRenderer,
  toPng,
  toPixelData,
  type CapturePlugin,
} from 'html-to-image'

const plugin: CapturePlugin = {
  name: 'typed-plugin',
  resolveResource: ({ kind }, { signal }) => {
    const resourceKind: 'image' | 'font' | 'stylesheet' = kind
    if (signal.aborted || resourceKind !== 'image') return undefined
    return new Blob()
  },
}

const renderer = createRenderer({
  plugins: [plugin],
  pixelRatio: 1,
  onCloneNode: (original, copy) => {
    if (original.tagName === 'DIV') copy.setAttribute('data-copied', 'yes')
  },
  stylePropertiesForNode: (original) =>
    original.tagName === 'DIV' ? ['color'] : undefined,
})
const node = document.createElement('div')
void toPng(node)
void toPixelData(node).then((pixels: Uint8ClampedArray) => pixels.slice(0, 4))
void renderer.capture(node).then(async (capture) => {
  const image = await capture.toImageData()
  image.data[0] = 255
  capture.dispose()
})
