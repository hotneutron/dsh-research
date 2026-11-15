import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveRelayLimits } from '../examples/traex-tools/relay-limits.mjs'

test('forward relay keeps failed and completed consumption and starts at the next ordinal', () => {
  const predecessor = { requests: 31, active: 0, ledger: Array.from({ length: 31 }, (_, index) => ({
    ordinal: index + 1, status: index === 30 ? 'unresolved' : 'completed',
    usage: { output_tokens: 20000 }, error: index === 30 ? 'deadline' : null,
  })) }
  const limits = resolveRelayLimits({ maxRequests: 64, perRequestMs: 300000 }, predecessor)
  assert.equal(limits.requests + 1, 32)
  assert.equal(limits.maxRequests - limits.requests, 33)
  assert.equal(limits.perRequestMs, 300000)
  assert.deepEqual(limits.ledger, predecessor.ledger)
  limits.ledger[0]!.status = 'unresolved'
  assert.equal(predecessor.ledger[0]!.status, 'completed')
})

test('active, incomplete or rewound predecessor cannot grant a fresh allowance', () => {
  for (const predecessor of [
    { requests: 31, active: 1, ledger: [] },
    { requests: 31, active: 0, ledger: [{ ordinal: 1, status: 'started' }] },
    { requests: 0, active: 0, ledger: [{ ordinal: 31, status: 'completed' }] },
    { requests: 31, active: 0, ledger: [{ ordinal: 1, status: 'completed' }, { ordinal: 1, status: 'unresolved' }] },
    { requests: 31, active: 0, ledger: [] },
    { requests: 31, active: 0, ledger: [{ ordinal: 1, status: 'completed' }, { ordinal: 31, status: 'unresolved' }] },
  ]) assert.throws(() => resolveRelayLimits({ maxRequests: 64 }, predecessor), /predecessor|Predecessor/)
  const complete = { requests: 1, active: 0, ledger: [{ ordinal: 1, status: 'completed' }] }
  assert.throws(() => resolveRelayLimits({ maxRequests: 1 }, complete), /retained consumption/)
})

test('relay rejects malformed bounds and preserves finite defaults', () => {
  for (const value of [Infinity, NaN, 0, -1, 1.5, '64']) {
    assert.throws(() => resolveRelayLimits({ maxRequests: value }), /Finite positive/)
    assert.throws(() => resolveRelayLimits({ perRequestMs: value }), /Finite positive/)
  }
  assert.equal(resolveRelayLimits().maxRequests, 32)
})
