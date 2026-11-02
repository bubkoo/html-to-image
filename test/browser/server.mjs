import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = process.cwd()
const host = process.env.HTML_TO_IMAGE_SMOKE_HOST || '127.0.0.1'
const reportDirectory = resolve(root, 'test-results/mobile-smoke-reports')
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
  if (pathname === '/test/browser/mobile-smoke-report') {
    if (
      request.method !== 'POST' ||
      request.socket.localPort !== 4173 ||
      request.headers.origin !== `http://${request.headers.host}` ||
      request.headers['content-type'] !== 'application/json'
    ) {
      response.writeHead(403).end()
      return
    }
    try {
      const chunks = []
      let size = 0
      // Node's request stream has no array method for bounded consumption.
      // eslint-disable-next-line no-restricted-syntax
      for await (const chunk of request) {
        size += chunk.length
        if (size > 32768) {
          response.writeHead(413).end()
          return
        }
        chunks.push(chunk)
      }
      const report = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (
        report.complete !== true ||
        typeof report.userAgent !== 'string' ||
        report.userAgent.length > 500 ||
        typeof report.dpr !== 'number' ||
        !Number.isFinite(report.dpr) ||
        !Array.isArray(report.verdicts) ||
        report.verdicts.length > 32 ||
        !report.verdicts.every(
          (line) => typeof line === 'string' && line.length <= 500,
        )
      ) {
        response.writeHead(400).end()
        return
      }
      const id = randomUUID()
      const saved = {
        id,
        receivedAt: new Date().toISOString(),
        remoteAddress: request.socket.remoteAddress,
        gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root })
          .toString()
          .trim(),
        complete: report.complete,
        userAgent: report.userAgent,
        dpr: report.dpr,
        viewport: report.viewport,
        verdicts: report.verdicts,
      }
      await mkdir(reportDirectory, { recursive: true })
      await writeFile(
        resolve(reportDirectory, `${id}.json`),
        `${JSON.stringify(saved, null, 2)}\n`,
      )
      response.writeHead(201, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ id, gitHead: saved.gitHead }))
      process.stdout.write(`Mobile smoke report saved: ${id}\n`)
    } catch (error) {
      process.stderr.write(`Mobile smoke report failed: ${error.message}\n`)
      response.writeHead(400).end()
    }
    return
  }
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
