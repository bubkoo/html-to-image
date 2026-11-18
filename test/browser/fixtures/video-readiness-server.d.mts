import type { IncomingMessage, ServerResponse } from 'node:http'
export function videoReadinessServer(
  request: IncomingMessage,
  response: ServerResponse,
): boolean
