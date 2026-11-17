import { randomUUID } from 'node:crypto'

export interface ModelRequestRecord {
  id: string; ordinal: number | null; route_id: string; session_id: string;
  phase: 'preflight' | 'refused' | 'admitted' | 'completed' | 'unresolved';
  started_at: string; ended_at: string | null; receipt: unknown; error: string | null
}
export interface ModelBudgetSnapshot {
  schema_version: 1; scope_id: string; max_requests: number; max_in_flight: number;
  consumed_requests: number; active: number; records: ModelRequestRecord[]
  hold: { request_id: string; reason: string; evidence: unknown } | null
}
/** Shared transport accounting; it neither owns nor mutates scientific admission/state. */
export class ModelRequestBudget {
  readonly records: ModelRequestRecord[]
  private consumed: number
  private active = 0
  private writes = Promise.resolve()
  private failed = false
  private hold: ModelBudgetSnapshot['hold'] = null
  constructor(readonly scopeId: string, readonly maxRequests: number, readonly maxInFlight: number,
    private readonly persist: (snapshot: ModelBudgetSnapshot) => Promise<void>, previous?: ModelBudgetSnapshot) {
    if (!scopeId || ![maxRequests, maxInFlight].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Explicit finite model budget and concurrency required')
    if (previous) {
      if (previous.schema_version !== 1 || previous.scope_id !== scopeId || previous.max_requests !== maxRequests || previous.max_in_flight !== maxInFlight
        || previous.active !== 0 || previous.hold !== null || !Number.isSafeInteger(previous.consumed_requests) || previous.consumed_requests < 0
        || previous.consumed_requests > maxRequests) throw new Error('Model budget handoff must preserve exact scope/limits and fenced history')
      const charged = previous.records.filter(record => record.ordinal !== null).sort((a, b) => a.ordinal! - b.ordinal!)
      if (charged.length !== previous.consumed_requests || new Set(previous.records.map(record => record.id)).size !== previous.records.length
        || charged.some((record, index) => record.ordinal !== index + 1 || !['completed', 'unresolved'].includes(record.phase)))
        throw new Error('Model history is incomplete or contains unresolved ownership')
    }
    this.consumed = previous?.consumed_requests ?? 0
    this.records = structuredClone(previous?.records ?? [])
  }
  snapshot(): ModelBudgetSnapshot { return structuredClone({ schema_version: 1, scope_id: this.scopeId,
    max_requests: this.maxRequests, max_in_flight: this.maxInFlight, consumed_requests: this.consumed, active: this.active, records: this.records, hold: this.hold }) }
  async flush() { await this.writes }
  assertDispatch() { if (this.failed || this.hold) throw new Error('Model accounting/ownership is unresolved; no further dispatch') }
  private save() {
    const value = this.snapshot()
    this.writes = this.writes.then(() => this.persist(value)).catch(error => { this.failed = true; throw error })
    return this.writes
  }
  reserve(routeId: string, sessionId: string) {
    if (this.failed || this.hold) throw new Error('Model accounting/ownership is unresolved; no further dispatch')
    const record: ModelRequestRecord = { id: randomUUID(), ordinal: null, route_id: routeId, session_id: sessionId,
      phase: 'preflight', started_at: new Date().toISOString(), ended_at: null, receipt: null, error: null }
    this.records.push(record)
    if (this.active >= this.maxInFlight || this.consumed >= this.maxRequests) {
      record.phase = 'refused'; record.ended_at = new Date().toISOString(); record.error = this.active >= this.maxInFlight ? 'Model concurrency capacity reached' : 'Model request allowance exhausted'
      void this.save().catch(() => {})
      throw new Error(record.error)
    }
    this.active++
    let released = false
    const release = async () => { if (!released) { released = true; this.active--; await this.save() } }
    return {
      record,
      admit: async () => {
        this.assertDispatch()
        if (record.phase !== 'preflight' || this.consumed >= this.maxRequests) throw new Error('Model admission scope is exhausted or changed')
        record.ordinal = ++this.consumed; record.phase = 'admitted'; await this.save()
      },
      settle: async (receipt: unknown) => { record.phase = 'completed'; record.receipt = receipt; record.ended_at = new Date().toISOString(); await release() },
      fail: async (error: string, receipt: unknown = null, ownershipUnknown = false) => {
        record.phase = record.ordinal === null ? 'refused' : 'unresolved'; record.error = error; record.receipt = receipt; record.ended_at = new Date().toISOString()
        if (ownershipUnknown) this.hold = { request_id: record.id, reason: error, evidence: receipt }
        await release()
      },
    }
  }
}
