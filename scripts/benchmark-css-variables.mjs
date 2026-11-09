import { resolve } from 'node:path'
import { chromium, firefox, webkit } from 'playwright'

const bundle = resolve(process.argv[2] || 'dist/html-to-image.js')

async function measure(engine) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage()
    await page.goto('about:blank')
    await page.addScriptTag({ path: bundle })
    return await page.evaluate(async () => {
      const samples = []
      for (const variableCount of [0, 100]) {
        const root = document.createElement('div')
        root.style.cssText = 'width:20px'
        for (let i = 0; i < variableCount; i += 1) {
          root.style.setProperty(`--prop-${i}`, `${i}px`)
        }
        for (let i = 0; i < 100; i += 1) {
          const child = document.createElement('div')
          child.style.cssText = 'width:20px;height:2px;background:red'
          root.append(child)
        }
        document.body.append(root)
        try {
          const times = []
          let xml = ''
          for (let i = 0; i < 3; i += 1) {
            const start = performance.now()
            // Measure captures sequentially on the same page.
            // eslint-disable-next-line no-await-in-loop
            const url = await window.htmlToImage.toSvg(root, {
              skipFonts: true,
            })
            times.push(Math.round(performance.now() - start))
            // eslint-disable-next-line no-await-in-loop
            xml = await fetch(url).then((response) => response.text())
          }
          const parsed = new DOMParser().parseFromString(xml, 'image/svg+xml')
          if (parsed.querySelector('parsererror')) {
            throw new Error('The exported SVG is invalid XML')
          }
          samples.push({
            variableCount,
            times,
            characters: xml.length,
            prop0Copies: (xml.match(/--prop-0:/g) || []).length,
          })
        } finally {
          root.remove()
        }
      }
      return samples
    })
  } finally {
    await browser.close()
  }
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  // eslint-disable-next-line no-await-in-loop
  console.log(JSON.stringify({ engine: name, samples: await measure(engine) }))
}
