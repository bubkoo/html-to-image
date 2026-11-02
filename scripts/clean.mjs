import { rmSync } from 'node:fs'

for (const directory of ['dist', 'es', 'lib']) {
  rmSync(directory, { recursive: true, force: true })
}
