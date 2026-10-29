import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const cjs = require('html-to-image')
const esm = await import('html-to-image')
const umd = require('../dist/html-to-image.js')

for (const [name, entry] of Object.entries({ cjs, esm, umd })) {
  for (const exportName of ['toPng', 'toSvg', 'toBlob', 'createRenderer']) {
    assert.equal(
      typeof entry[exportName],
      'function',
      `${name} is missing ${exportName}`,
    )
  }
}

assert.notEqual(esm.toPng, cjs.toPng, 'ESM resolved to the CJS entry')

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed:\n${result.stderr}\n${result.stdout}`,
  )
  return result.stdout
}

const workspace = process.cwd()
const isolated = await mkdtemp(join(tmpdir(), 'html-to-image-package-'))
try {
  const output = run(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', isolated],
    workspace,
  )
  const [{ filename, files }] = JSON.parse(output)
  const packed = new Set(files.map(({ path }) => path))
  for (const path of [
    'package.json',
    'es/package.json',
    'es/index.js',
    'lib/index.js',
    'lib/index.d.ts',
    'dist/html-to-image.js',
  ]) {
    assert.ok(packed.has(path), `Published package is missing ${path}`)
  }

  await writeFile(
    join(isolated, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  )
  run(
    'npm',
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      join(isolated, filename),
    ],
    isolated,
  )

  await writeFile(
    join(isolated, 'consumer.mjs'),
    `import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const esm = await import('html-to-image')
const cjs = require('html-to-image')
const umd = require('html-to-image/dist/html-to-image.js')
for (const [name, entry] of Object.entries({ esm, cjs, umd })) {
  for (const exportName of ['toPng', 'toSvg', 'toBlob', 'createRenderer']) {
    assert.equal(typeof entry[exportName], 'function', name + ' is missing ' + exportName)
  }
}
assert.notEqual(esm.toPng, cjs.toPng, 'installed ESM resolved to CJS')
`,
  )
  run(process.execPath, ['consumer.mjs'], isolated)

  await writeFile(
    join(isolated, 'consumer.mts'),
    await readFile(join(workspace, 'test/package-smoke.mts')),
  )
  run(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '--noEmit',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--target',
      'es2017',
      '--skipLibCheck',
      'consumer.mts',
    ],
    isolated,
  )

  console.log('Package smoke passed: installed tarball ESM, CJS, UMD, types')
} finally {
  await rm(isolated, { recursive: true, force: true })
}
