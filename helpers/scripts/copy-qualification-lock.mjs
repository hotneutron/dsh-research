import { copyFile, cp, mkdir } from 'node:fs/promises'

// Retain the exact development lock in the generated package, which npm can distribute.
await copyFile(new URL('../pnpm-lock.yaml', import.meta.url), new URL('../dist/qualification-lock.yaml', import.meta.url))
await mkdir(new URL('../dist/docs/', import.meta.url), { recursive: true })
for (const name of ['contracts.md', 'compatibility.json', 'integration.md']) {
  await copyFile(new URL(`../../docs/${name}`, import.meta.url), new URL(`../dist/docs/${name}`, import.meta.url))
}
await cp(new URL('../../skills/', import.meta.url), new URL('../dist/skills/', import.meta.url), { recursive: true })
