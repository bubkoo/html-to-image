import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(
  new URL('../.github/workflows/pr-label-patch-size.yml', import.meta.url),
  'utf8',
)
const marker = '          script: |\n'
assert.equal(workflow.split(marker).length, 2)
const source = workflow.split(marker)[1].replace(/^ {12}/gm, '')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const run = new AsyncFunction('github', 'context', 'core', source)
const context = {
  repo: { owner: 'base-owner', repo: 'project' },
  payload: { pull_request: { number: 17, labels: [{ name: 'size/XS' }] } },
}

async function check(files, labels, reportedFiles = files.length) {
  const mutations = []
  const outputs = {}
  const listFiles = () => assert.fail('File listing must use pagination')
  const github = {
    rest: {
      pulls: {
        get: async (params) => {
          assert.deepEqual(params, { ...context.repo, pull_number: 17 })
          return {
            data: {
              changed_files: reportedFiles,
              labels: labels.map((name) => ({ name })),
            },
          }
        },
        listFiles,
      },
      issues: {
        addLabels: async (params) => mutations.push(['add', params]),
        removeLabel: async (params) => mutations.push(['remove', params]),
      },
    },
    paginate: async (endpoint, params) => {
      assert.equal(endpoint, listFiles)
      assert.deepEqual(params, {
        ...context.repo,
        pull_number: 17,
        per_page: 100,
      })
      return files
    },
  }
  const core = {
    info() {},
    setOutput: (name, value) => {
      outputs[name] = value
    },
  }
  try {
    await run(github, context, core)
    return { mutations, outputs }
  } catch (error) {
    assert.equal(mutations.length, 0, 'Incomplete data must not change labels')
    throw error
  }
}

const large = await check(
  [
    ...Array.from({ length: 31 }, (_, i) => ({
      filename: `src/${i}.ts`,
      changes: 1,
    })),
    { filename: 'later-page.txt', changes: 20001 },
    { filename: 'pnpm-lock.yaml', changes: 40000 },
    { filename: '.gitignore', changes: 9 },
  ],
  ['bug', 'size/L'],
)
assert.deepEqual(large.outputs, { changedLines: 20041, sizeLabel: 'size/XXL' })
assert.deepEqual(large.mutations, [
  ['add', { ...context.repo, issue_number: 17, labels: ['size/XXL'] }],
  ['remove', { ...context.repo, issue_number: 17, name: 'size/L' }],
])

const renamed = await check(
  [
    {
      filename: 'pnpm-lock.yaml',
      previous_filename: 'src/old.ts',
      changes: 1000,
    },
  ],
  ['bug', 'size/XXL', 'size/S'],
)
assert.deepEqual(renamed.outputs, { changedLines: 1000, sizeLabel: 'size/XXL' })
assert.deepEqual(renamed.mutations, [
  ['remove', { ...context.repo, issue_number: 17, name: 'size/S' }],
])

const unchanged = await check(
  [
    { filename: 'pnpm-lock.yaml', changes: 50000 },
    { filename: '.gitignore', changes: 10 },
  ],
  ['enhancement', 'size/S'],
)
assert.deepEqual(unchanged.outputs, { changedLines: 10, sizeLabel: 'size/S' })
assert.deepEqual(unchanged.mutations, [])

await assert.rejects(
  check(
    Array.from({ length: 3000 }, (_, i) => ({
      filename: `${i}.txt`,
      changes: 0,
    })),
    [],
    3001,
  ),
  /File list incomplete: 3000 of 3001/,
)
console.log(
  'PR size checks passed: large paginated input, ignored/renamed paths, labels and incomplete listing.',
)

if (process.argv.includes('--live')) {
  const repository = process.argv[process.argv.indexOf('--repo') + 1]
  const number = Number(process.argv[process.argv.indexOf('--pr') + 1])
  assert.match(repository, /^[\w.-]+\/[\w.-]+$/)
  assert.ok(Number.isSafeInteger(number) && number > 0)
  const [owner, repo] = repository.split('/')
  const pullPath = `repos/${repository}/pulls/${number}`
  const get = (args) =>
    JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8' }))
  const plan = []
  const outputs = {}
  let pull
  await run(
    {
      rest: {
        pulls: {
          get: async () => {
            pull = get([pullPath])
            return { data: pull }
          },
          listFiles: 'files',
        },
        issues: {
          addLabels: async (args) =>
            plan.push({ action: 'addLabels', ...args }),
          removeLabel: async (args) =>
            plan.push({ action: 'removeLabel', ...args }),
        },
      },
      paginate: async () =>
        get(['--paginate', '--slurp', `${pullPath}/files?per_page=100`]).flat(),
    },
    { repo: { owner, repo }, payload: { pull_request: { number } } },
    {
      info: (message) => console.log(message),
      setOutput: (name, value) => {
        outputs[name] = value
      },
    },
  )
  console.log(
    JSON.stringify(
      {
        repository,
        number,
        head: pull.head.sha,
        changedFiles: pull.changed_files,
        outputs,
        plan,
        mutation: false,
      },
      null,
      2,
    ),
  )
}
