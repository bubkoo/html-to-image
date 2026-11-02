import { spawnSync } from 'node:child_process'

if (!process.env.CI && process.env.HUSKY !== '0') {
  const result = spawnSync('husky', { stdio: 'inherit', shell: true })
  process.exitCode = result.status ?? 1
}
