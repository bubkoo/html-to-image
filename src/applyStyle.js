export default function applyStyle(cloned, options) {
  const { style } = cloned

  if (options.backgroundColor) {
    style.backgroundColor = options.backgroundColor
  }

  if (options.width) {
    style.width = `${options.width}px`
  }

  if (options.height) {
    style.height = `${options.height}px`
  }

  if (options.style) {
    Object.assign(style, options.style)
  }

  return cloned
}
