import { canonicalJson, sha256, verifyBytes } from './bindings.js'
import { ByteRef } from './records.js'
import type { ModelBudgetSnapshot, ModelRequestRecord } from './model-budget.js'

/** One-shot mapping of an independently fenced source; it does not requalify historical responses. */
export function importStoppedModelHistory(source: Uint8Array, reference: ReturnType<typeof ByteRef.parse>, options: {
  scopeId: string; maxInFlight: number; fence: { snapshot_sha256: string; evidence: ReturnType<typeof ByteRef.parse> }
}): { snapshot: ModelBudgetSnapshot; identity_index: Array<{ id: string; original: ReturnType<typeof ByteRef.parse>; pointer: string }> } {
  ByteRef.parse(reference); ByteRef.parse(options.fence.evidence)
  verifyBytes(reference, source)
  if (options.fence.snapshot_sha256 !== reference.sha256 || !options.scopeId || !Number.isSafeInteger(options.maxInFlight) || options.maxInFlight <= 0)
    throw new Error('Model history mapping requires the exact source fence and destination scope')
  const old = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(source)) as { requests?: unknown; maxRequests?: unknown; active?: unknown; ledger?: unknown }
  if (!old || !Number.isSafeInteger(old.requests) || (old.requests as number) < 0 || !Number.isSafeInteger(old.maxRequests)
    || (old.maxRequests as number) <= 0 || (old.maxRequests as number) < (old.requests as number) || old.active !== 0 || !Array.isArray(old.ledger))
    throw new Error('Original model history is incomplete or not stopped')
  const records: ModelRequestRecord[] = [], identity_index: Array<{ id: string; original: ReturnType<typeof ByteRef.parse>; pointer: string }> = []
  for (let index = 0; index < old.ledger.length; index++) {
    const value = old.ledger[index]
    if (!value || !Number.isSafeInteger(value.ordinal) || value.ordinal < 1 || !['completed', 'unresolved'].includes(value.status))
      throw new Error('Original model request status is invalid or ownership unresolved')
    const id = `retained-${reference.sha256}-${value.ordinal}`
    identity_index.push({ id, original: reference, pointer: `/ledger/${index}` })
    records.push({ id, ordinal: value.ordinal, route_id: `historical-${String(value.kind ?? 'unobserved')}`,
      session_id: typeof value.session_id === 'string' ? value.session_id : '<historical-unobserved>',
      phase: value.status, started_at: typeof value.started === 'string' ? value.started : '<historical-unobserved>',
      ended_at: typeof value.ended === 'string' ? value.ended : null, error: typeof value.error === 'string' ? value.error : null,
      receipt: { original: reference, pointer: `/ledger/${index}`, original_record_sha256: sha256(canonicalJson(value)),
        usage: value.usage ?? null, qualification: 'historical scope only; unavailable facts remain unavailable' } })
  }
  const ordinals = records.map(record => record.ordinal!).sort((a,b)=>a-b)
  if (ordinals.length !== old.requests || ordinals.some((ordinal,index)=>ordinal !== index+1)) throw new Error('Original consumed history is missing or duplicated')
  return { snapshot: { schema_version: 1, scope_id: options.scopeId, max_requests: old.maxRequests as number,
    max_in_flight: options.maxInFlight, consumed_requests: old.requests as number, active: 0, records, hold: null }, identity_index }
}
