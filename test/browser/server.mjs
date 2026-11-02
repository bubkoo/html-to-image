import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = process.cwd()
const host = process.env.HTML_TO_IMAGE_SMOKE_HOST || '127.0.0.1'
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const serve = async (request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url || '/', 'http://127.0.0.1').pathname,
  )
  if (pathname === '/test/browser/duplicate-content-type') {
    response.writeHead(200, [
      'Content-Type',
      'image/svg+xml',
      'Content-Type',
      'image/svg+xml',
      'Cache-Control',
      'no-store',
    ])
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>',
    )
    return
  }
  if (
    !['/es/', '/dist/', '/test/browser/'].some((prefix) =>
      pathname.startsWith(prefix),
    )
  ) {
    response.writeHead(403).end()
    return
  }
  const path = resolve(root, `.${pathname}`)
  if (!path.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(path)
    response.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
}

createServer(serve).listen(4173, host)
// A distinct origin lets the package suite exercise browser CORS behavior.
createServer(serve).listen(4174, host)
