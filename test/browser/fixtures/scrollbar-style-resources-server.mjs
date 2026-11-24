import { createServer } from 'node:http'

const prefix = '/test/browser/scrollbar-style-resources/'
const modes = new Set([
  'cors-opaque',
  'cors-readable',
  'readable-mutation',
  'resolver-opaque',
  'deny-diagnostic',
  'resolver-reject',
  'cancel-pending',
  'cancel-decode',
  'shared-url',
  'inactive-import',
  'cyclic-import',
  'unrelated-relative',
  'media-page-viewport',
  'nesting-relative',
  'stable-no-overflow',
  'x-overflow-only',
  'y-overflow-only',
  'encoding-parent-header-1252',
  'encoding-parent-charset-1252',
  'encoding-readable-chain',
  'encoding-child-header-1252',
  'encoding-child-charset-1252',
  'encoding-child-utf8-override',
  'encoding-child-bom-override',
  'encoding-parent-utf8-negative',
  'declarations-direct-tail',
  'declarations-active-media',
  'declarations-active-supports',
  'declarations-nested-tail',
  'declarations-ordinary-tail',
  'declarations-inactive-tail',
  'warning-callback',
])
const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'

export function scrollbarStyleResourcesServer() {
  const sessions = new Map()
  let origin
  let started
  let remote

  const asset = (session, path) => {
    if (session.mode.startsWith('encoding-')) {
      const mode = session.mode.slice('encoding-'.length)
      const parent1252 = [
        'parent-header-1252',
        'readable-chain',
        'child-utf8-override',
        'child-bom-override',
      ].includes(mode)
      if (path === 'parent.css')
        return {
          type: parent1252
            ? 'text/css; charset=windows-1252'
            : mode === 'parent-charset-1252'
              ? 'text/css'
              : 'text/css; charset=utf-8',
          body: Buffer.from(
            (mode === 'parent-charset-1252' ? '@charset "windows-1252";' : '') +
              `@import url("${mode === 'readable-chain' ? './readable-child.css' : session.remotePrefix + 'assets/encoded-child.css'}");` +
              '.metadata-parent{color:green}',
            'latin1',
          ),
        }
      if (path === 'readable-child.css')
        return {
          type: 'text/css',
          body: `@import url("${session.remotePrefix}assets/encoded-child.css");.metadata-child{color:green}`,
        }
      if (path === 'assets/encoded-child.css') {
        const utf8 = ['child-utf8-override', 'child-bom-override'].includes(
          mode,
        )
        const declared = [
          'child-header-1252',
          'child-charset-1252',
          'child-utf8-override',
          'child-bom-override',
        ].includes(mode)
        const body = Buffer.from(
          (declared
            ? `@charset "${mode === 'child-header-1252' ? 'utf-8' : 'windows-1252'}";`
            : '') + '.café::-webkit-scrollbar-thumb{background:yellow}',
          utf8 ? 'utf8' : 'latin1',
        )
        return {
          type:
            mode === 'child-utf8-override'
              ? 'text/css; charset=utf-8'
              : ['child-header-1252', 'child-bom-override'].includes(mode)
                ? 'text/css; charset=windows-1252'
                : 'text/css',
          body:
            mode === 'child-bom-override'
              ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body])
              : body,
        }
      }
      return undefined
    }
    if (session.mode === 'warning-callback' && path === 'parent.css')
      return {
        type: 'text/css; charset=utf-8',
        body:
          `@import url("${session.remotePrefix}assets/missing.css");` +
          '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:blue}' +
          '.scrollbar-resource-panel::-webkit-scrollbar-thumb:horizontal{background:cyan}',
      }
    if (path === 'entry.css') return { redirect: 'assets/theme.css' }
    if (path === 'assets/theme.css') {
      if (session.mode.startsWith('declarations-')) {
        const rules = {
          'declarations-direct-tail':
            '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:black;@media(min-width:300px){background:blue}background:orange;background-image:url("./thumb.svg")}',
          'declarations-active-media':
            '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:black;@media(min-width:300px){background:yellow}}',
          'declarations-active-supports':
            '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:black;@supports(display:grid){background:yellow}}',
          'declarations-nested-tail':
            '.scrollbar-resource-panel{&::-webkit-scrollbar-thumb{background:black;@media(min-width:300px){background:blue}background:yellow}}',
          'declarations-ordinary-tail':
            '.scrollbar-resource-panel{&::-webkit-scrollbar-thumb{background:yellow}background:rgb(120,80,40);color:yellow}',
          'declarations-inactive-tail':
            '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:black;@media(max-width:0px){background:blue}background:yellow}',
        }
        return { type: 'text/css; charset=utf-8', body: rules[session.mode] }
      }
      if (session.mode === 'nesting-relative')
        return {
          type: 'text/css',
          body: '.scrollbar-resource-panel{&::-webkit-scrollbar-thumb:horizontal{background:orange!important;background-image:url("./thumb.svg")!important}}',
        }
      if (session.mode === 'unrelated-relative')
        return {
          type: 'text/css',
          body: '@layer resourceFirst,resourceSecond;.unrelated-node{background-image:url("./never.svg")}',
        }
      const media =
        session.mode === 'inactive-import' ? ' (max-width: 0px)' : ''
      return {
        type: 'text/css; charset=utf-8',
        body:
          '@layer resourceFirst,resourceSecond;' +
          `@import url("./child.css") layer(resourceFirst) supports(display:grid)${media};` +
          '@import url("./never.css") supports(display:no-such-value);' +
          '.scrollbar-resource-panel::-webkit-scrollbar-track{background:red;background-image:url("./stripe.svg")}' +
          '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:blue}' +
          '@layer resourceSecond{.scrollbar-resource-panel::-webkit-scrollbar-thumb:horizontal{background:cyan!important}}' +
          '@media (max-width:0px){.scrollbar-resource-panel::-webkit-scrollbar-thumb:vertical{background:magenta!important}}' +
          (session.mode === 'media-page-viewport'
            ? '@media (min-width:300px){.scrollbar-resource-panel::-webkit-scrollbar-thumb:vertical{background:lime!important}}'
            : ''),
      }
    }
    if (path === 'assets/child.css')
      return {
        type: 'text/css; charset=utf-8',
        body:
          (session.mode === 'cyclic-import'
            ? '@import url("./theme.css");'
            : '') +
          '.scrollbar-resource-panel::-webkit-scrollbar-thumb:horizontal{background:yellow!important}',
      }
    if (path === 'assets/never.css')
      return {
        type: 'text/css',
        body: '.scrollbar-resource-panel::-webkit-scrollbar-thumb{background:magenta!important}',
      }
    if (path === 'assets/thumb.svg')
      return {
        type: 'image/svg+xml',
        body: image.replace('fill="red"', 'fill="yellow"'),
      }
    if (path === 'assets/stripe.svg')
      return { type: 'image/svg+xml', body: image }
    return undefined
  }

  const route = (url) => {
    if (!url.pathname.startsWith(prefix)) return undefined
    const suffix = url.pathname.slice(prefix.length)
    const split = suffix.indexOf('/')
    if (split < 0) return undefined
    const id = suffix.slice(0, split)
    if (!/^[a-f0-9-]{36}$/.test(id)) return undefined
    return { id, path: suffix.slice(split + 1), session: sessions.get(id) }
  }

  const attach = (server) => {
    if (started) return
    remote = createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://localhost')
      const target = route(url)
      if (!target?.session) {
        response.writeHead(404).end()
        return
      }
      const { session, id, path } = target
      const headers = { 'Cache-Control': 'no-store' }
      if (
        ![
          'resolver-opaque',
          'deny-diagnostic',
          'resolver-reject',
          'cancel-pending',
          'cancel-decode',
        ].includes(session.mode)
      ) {
        headers['Access-Control-Allow-Origin'] = session.mainOrigin
        headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Access-Control-Allow-Headers'] = 'X-HTML-To-Image-Test'
        headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
      }
      session.requests.push({
        path,
        method: request.method,
        marker: request.headers['x-html-to-image-test'] || '',
        origin: request.headers.origin || '',
      })
      if (request.method === 'OPTIONS') {
        response.writeHead(204, headers).end()
        return
      }
      const value = asset(session, path)
      if (!value) response.writeHead(404, headers).end()
      else if (value.redirect) {
        response
          .writeHead(302, {
            ...headers,
            Location: `${prefix}${id}/${value.redirect}`,
          })
          .end()
      } else
        response
          .writeHead(200, { ...headers, 'Content-Type': value.type })
          .end(value.body)
    })
    started = new Promise((resolve, reject) => {
      remote.once('error', reject)
      remote.listen(0, '127.0.0.1', () => {
        origin = `http://127.0.0.1:${remote.address().port}`
        resolve()
      })
    })
    server.httpServer?.once('close', () => {
      sessions.clear()
      remote.close()
      remote.closeAllConnections()
    })
  }

  const handle = async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost')
    const target = route(url)
    if (!target) return false
    const { id, path } = target
    const mainOrigin = `http://${request.headers.host}`
    const sameOriginPost =
      request.method === 'POST' && request.headers.origin === mainOrigin
    if (['setup', 'read', 'cleanup'].includes(path) && !sameOriginPost) {
      response.writeHead(403).end()
      return true
    }
    await started
    if (path === 'setup') {
      const mode = url.searchParams.get('mode')
      if (!modes.has(mode)) response.writeHead(400).end()
      else {
        const session = {
          mode,
          mainOrigin,
          remotePrefix: `${origin}${prefix}${id}/`,
          requests: [],
        }
        sessions.set(id, session)
        response
          .writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          })
          .end(
            JSON.stringify({
              id,
              mode,
              prefix: `${prefix}${id}/`,
              remotePrefix: `${origin}${prefix}${id}/`,
              url:
                mode.startsWith('encoding-') || mode === 'warning-callback'
                  ? `${mainOrigin}${prefix}${id}/parent.css`
                  : `${origin}${prefix}${id}/entry.css`,
            }),
          )
      }
      return true
    }
    const session = sessions.get(id)
    if (!session) {
      response.writeHead(404).end()
      return true
    }
    if (['parent.css', 'readable-child.css'].includes(path)) {
      session.requests.push({
        path,
        method: request.method,
        marker: request.headers['x-html-to-image-test'] || '',
        origin: request.headers.origin || '',
      })
      const value = asset(session, path)
      if (!value) response.writeHead(404).end()
      else
        response
          .writeHead(200, {
            'Content-Type': value.type,
            'Cache-Control': 'no-store',
          })
          .end(value.body)
    } else if (path === 'cleanup') {
      sessions.delete(id)
      response.writeHead(200).end()
    } else if (path === 'stats')
      response
        .writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        })
        .end(JSON.stringify(session.requests))
    else if (path === 'read') {
      const body = await new Promise((resolve, reject) => {
        const chunks = []
        request.on('data', (chunk) => chunks.push(chunk))
        request.on('error', reject)
        request.on('end', () => resolve(Buffer.concat(chunks)))
      })
      let requested
      try {
        requested = new URL(JSON.parse(body).url)
      } catch {
        response.writeHead(400).end()
        return true
      }
      const wanted = route(requested)
      if (requested.origin !== origin || wanted?.id !== id) {
        response.writeHead(400).end()
        return true
      }
      let file = wanted.path
      let value = asset(session, file)
      if (value?.redirect) {
        file = value.redirect
        value = asset(session, file)
      }
      if (!value || !value.body) response.writeHead(404).end()
      else {
        const base = `${origin}${prefix}${id}/${file}`
        // Controlled fixture CSS only: a Blob resolver keeps its requested base,
        // so the fixture supplies absolute URLs for the known redirected bytes.
        const body = value.type.startsWith('text/css')
          ? value.body.replace(
              /url\("([^"]+)"\)/g,
              (_, path) => `url("${new URL(path, base).href}")`,
            )
          : value.body
        response
          .writeHead(200, {
            'Content-Type': value.type,
            'Cache-Control': 'no-store',
          })
          .end(body)
      }
    } else response.writeHead(404).end()
    return true
  }
  return { attach, handle }
}
