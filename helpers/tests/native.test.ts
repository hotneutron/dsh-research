import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { storageFixture, workerFixture } from './fixtures/native.js'

test('public native SQLite storage preserves serialized reservations and consumption on reopen', { timeout: 10000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-research-storage-'))
  try { await storageFixture(root, '0'.repeat(64)) } finally { await rm(root, { recursive: true, force: true }) }
})

test('pinned public child lifecycle and separate scripted reviewer execute keylessly', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-research-worker-'))
  try { await workerFixture(root, '1'.repeat(64)) } finally { await rm(root, { recursive: true, force: true }) }
})
