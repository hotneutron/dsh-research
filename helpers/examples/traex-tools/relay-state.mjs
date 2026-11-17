import { randomUUID, createHash } from 'node:crypto'
import { open, rename, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

// This is transport accounting only. Interrupted requests cannot authorize native tools.
/** @param {any} snapshot
 * @param {any} controls
 * @param {null|{qualified:boolean,from_ms:number,to_ms:number,retained_requests:number,[key:string]:any}} deadlineRenewal
 */
export function residentPredecessor(snapshot, controls, deadlineRenewal = null) {
  const reviewedDeadline = deadlineRenewal?.qualified === true && deadlineRenewal.from_ms === snapshot.perRequestMs
    && deadlineRenewal.to_ms === controls.perRequestMs && deadlineRenewal.retained_requests === snapshot.requests
    && snapshot.active === 0
  if (snapshot.maxRequests !== controls.maxRequests || (snapshot.perRequestMs !== controls.perRequestMs && !reviewedDeadline))
    throw new Error('Resident relay limits changed without a reviewed forward transport handoff')
  const prior = structuredClone(snapshot)
  if (!Number.isSafeInteger(prior.active) || prior.active < 0 || !Array.isArray(prior.ledger))
    throw new Error('Resident relay has no complete durable lifecycle snapshot')
  for (const item of prior.ledger) {
    if (item.status === 'started') {
      item.status = 'unresolved'
      item.error = 'Resident model transport interrupted before durable completion; usage remains unresolved'
      item.ended = new Date().toISOString()
    }
  }
  prior.active = 0
  return prior
}

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

export function frozenSnapshot(path, bytes) {
  return { path, sha256: createHash('sha256').update(bytes).digest('hex'), size_bytes: bytes.length }
}

// ## Revision History
// 2026-11-16T19:37:56.752974+00:00: Permit only exact independently reviewed deadline extension; unchanged request allowance and complete idle history are required.
