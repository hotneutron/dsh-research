import { z } from 'zod'
import { Assurance, Binding, ByteRef, Count, Id } from './records.js'
import type { ArtifactReference } from './records.js'
import { canonicalJson } from './bindings.js'
import { HistoricalResearchStateSchema } from './admission.js'

export const PropertyId = z.enum(['PROV-1', 'PROV-2', 'PROV-3', 'AUTH-1', 'AUTH-2', 'AUTH-3', 'AUTH-4',
  'EXEC-1', 'EXEC-2', 'EXEC-3', 'EXEC-4', 'STATE-1', 'STATE-2', 'STATE-3', 'DATA-1', 'DATA-2',
  'LOOP-1', 'LOOP-2', 'LOOP-3', 'FB-1', 'FB-2', 'FB-3', 'FB-4'])
export const CoverageMatrixSchema = z.strictObject({
  id: Id, binding: Binding, scope: ByteRef, qualification_budget_ref: ByteRef,
  cells: z.array(z.strictObject({ id: Id, property: PropertyId, kind: z.enum(['satisfying', 'rejecting', 'boundary', 'fault', 'not_applicable']),
    assurance: Assurance, assertions: z.record(Id, z.json()).refine(v => Object.keys(v).length > 0, 'At least one assertion required'), applicability_rule: ByteRef.nullable() })).min(1),
}).superRefine((v, ctx) => {
  if (new Set(v.cells.map(c => c.id)).size !== v.cells.length) ctx.addIssue({ code: 'custom', message: 'Coverage cell IDs must be unique' })
})
export const ObservationSchema = z.strictObject({
  cell_id: Id, binding: Binding, scope: ByteRef, assurance: Assurance, evidence: ByteRef,
  assertions: z.record(Id, z.json()), applicability_rule: ByteRef.nullable(),
})
export function auditCoverage(matrixInput: unknown, observationInputs: unknown[]) {
  const matrix = CoverageMatrixSchema.parse(matrixInput)
  const observations = observationInputs.map(value => ObservationSchema.parse(value))
  const covered: string[] = [], failed: string[] = [], unresolved: string[] = [], notApplicable: string[] = []
  for (const cell of matrix.cells) {
    const matches = observations.filter(o => o.cell_id === cell.id)
    const eligible = matches.filter(o => canonicalJson(o.binding) === canonicalJson(matrix.binding) && o.scope.sha256 === matrix.scope.sha256
      && o.assurance === cell.assurance && (cell.kind !== 'not_applicable' || (cell.applicability_rule !== null && o.applicability_rule?.sha256 === cell.applicability_rule.sha256)))
    if (!eligible.length) { unresolved.push(cell.id); continue }
    const complete = eligible.filter(o => Object.keys(cell.assertions).every(key => Object.hasOwn(o.assertions, key)))
    if (!complete.length) { unresolved.push(cell.id); continue }
    if (complete.some(o => Object.entries(cell.assertions).some(([key, expected]) => canonicalJson(o.assertions[key]) !== canonicalJson(expected)))) failed.push(cell.id)
    else if (cell.kind === 'not_applicable') notApplicable.push(cell.id)
    else covered.push(cell.id)
  }
  return { matrix_id: matrix.id, required: matrix.cells.map(c => c.id), covered, failed, unresolved, not_applicable: notApplicable,
    complete: failed.length === 0 && unresolved.length === 0, scope: matrix.scope, assurance: [...new Set(matrix.cells.map(c => c.assurance))] }
}

