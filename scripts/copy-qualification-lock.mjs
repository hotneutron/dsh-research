import { copyFile } from 'node:fs/promises'

// Retain the exact development lock in the generated package, which npm can distribute.
await copyFile(new URL('../pnpm-lock.yaml', import.meta.url), new URL('../dist/qualification-lock.yaml', import.meta.url))
