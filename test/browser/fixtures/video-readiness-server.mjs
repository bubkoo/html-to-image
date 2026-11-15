export function videoReadinessServer(request, response) {
  const path = new URL(request.url || '/', 'http://localhost').pathname
  if (path !== '/test/browser/fixtures/video-pending.mp4') return false
  // Select a real HTTP media resource without supplying a decodable frame.
  // The fixture removes src and calls load() to abort this request on cleanup.
  response.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-store',
  })
  response.flushHeaders()
  return true
}
