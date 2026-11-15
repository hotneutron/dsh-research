// A forward transport allowance retains every previously consumed request.
/**
 * @param {Record<string, any>} config
 * @param {{requests: number, active: number, ledger: Array<{ordinal: number, status: string, [key: string]: unknown}>} | null} predecessor
 */
export function resolveRelayLimits(config = {}, predecessor = null) {
  const maxRequests = config.maxRequests ?? 32
  const perRequestMs = config.perRequestMs ?? 120000
  for (const value of [maxRequests, perRequestMs]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Finite positive relay request and deadline bounds required')
  }
  let requests = 0, ledger = []
  if (predecessor !== null) {
    if (!Number.isSafeInteger(predecessor.requests) || predecessor.requests < 0 || predecessor.active !== 0 || !Array.isArray(predecessor.ledger))
      throw new Error('A complete idle predecessor snapshot is required')
    requests = predecessor.requests
    ledger = structuredClone(predecessor.ledger)
    const ordinals = new Set()
    for (const record of ledger) {
      if (!Number.isSafeInteger(record.ordinal) || record.ordinal <= 0 || record.ordinal > requests || ordinals.has(record.ordinal) || !['completed', 'unresolved'].includes(record.status))
        throw new Error('Predecessor request history is incomplete or inconsistent')
      ordinals.add(record.ordinal)
    }
    if (ledger.length !== requests) throw new Error('Predecessor request history is missing consumed request rows')
    if (maxRequests <= requests) throw new Error('Forward relay allowance must exceed retained consumption')
  }
  return { maxRequests, perRequestMs, requests, ledger }
}
