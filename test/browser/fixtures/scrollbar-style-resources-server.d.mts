import type { IncomingMessage, ServerResponse } from 'node:http'

export function scrollbarStyleResourcesServer(): {
  attach(server: {
    httpServer: { once(event: 'close', listener: () => void): unknown } | null
  }): void
  handle(request: IncomingMessage, response: ServerResponse): Promise<boolean>
}
