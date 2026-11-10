export async function checkCaptureLifetime({ createRenderer }) {
  const frame = document.createElement('iframe')
  frame.srcdoc =
    '<body style="margin:0;width:20px;height:20px;background:green"></body>'
  const loaded = new Promise((resolve) => {
    frame.onload = resolve
  })
  document.body.append(frame)
  const renderer = createRenderer({ pixelRatio: 1, skipFonts: true })
  try {
    await loaded
    const capture = await renderer.capture(frame.contentDocument.body)
    frame.remove()
    const first = await capture.toCanvas()
    if (first.ownerDocument !== document)
      throw new Error('Canvas still belongs to the removed source document')
    if (first.width !== 20 || first.height !== 20)
      throw new Error(`Canvas dimensions ${first.width}x${first.height}`)
    first.getContext('2d').clearRect(0, 0, 20, 20)
    const second = await capture.toCanvas()
    const color = Array.from(
      second.getContext('2d').getImageData(10, 10, 1, 1).data,
    )
    if (second.ownerDocument !== document || color.join(',') !== '0,128,0,255')
      throw new Error(`Independent canvas document/pixel mismatch: ${color}`)
    capture.dispose()
    let rejected = false
    try {
      await capture.toSvg()
    } catch (error) {
      rejected = /disposed/.test(error.message)
    }
    if (!rejected) throw new Error('Disposed capture remained usable')
  } finally {
    frame.remove()
    renderer.dispose()
  }
}
