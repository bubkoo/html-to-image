/**
 * Select the runner's actual iframe without the provider's unfiltered fallback.
 * @param {import('playwright').Page} page
 * @returns {Promise<import('playwright').Frame>}
 */
export async function getGCRunnerFrame(page) {
  const element = await page.waitForSelector('iframe[data-vitest="true"]', {
    state: 'attached',
    timeout: 1000,
  })
  if (!element) throw new Error('Vitest runner iframe was not found')
  try {
    const frame = await element.contentFrame()
    if (!frame) throw new Error('Vitest runner iframe has no attached frame')
    return frame
  } finally {
    await element.dispose()
  }
}
