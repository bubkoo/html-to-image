import type { IncomingMessage, ServerResponse } from 'node:http'

export function resourcePolicyServer(
  root: string,
): (request: IncomingMessage, response: ServerResponse) => Promise<boolean>
