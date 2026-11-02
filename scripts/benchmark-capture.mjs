import { resolve } from 'node:path'
import { chromium, firefox, webkit } from 'playwright'

const baseline = process.argv[2]
if (!baseline) {
  throw new Error('Pass the extracted 1.11.13 dist/html-to-image.js path')
}

const candidates = [
  ['npm-1.11.13', resolve(baseline)],
  ['v2', resolve('dist/html-to-image.js')],
]

async function measure(engine, script) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage()
    await page.goto('about:blank')
    await page.addScriptTag({ path: script })
    const result = await page.evaluate(async () => {
      const root = document.createElement('div')
      root.style.cssText = 'width:40px;margin:0;padding:0'
      for (let i = 0; i < 400; i += 1) {
        const child = document.createElement('div')
        child.style.cssText =
          'width:40px;height:20px;background:rgb(0,128,0);margin:0;padding:0'
        root.append(child)
      }
      document.body.append(root)
      const times = []
      const stages = []
      for (let i = 0; i < 4; i += 1) {
        const start = performance.now()
        const marks = []
        const png = await window.htmlToImage.toPng(root, {
          skipFonts: true,
          pixelRatio: 1,
          onEvent: (event) => {
            if (event.type === 'stage') {
              marks.push([event.stage, Math.round(performance.now() - start)])
            }
          },
        })
        times.push(Math.round(performance.now() - start))
        stages.push(marks)
        if (!png.startsWith('data:image/png;base64,')) {
          throw new Error('Invalid PNG data URL')
        }
        const image = new Image()
        image.src = png
        await image.decode()
        if (image.naturalWidth !== 40 || image.naturalHeight !== 8000) {
          throw new Error(
            `Wrong PNG dimensions ${image.naturalWidth}x${image.naturalHeight}`,
          )
        }
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        const color = Array.from(context.getImageData(0, 0, 1, 1).data)
        if (color.join(',') !== '0,128,0,255') {
          throw new Error(`Wrong PNG pixel ${color}`)
        }
      }
      return {
        times,
        medianMs: times.slice(1).sort((a, b) => a - b)[1],
        stages: stages[3],
      }
    })
    if (engine === chromium) {
      const session = await page.context().newCDPSession(page)
      await session.send('HeapProfiler.collectGarbage')
      const before = (await session.send('Runtime.getHeapUsage')).usedSize
      await page.evaluate(async (runs) => {
        const root = document.body.firstElementChild
        for (let i = 0; i < runs; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await window.htmlToImage.toPng(root, {
            skipFonts: true,
            pixelRatio: 1,
          })
        }
      }, Number(process.env.HTML_TO_IMAGE_HEAP_RUNS || 20))
      await session.send('HeapProfiler.collectGarbage')
      const after = (await session.send('Runtime.getHeapUsage')).usedSize
      result.heapDeltaBytes = after - before
      await session.detach()
    }
    await page.close()
    return result
  } finally {
    await browser.close()
  }
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const results = {}
  for (const [label, script] of candidates) {
    // Runs are sequential so both versions get the same browser and machine.
    // eslint-disable-next-line no-await-in-loop
    results[label] = await measure(engine, script)
  }
  console.log(
    JSON.stringify({
      engine: name,
      ...results,
      medianRatio: Number(
        (results.v2.medianMs / results['npm-1.11.13'].medianMs).toFixed(2),
      ),
    }),
  )
}
