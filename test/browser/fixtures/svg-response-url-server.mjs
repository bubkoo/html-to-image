export function svgResponseURLServer(request, response) {
  const url = new URL(request.url || '/', 'http://localhost')
  const prefix = '/test/browser/svg-response-url/'
  if (!url.pathname.startsWith(prefix)) return false
  const [id, ...parts] = url.pathname.slice(prefix.length).split('/')
  if (!/^[a-f0-9-]{36}$/.test(id || '')) {
    response.writeHead(400).end()
    return true
  }
  const path = parts.join('/')
  if (path === 'chain.svg' || path === 'entry.svg') {
    const target = path === 'chain.svg' ? 'entry.svg' : 'assets/sprite.svg'
    response.writeHead(302, { Location: target + url.search }).end()
    return true
  }
  if (!['assets/sprite.svg', 'sprite.svg'].includes(path)) {
    response.writeHead(404).end()
    return true
  }
  const color = path === 'assets/sprite.svg' ? 'green' : 'red'
  response.writeHead(200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'no-store',
  })
  response.end(
    `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="paint"><stop stop-color="${color}"/></linearGradient></defs><style>.paint{fill:url(sprite.svg#paint) purple}</style><symbol id="icon" viewBox="0 0 20 20"><rect class="paint" width="20" height="20" fill="purple"/></symbol></svg>`,
  )
  return true
}
