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
  if (before.authority.authority_id !== after.authority.authority_id || before.authority.project_root !== after.authority.project_root) violations.push('authority_changed')
  if (after.consumed_attempts < before.consumed_attempts || after.consumed_timeout_ms < before.consumed_timeout_ms) violations.push('consumption_refunded')
  for (const id of before.consumed_reviews) if (!after.consumed_reviews.includes(id)) violations.push(`review_lost:${id}`)
  for (const [id, old] of Object.entries(before.actions)) {
    const next = after.actions[id]
    if (!next || next.manifest.sha256 !== old.manifest.sha256 || next.attempt_id !== old.attempt_id || next.review.sha256 !== old.review.sha256
      || next.admitted_revision !== old.admitted_revision || next.timeout_ms !== old.timeout_ms || next.dispatch_token !== old.dispatch_token) violations.push(`action_history_changed:${id}`)
    if (old.evidence && next?.evidence?.sha256 !== old.evidence.sha256) violations.push(`evidence_rewritten:${id}`)
    if (old.checkpoint && next?.checkpoint?.sha256 !== old.checkpoint.sha256) violations.push(`checkpoint_rewritten:${id}`)
    if (old.phase === 'settled' && next?.phase !== 'settled') violations.push(`terminal_reopened:${id}`)
    if (old.reservation_active && !next?.reservation_active && next?.phase !== 'settled') violations.push(`reservation_released_without_settlement:${id}`)
  }
  if (before.schema_version === 2) {
    if (after.schema_version !== 2) violations.push('coordination_history_dropped')
    else {
      if (after.consumed_review_requests < before.consumed_review_requests) violations.push('review_requests_refunded')
      for (const [id, request] of Object.entries(before.review_requests)) if (after.review_requests[id]?.request.sha256 !== request.request.sha256) violations.push(`review_request_lost:${id}`)
      for (const [id, item] of Object.entries(before.feedback.items)) if (after.feedback.items[id]?.content.sha256 !== item.content.sha256) violations.push(`feedback_version_lost:${id}`)
      for (const [id, publication] of Object.entries(before.publications)) if (after.publications[id]?.release.sha256 !== publication.release.sha256) violations.push(`publication_history_lost:${id}`)
    }
  }
  return { preserved: violations.length === 0, violations, before_version: before.schema_version, after_version: after.schema_version }
}

export function qualificationBudget(planned: number, actual: number, ceiling: number) {
  Count.parse(planned); Count.parse(actual); Count.parse(ceiling)
  return { may_start: planned <= ceiling, within_budget: actual <= ceiling, disposition: planned > ceiling || actual > ceiling ? 'owned_qualification_hold' : 'continue', architecture_entry: false }
}
