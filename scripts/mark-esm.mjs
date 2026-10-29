import { writeFile } from 'node:fs/promises'

await writeFile(new URL('../es/package.json', import.meta.url), '{"type":"module"}\n')