/** Read-only history audit; a code rollback or migration cannot refund old consumption. */
export function auditContinuity(beforeInput: unknown, afterInput: unknown) {
  const before = HistoricalResearchStateSchema.parse(beforeInput)
  const after = HistoricalResearchStateSchema.parse(afterInput)
  const violations: string[] = []
  const same = (a: unknown, b: unknown) => a === undefined || b === undefined ? a === b : canonicalJson(a) === canonicalJson(b)
  if (before.authority.authority_id !== after.authority.authority_id || before.authority.project_root !== after.authority.project_root
    || before.authority.project_id !== after.authority.project_id || canonicalJson(before.authority.registration) !== canonicalJson(after.authority.registration)) violations.push('authority_changed')
  if (before.authority.writer_id !== after.authority.writer_id) violations.push('writer_changed_requires_handoff')
  if (!same(before.binding, after.binding) || !same(before.policy, after.policy)) violations.push('binding_changed_requires_compatibility')
  if (after.revision < before.revision) violations.push('revision_rolled_back')
  if (after.consumed_attempts < before.consumed_attempts || after.consumed_timeout_ms < before.consumed_timeout_ms) violations.push('consumption_refunded')
  for (const id of before.consumed_reviews) if (!after.consumed_reviews.includes(id)) violations.push(`review_lost:${id}`)
  for (const [id, old] of Object.entries(before.actions)) {
    const next = after.actions[id]
    if (!next || canonicalJson(next.manifest) !== canonicalJson(old.manifest) || next.attempt_id !== old.attempt_id || canonicalJson(next.review) !== canonicalJson(old.review)
      || next.review_id !== old.review_id || next.action_id !== old.action_id || next.owner_session_id !== old.owner_session_id
      || (old.job_id !== null && next.job_id !== old.job_id)
      || next.admitted_revision !== old.admitted_revision || next.timeout_ms !== old.timeout_ms || next.dispatch_token !== old.dispatch_token) violations.push(`action_history_changed:${id}`)
    if (old.evidence && !same(next?.evidence, old.evidence)) violations.push(`evidence_rewritten:${id}`)
    if (old.checkpoint && !same(next?.checkpoint, old.checkpoint)) violations.push(`checkpoint_rewritten:${id}`)
    if (old.phase === 'settled' && next?.phase !== 'settled') violations.push(`terminal_reopened:${id}`)
    const phases = ['admitted', 'dispatching', 'running', 'unknown', 'settled']
    if (next && phases.indexOf(next.phase) < phases.indexOf(old.phase)) violations.push(`dispatch_phase_rolled_back:${id}`)
    if (old.reservation_active && !next?.reservation_active && next?.phase !== 'settled') violations.push(`reservation_released_without_settlement:${id}`)
  }
  if (before.schema_version === 2) {
    if (after.schema_version !== 2) violations.push('coordination_history_dropped')
    else {
      if (after.consumed_review_requests < before.consumed_review_requests) violations.push('review_requests_refunded')
      for (const [id, request] of Object.entries(before.review_requests)) {
        const next = after.review_requests[id]
        const { phase, native_message_id, completion, receipt, ...identity } = request
        const nextIdentity = next && (({ phase, native_message_id, completion, receipt, ...rest }) => rest)(next)
        if (!next || canonicalJson(identity) !== canonicalJson(nextIdentity)
          || (native_message_id !== null && next.native_message_id !== native_message_id)
          || (completion !== null && canonicalJson(next.completion) !== canonicalJson(completion))
          || (receipt !== null && canonicalJson(next.receipt) !== canonicalJson(receipt))
          || (['completed', 'request_changes', 'deferred'].includes(phase) && next.phase !== phase)) violations.push(`review_request_lost:${id}`)
      }
      for (const [id, subject] of Object.entries(before.rejected_subjects)) if (!same(after.rejected_subjects[id], subject)) violations.push(`rejected_subject_lost:${id}`)
      for (const [id, item] of Object.entries(before.feedback.items)) {
        const next = after.feedback.items[id]
        if (!next || next.item_id !== item.item_id || next.source_id !== item.source_id || next.message_id !== item.message_id
          || next.source_version !== item.source_version || canonicalJson(next.content) !== canonicalJson(item.content)) violations.push(`feedback_version_lost:${id}`)
        if (next && ((!['pending', 'deferred'].includes(item.disposition) && (next.disposition !== item.disposition || next.reason !== item.reason
          || canonicalJson(next.changed_action) !== canonicalJson(item.changed_action)))
          || (item.effect !== null && (canonicalJson(next.effect) !== canonicalJson(item.effect) || next.effect_status !== item.effect_status))
          || (item.effect_checkpoint !== undefined && !same(next.effect_checkpoint, item.effect_checkpoint)))) violations.push(`feedback_effect_changed:${id}`)
      }
      // The state stores only the latest scan. A changed cursor needs external chain reconciliation;
      // this audit cannot infer that proof from two snapshots.
      for (const [id, cursor] of Object.entries(before.feedback.cursors)) if (!same(after.feedback.cursors[id], cursor)) violations.push(`feedback_cursor_requires_reconciliation:${id}`)
      for (const [id, publication] of Object.entries(before.publications)) {
        const next = after.publications[id]
        if (!next || next.operation_id !== publication.operation_id || next.audience !== publication.audience
          || canonicalJson(next.checkpoint) !== canonicalJson(publication.checkpoint) || canonicalJson(next.release) !== canonicalJson(publication.release)
          || next.attempts < publication.attempts || (publication.status === 'verified' && (next.status !== 'verified'
            || canonicalJson(next.verification) !== canonicalJson(publication.verification)))) violations.push(`publication_history_lost:${id}`)
      }
    }
  }
  return { preserved: violations.length === 0, violations, before_version: before.schema_version, after_version: after.schema_version }
}

export function qualificationBudget(planned: number, actual: number, ceiling: number) {
  Count.parse(planned); Count.parse(actual); Count.parse(ceiling)
  return { may_start: planned <= ceiling, within_budget: actual <= ceiling, disposition: planned > ceiling || actual > ceiling ? 'owned_qualification_hold' : 'continue', architecture_entry: false }
}
