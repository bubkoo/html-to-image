import type { IncomingMessage, ServerResponse } from 'node:http'
export function svgResponseURLServer(
  request: IncomingMessage,
  response: ServerResponse,
): boolean
