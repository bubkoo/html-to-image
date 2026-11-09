// Each browser and encoding run is sequential to keep the timing comparable.
/* eslint-disable no-await-in-loop */
import { resolve } from 'node:path'
import { chromium, firefox, webkit } from 'playwright'

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage()
    await page.goto('about:blank')
    await page.addScriptTag({ path: resolve('dist/html-to-image.js') })
    const result = await page.evaluate(async () => {
      const root = document.createElement('div')
      root.style.cssText = 'width:20px;--fill:rgb(0,128,0)'
      for (let i = 0; i < 2000; i += 1) {
        const child = document.createElement('div')
        child.style.cssText = 'width:20px;height:2px;background:var(--fill)'
        root.append(child)
      }
      document.body.append(root)
      const marks = []
      const start = performance.now()
      const url = await window.htmlToImage.toSvg(root, {
        skipFonts: true,
        pixelRatio: 1,
        onEvent: (event) => {
          if (event.type === 'stage')
            marks.push([event.stage, Math.round(performance.now() - start)])
        },
      })
      const captureMs = Math.round(performance.now() - start)
      const xml = await fetch(url).then((response) => response.text())
      const samples = []
      for (const [label, makeUrl] of [
        [
          'percent',
          async () =>
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`,
        ],
        [
          'base64',
          async () =>
            new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.onerror = () => reject(reader.error)
              reader.readAsDataURL(
                new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }),
              )
            }),
        ],
      ]) {
        const timings = []
        let generated
        for (let i = 0; i < 3; i += 1) {
          const t = performance.now()
          generated = await makeUrl()
          timings.push(Math.round(performance.now() - t))
        }
        const decoded = await fetch(generated).then((response) =>
          response.text(),
        )
        if (decoded !== xml) throw new Error(`${label} round trip mismatch`)
        const t = performance.now()
        const image = new Image()
        image.src = generated
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 20
        canvas.height = 4000
        canvas.getContext('2d').drawImage(image, 0, 0)
        const pixel = Array.from(
          canvas.getContext('2d').getImageData(10, 10, 1, 1).data,
        )
        samples.push({
          label,
          lengths: generated.length,
          timings,
          renderMs: Math.round(performance.now() - t),
          pixel,
        })
      }
      root.remove()
      return { xmlLength: xml.length, captureMs, marks, samples }
    })
    console.log(JSON.stringify({ engine: name, ...result }))
  } finally {
    await browser.close()
  }
}
