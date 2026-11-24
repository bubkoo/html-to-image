import type { Frame, Page } from 'playwright'

export function getGCRunnerFrame(page: Page): Promise<Frame>
