/* Sequential GC and inspection are part of the control protocol. */
/* eslint-disable no-await-in-loop */
const { firefox } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const folder = '.vitest/attachments/gc-reference-probe/controls'
fs.mkdirSync(folder, { recursive: true })
;(async () => {
  const browser = await firefox.launch()
  try {
    const page = await browser.newPage()
    await page.evaluate(() => {
      const held = document.implementation.createHTMLDocument()
      const negative = document.implementation.createHTMLDocument()
      globalThis.__codexKnownOwner = { knownOwnedDocument: held }
      globalThis.__codexPositiveRef = new WeakRef(held)
      globalThis.__codexNegativeRef = new WeakRef(negative)
    })
    for (let i = 0; i < 3; i++) {
      await page.requestGC()
      await page.evaluate(() => undefined)
    }
    const primary = await page.evaluate(() => ({
      positiveHeld: globalThis.__codexPositiveRef.deref() !== undefined,
      negativeCollected: globalThis.__codexNegativeRef.deref() === undefined,
    }))
    fs.writeFileSync(
      path.join(folder, 'primary.json'),
      JSON.stringify(primary, null, 2),
    )
    if (!primary.positiveHeld || !primary.negativeCollected)
      throw Error('Control primary invalid: ' + JSON.stringify(primary))
    for (const [label, key] of [
      ['positive', '__codexPositiveRef'],
      ['negative', '__codexNegativeRef'],
    ]) {
      const handle = await page.evaluateHandle(
        (key) => ({ __codexHeap: true, reference: globalThis[key] }),
        key,
      )
      try {
        const props = await handle.getProperties()
        const graph = JSON.parse(
          await props.get('__codex_heap_paths').jsonValue(),
        )
        fs.writeFileSync(
          path.join(folder, label + '.json'),
          JSON.stringify({ primary, ...graph }, null, 2),
        )
        if (graph.file)
          fs.copyFileSync(graph.file, path.join(folder, label + '.fxsnapshot'))
        if (graph.cc?.file)
          fs.copyFileSync(graph.cc.file, path.join(folder, label + '.cc.log'))
        if (graph.cc?.gcFile)
          fs.copyFileSync(graph.cc.gcFile, path.join(folder, label + '.gc.log'))
        if (
          graph.opened?.length !== 1 ||
          graph.opened[0].before !== false ||
          graph.opened[0].after !== true ||
          graph.closed?.length !== 1 ||
          graph.closed[0].before !== true ||
          graph.closed[0].after !== false
        )
          throw Error('DevTools registration was not balanced')
        if (
          label === 'positive' &&
          (!graph.ids.target ||
            graph.errors.length ||
            graph.cc?.wantAllTraces !== false)
        )
          throw Error('Held identity control failed')
        if (
          label === 'positive' &&
          (!graph.cc?.gcFile ||
            !fs
              .readFileSync(graph.cc.gcFile, 'utf8')
              .includes('knownOwnedDocument'))
        )
          throw Error('Known owner member missing from raw GC control graph')
        if (
          label === 'negative' &&
          (graph.ids.target || graph.observedDirectTargets !== 0)
        )
          throw Error(
            'Collected reference unexpectedly has a direct document target',
          )
        console.log(
          JSON.stringify({
            label,
            primary,
            targetPresent: !!graph.ids.target,
            errors: graph.errors,
            targetState: graph.targetState,
          }),
        )
      } finally {
        await handle.dispose()
      }
    }
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
