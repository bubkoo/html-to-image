import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const [archivePath, indexPath, summaryPath] = process.argv.slice(2)
assert.ok(archivePath && indexPath && summaryPath, 'Usage: node verify.mjs RAW.tar.gz INDEX.json SUMMARY.json')
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const archive = await readFile(archivePath)
const index = JSON.parse(await readFile(indexPath, 'utf8'))
const summary = JSON.parse(await readFile(summaryPath, 'utf8'))
assert.equal(archive.length, index.archive.bytes)
assert.equal(digest(archive), index.archive.sha256)
assert.deepEqual(summary.rawArchive, index.archive)
const raw = gunzipSync(archive), files = new Map()
const value = buffer => buffer.toString('utf8').split('\0')[0]
for (let offset = 0; offset + 512 <= raw.length;) {
  const header = raw.subarray(offset, offset + 512)
  if (header.every(byte => byte === 0)) break
  const name = [value(header.subarray(345, 500)), value(header.subarray(0, 100))].filter(Boolean).join('/')
  assert.ok(name && !name.startsWith('/') && !name.includes('\\') && !name.split('/').includes('..') && !files.has(name))
  assert.ok(header[156] === 0 || header[156] === 48, 'Regular files only')
  const size = Number.parseInt(value(header.subarray(124, 136)), 8)
  const expectedChecksum = Number.parseInt(value(header.subarray(148, 156)), 8)
  const actualChecksum = [...header].reduce((sum, byte, i) => sum + (i >= 148 && i < 156 ? 32 : byte), 0)
  assert.equal(actualChecksum, expectedChecksum)
  assert.ok(Number.isSafeInteger(size) && size >= 0 && offset + 512 + size <= raw.length)
  files.set(name, raw.subarray(offset + 512, offset + 512 + size))
  offset += 512 + Math.ceil(size / 512) * 512
}
assert.equal(files.size, index.memberCount)
assert.deepEqual([...files.keys()].sort(), index.members.map(file => file.path).sort())
for (const member of index.members) {
  const bytes = files.get(member.path)
  assert.equal(bytes.length, member.bytes)
  assert.equal(digest(bytes), member.sha256)
}
assert.equal(digest(files.get('candidate/pr-label-patch-size.yml')), summary.patch.workflowSHA256)
assert.deepEqual(files.get('verify-archive.mjs'), await readFile(new URL(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'pr-size-evidence-'))
try {
  for (const [name, bytes] of files) {
    const path = resolve(temporary, name)
    assert.ok(path.startsWith(temporary + '/'))
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
  }
  const result = JSON.parse(execFileSync(process.execPath, [join(temporary, 'candidate/check-pr-size-workflow.mjs'), join(temporary, 'candidate/pr-label-patch-size.yml'), join(temporary, 'raw')], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }))
  assert.equal(result.cases, 47)
  assert.equal(result.allPassed, true)
  assert.equal(result.githubWrites, 0)
  assert.equal(result.workflowSHA256, summary.patch.workflowSHA256)
  assert.equal(summary.deployedToMaster, false)
  assert.equal(summary.newRemoteWorkflowExecuted, false)
  console.log(JSON.stringify({ verified: true, archiveMembers: files.size, archiveBytes: archive.length, archiveSHA256: digest(archive), exactWorkflowCasesPassed: 47, githubWrites: 0, temporaryTreeCleanedInFinally: true }, null, 2))
} finally {
  await rm(temporary, { recursive: true, force: true })
}
