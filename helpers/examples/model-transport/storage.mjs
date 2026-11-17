import {randomUUID} from 'node:crypto'
import {open,rename,unlink} from 'node:fs/promises'
import {dirname,join} from 'node:path'

export async function atomicPrivateJson(path, value) {
  const temporary = join(dirname(path), '.relay-' + randomUUID() + '.tmp')
  const file = await open(temporary, 'wx', 0o600)
  try { await file.writeFile(JSON.stringify(value, null, 2) + '\n'); await file.sync() }
  finally { await file.close() }
  try {
    await rename(temporary, path)
    const directory = await open(dirname(path), 'r')
    try { await directory.sync() } finally { await directory.close() }
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error }) }
}

