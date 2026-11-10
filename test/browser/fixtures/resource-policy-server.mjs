import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

export function resourcePolicyServer(root) {
  const sessions = new Map()
  const prefix = '/test/browser/resource-policy/'
  return async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (!url.pathname.startsWith(prefix)) return false
    const [id, action] = url.pathname.slice(prefix.length).split('/')
    if (!/^[a-f0-9-]{36}$/.test(id || '')) {
      response.writeHead(400).end()
      return true
    }
    const cookiePath = `${prefix}${id}/`
    const sameOriginPost =
      request.method === 'POST' &&
      request.headers.origin === `http://${request.headers.host}`
    if (['setup', 'state', 'cleanup'].includes(action) && !sameOriginPost) {
      response.writeHead(403).end()
      return true
    }
    if (action === 'setup') {
      if (sessions.size >= 100) sessions.delete(sessions.keys().next().value)
      sessions.set(id, {
        color: 'red',
        cacheable: url.searchParams.get('cache') === '1',
        requests: [],
      })
      response
        .writeHead(200, {
          'Set-Cookie': `hti_policy=${id}; Path=${cookiePath}; HttpOnly; SameSite=Lax`,
          'Cache-Control': 'no-store',
        })
        .end()
      return true
    }
    const session = sessions.get(id)
    if (!session) {
      response.writeHead(404).end()
      return true
    }
    if (action === 'cleanup') {
      sessions.delete(id)
      response
        .writeHead(200, {
          'Set-Cookie': `hti_policy=; Path=${cookiePath}; Max-Age=0; HttpOnly; SameSite=Lax`,
          'Cache-Control': 'no-store',
        })
        .end()
      return true
    }
    if (action === 'state') {
      const color = url.searchParams.get('color')
      if (!['red', 'blue', 'green'].includes(color))
        response.writeHead(400).end()
      else {
        session.color = color
        response.writeHead(200).end()
      }
      return true
    }
    if (action === 'stats') {
      response.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
      response.end(JSON.stringify(session.requests))
      return true
    }
    if (!['image', 'public-image', 'font'].includes(action)) {
      response.writeHead(404).end()
      return true
    }
    const credential = (request.headers.cookie || '')
      .split(';')
      .some((value) => value.trim() === `hti_policy=${id}`)
    session.requests.push({
      action,
      method: request.method,
      marker: request.headers['x-html-to-image-test'] || '',
      credential,
      cacheControl: request.headers['cache-control'] || '',
      ifNoneMatch: request.headers['if-none-match'] || '',
    })
    if (action !== 'image') {
      response.setHeader('Access-Control-Allow-Origin', '*')
      response.setHeader('Access-Control-Allow-Headers', 'X-HTML-To-Image-Test')
      response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end()
      return true
    }
    if (action === 'image' && !credential) {
      response.writeHead(401, { 'Cache-Control': 'no-store' }).end()
      return true
    }
    if (action === 'font') {
      response.writeHead(200, {
        'Content-Type': 'font/ttf',
        'Cache-Control': 'no-store',
      })
      response.end(
        await readFile(
          resolvePath(root, 'test/browser/fixtures/font-metrics.ttf'),
        ),
      )
      return true
    }
    // Keep requests pending long enough to expose duplicate concurrent loads.
    await new Promise((resolve) => {
      setTimeout(resolve, 30)
    })
    const color = action === 'image' ? session.color : 'green'
    const etag = `"${color}"`
    const headers = {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': session.cacheable ? 'private, max-age=3600' : 'no-store',
      ETag: etag,
    }
    if (session.cacheable && request.headers['if-none-match'] === etag)
      response.writeHead(304, headers).end()
    else {
      response.writeHead(200, headers)
      response.end(
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="${color}"/></svg>`,
      )
    }
    return true
  }
}
