// Temporary investigation helper: preserve Vitest's sorting inputs, not bundles.
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'

const root = resolve('node_modules/.vite/vitest')
const snapshots = resolve('.vitest/attachments/gc-order-cache')
const manifestPath = resolve(snapshots, 'manifest.json')
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function resultFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return resultFiles(path)
      return entry.isFile() && entry.name === 'results.json' ? [path] : []
    }),
  )
  return nested.flat().sort()
}

const [action, phase] = process.argv.slice(2)
if (action === 'save') {
  const paths = await resultFiles(root)
  if (!paths.length) throw new Error('Vitest sorting cache was not found')
  const files = await Promise.all(
    paths.map(async (path) => {
      const bytes = await readFile(path)
      const name = relative(root, path)
      const target = resolve(snapshots, 'initial', name)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes)
      return { path: name, bytes: bytes.length, sha256: digest(bytes) }
    }),
  )
  await writeFile(manifestPath, JSON.stringify({ files }, null, 2) + '\n')
  console.log(JSON.stringify({ action, files }))
} else if (action === 'restore' && phase && /^[a-z0-9-]+$/.test(phase)) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const current = (await resultFiles(root)).map((path) => relative(root, path))
  const expected = manifest.files.map((file) => file.path).sort()
  if (JSON.stringify(current) !== JSON.stringify(expected))
    throw new Error('Vitest sorting cache file set changed')
  await Promise.all(
    manifest.files.map(async (file) => {
      const path = resolve(root, file.path)
      if (!path.startsWith(root + sep) || !path.endsWith(sep + 'results.json'))
        throw new Error('Invalid Vitest sorting cache path')
      const bytes = await readFile(resolve(snapshots, 'initial', file.path))
      if (digest(bytes) !== file.sha256 || bytes.length !== file.bytes)
        throw new Error('Vitest sorting snapshot changed')
      await writeFile(path, bytes)
      if (digest(await readFile(path)) !== file.sha256)
        throw new Error('Vitest sorting cache restore failed')
    }),
  )
  const receipt = { action, phase, files: manifest.files }
  await writeFile(
    resolve(snapshots, phase + '-restored.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  )
  console.log(JSON.stringify(receipt))
} else {
  throw new Error(
    'Use save or restore <phase> for the diagnostic sorting cache',
  )
}
