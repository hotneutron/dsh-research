import assert from 'node:assert/strict'
import test from 'node:test'
import { auditCoverage, qualificationBudget, auditContinuity } from '../src/qualification.js'
import { packets } from './fixtures/packets.js'
import { ResearchStateSchema, LegacyResearchStateSchema, reserveAction, DevelopmentPolicySchema } from '../src/admission.js'

test('finite coverage rejects missing, failed, wrong-scope and weaker-assurance observations', () => {
  const p = packets(); const scope = p.ref('scope/frozen', 'frozen-before-observation'); const rule = p.ref('scope/rule', 'off mode')
  const matrix = { id: 'matrix', binding: p.binding, scope, qualification_budget_ref: p.ref('scope/budget', 'bounded'), cells: [
    { id: 'capture-good', property: 'PROV-2', kind: 'satisfying', assurance: 'fixture_verified', assertions: { same_bytes: true }, applicability_rule: null },
    { id: 'capture-refuse', property: 'PROV-2', kind: 'rejecting', assurance: 'fixture_verified', assertions: { accepted_violation: false }, applicability_rule: null },
    { id: 'confirmation-release-off', property: 'DATA-2', kind: 'not_applicable', assurance: 'fixture_verified', assertions: { enabled: false }, applicability_rule: rule } ] }
  const observation = { cell_id: 'capture-good', binding: p.binding, scope, assurance: 'fixture_verified', evidence: p.ref('evidence/native', 'observed'), assertions: { same_bytes: true }, applicability_rule: null }
  assert.deepEqual(auditCoverage(matrix, [observation]).unresolved, ['capture-refuse', 'confirmation-release-off'])
  const all = [observation, { ...observation, cell_id: 'capture-refuse', assertions: { accepted_violation: false } }, { ...observation, cell_id: 'confirmation-release-off', assertions: { enabled: false }, applicability_rule: rule }]
  assert.equal(auditCoverage(matrix, all).complete, true)
  assert.equal(auditCoverage(matrix, [{ ...observation, assurance: 'implemented' }]).covered.length, 0)
  assert.equal(auditCoverage(matrix, [{ ...observation, assertions: { same_bytes: false } }]).failed[0], 'capture-good')
  assert.equal(auditCoverage(matrix, [{ ...all[2]!, applicability_rule: null }]).not_applicable.length, 0)
})

test('qualification budget overrun creates a hold without self-qualifying architecture entry', () => {
  assert.equal(qualificationBudget(5, 0, 4).may_start, false)
  assert.equal(qualificationBudget(4, 5, 4).disposition, 'owned_qualification_hold')
  assert.equal(qualificationBudget(4, 5, 4).architecture_entry, false)
})

test('historical state remains readable while rollback cannot refund consumed actions/reviews', () => {
  const p = packets()
  const policy = DevelopmentPolicySchema.parse({ scope: 'synthetic_released_cpu', authority: p.binding.authority, binding: p.binding,
    goal_id: p.manifest.goal.id, goal_revision: p.manifest.goal.revision, max_attempts: 2, max_timeout_ms: 1000, max_total_timeout_ms: 2000,
    max_output_bytes: 8192, allowed_executables: [p.manifest.invocation.executable], allowed_operations: [p.manifest.proposal.operation],
    domain_policy: p.manifest.domain_policy, verifier: p.manifest.evaluator.verifier, entrypoint: p.manifest.candidate.tree,
    reviewer: { session_id: p.review.reviewer.session_id, provider: p.review.reviewer.provider, preset: p.review.reviewer.preset, permissions: p.review.reviewer.permissions }, allowed_read_prefixes: ['snapshots/'] })
  const policyRef = p.ref('policy', policy)
  const zero = ResearchStateSchema.parse({ schema_version: 2, authority: p.binding.authority, binding: p.binding, policy: policyRef,
    revision: 0, stopped: false, consumed_attempts: 0, consumed_timeout_ms: 0, reserved_timeout_ms: 0, consumed_reviews: [], active_action_id: null, actions: {}, hold: null,
    consumed_review_requests: 0, review_requests: {}, rejected_subjects: {}, feedback: { cursors: {}, items: {} }, publications: {} })
  const active = reserveAction(zero, p.manifest, p.ref('manifest', p.manifest), p.review, p.ref('review', p.review), policy, policyRef, 0, 'claim')
  assert.equal(auditContinuity(active, active).preserved, true)
  assert.ok(auditContinuity(active, zero).violations.includes('consumption_refunded'))
  const { consumed_review_requests, review_requests, rejected_subjects, feedback, publications, ...base } = zero
  const old = LegacyResearchStateSchema.parse({ ...base, schema_version: 1 })
  assert.equal(old.schema_version, 1)
  assert.equal(auditContinuity(old, zero).preserved, true)
  assert.ok(auditContinuity(zero, old).violations.includes('coordination_history_dropped'))
})
