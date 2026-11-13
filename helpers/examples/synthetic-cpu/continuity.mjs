import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { backup, DatabaseSync } from 'node:sqlite'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import { auditContinuity, canonicalJson, sha256 } from 'dsh-research'
import { researchDomain } from 'dsh-research/native'

const output = process.argv[2]
if (!output) throw new Error('Usage: continuity.mjs <fresh-output-directory>')
const root = resolve(output)
await mkdir(root, { recursive: false })
const sourceRoot = join(root, 'source')
// Automatic workflow owns and closes its only writer before the recovery exercise.
execFileSync(process.execPath, [fileURLToPath(new URL('./automatic.mjs', import.meta.url)), sourceRoot], { stdio: 'pipe' })
const original = JSON.parse(await readFile(join(sourceRoot, 'receipt.json'), 'utf8')).state
const exportRoot = join(root, 'backup')
await mkdir(exportRoot)
const sqlite = new DatabaseSync(join(sourceRoot, '.autoresearch/dsh/state.sqlite3'), { readOnly: true })
try { await backup(sqlite, join(exportRoot, 'state.sqlite3')) } finally { sqlite.close() }
// Linked exact artifact versions and native Sessions accompany the supported SQLite backup.
for (const name of ['snapshots', 'local_artifacts', '.autoresearch/dsh/sessions']) {
  await cp(join(sourceRoot, name), join(exportRoot, name), { recursive: true, errorOnExist: true, force: false })
}
const files = []
async function inventory(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name
    if (entry.isDirectory()) await inventory(join(directory, entry.name), name + '/')
    else {
      assert.ok(entry.isFile(), 'Only regular frozen files can enter the recovery set')
      const bytes = await readFile(join(directory, entry.name))
      files.push({ uri: name, sha256: sha256(bytes), size_bytes: bytes.length })
      if (name !== 'state.sqlite3') assert.equal(sha256(await readFile(join(sourceRoot, name))), sha256(bytes))
    }
  }
}
await inventory(exportRoot)
const restoredPath = join(sourceRoot, '.autoresearch/dsh/disposable-restore/state.sqlite3')
await mkdir(join(sourceRoot, '.autoresearch/dsh/disposable-restore'))
await cp(join(exportRoot, 'state.sqlite3'), restoredPath, { errorOnExist: true, force: false })
const ctx = new Context()
await ctx.plugin(Storage)
const backend = new SqliteStorageBackend({ path: restoredPath, journalMode: 'wal' })
ctx.storage.backend.register('sqlite', backend)
let domain
try {
  domain = await new DomainFacility(ctx, { backend: 'sqlite' }).open(researchDomain)
  const restored = domain.table('projects').get('synthetic-m2')
  assert.ok(restored, 'Restore must resolve the same registration without reseeding')
  assert.equal(canonicalJson(restored), canonicalJson(original))
  assert.equal(auditContinuity(original, restored).preserved, true)
  const stale = { ...restored, publications: {} }
  assert.equal(auditContinuity(original, stale).preserved, false)
  await writeFile(join(root, 'receipt.json'), JSON.stringify({ schema_version: 1, timestamp: new Date().toISOString(),
    scope: 'M6 disposable idle backup and version-three native restore; no live handoff', canonical_project_root: sourceRoot,
    binding: original.binding, continuity: auditContinuity(original, restored), stale_rollback: auditContinuity(original, stale), files,
    synthetic_evaluator_dispatches: 2, external_model_calls: 0, source_writer_closed_before_backup: true,
    state_reseeded: false, confirmation: 'off', limitations: ['No live writer fencing or legacy exposure authority restored',
      'Linked artifacts retain the original canonical root; relocation requires its own verified mapping',
      'Scripted reviewers and local release proof do not qualify scientific or team access'] }, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ receipt: join(root, 'receipt.json'), continuity: 'passed', stale_rollback: 'refused', files: files.length }))
} finally {
  if (domain) await domain.close()
  await backend.close()
  await ctx.fiber.dispose()
}
