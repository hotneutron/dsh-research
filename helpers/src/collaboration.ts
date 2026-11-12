import { z } from 'zod'
import { ByteRef, Count, Id } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { canonicalJson, sha256 } from './bindings.js'

export const ReviewIntentSchema = z.strictObject({
  request_id: Id, review_id: Id, request: ByteRef, manifest: ByteRef, action_id: Id, subject_sha256: Id,
  dispatch_token: Id, reviewer_session_id: Id, parent_session_id: Id,
  phase: z.enum(['dispatching', 'observed', 'completed', 'request_changes', 'deferred', 'unavailable', 'unknown']),
  native_message_id: Id.nullable(), completion: ByteRef.nullable(), receipt: ByteRef.nullable(),
}).superRefine((v, ctx) => {
  if (['completed', 'request_changes', 'deferred'].includes(v.phase) && (v.completion === null || v.receipt === null))
    ctx.addIssue({ code: 'custom', message: 'Completed review intent needs native completion and receipt bytes' })
})
export const FeedbackItemSchema = z.strictObject({
  item_id: Id, source_id: Id, message_id: Id, source_version: Id, content: ByteRef,
  disposition: z.enum(['pending', 'adopted', 'rejected', 'deferred', 'stale']), reason: Id.nullable(),
  changed_action: ByteRef.nullable(), effect: ByteRef.nullable(), effect_status: z.enum(['pending', 'executed', 'failed', 'not_adopted']),
  effect_checkpoint: ByteRef.optional(),
})
export const FeedbackStateSchema = z.strictObject({
  cursors: z.record(Id, z.strictObject({ cursor: Id, scan: ByteRef })), items: z.record(Id, FeedbackItemSchema),
})
export type FeedbackState = z.infer<typeof FeedbackStateSchema>
export const PublicationSchema = z.strictObject({
  operation_id: Id, checkpoint: ByteRef, release: ByteRef, audience: Id,
  status: z.enum(['pending', 'failed', 'unknown', 'verified']), attempts: Count,
  verification: ByteRef.nullable(),
}).superRefine((v, ctx) => {
  if (v.status === 'verified' && v.verification === null) ctx.addIssue({ code: 'custom', message: 'Verified publication needs fetched content/audience evidence' })
})
export const FeedbackScanSchema = z.strictObject({
  source_id: Id, start_cursor: Id, end_cursor: Id,
  pages: z.array(z.strictObject({ cursor: Id, next_cursor: Id.nullable(), capture: ByteRef,
    items: z.array(z.strictObject({ message_id: Id, source_version: Id, content: ByteRef })) })).min(1),
})
export type FeedbackScan = z.infer<typeof FeedbackScanSchema>
export function captureFeedback(state: FeedbackState, scan: FeedbackScan, scanRef: ArtifactReference): FeedbackState {
  FeedbackStateSchema.parse(state)
  FeedbackScanSchema.parse(scan)
  if (state.cursors[scan.source_id]?.scan.sha256 === scanRef.sha256) return state
  const old = state.cursors[scan.source_id]
  if (old && old.cursor !== scan.start_cursor) throw new Error('Feedback scan starts from a stale cursor')
  let expected: string | null = scan.start_cursor
  const items = { ...state.items }
  for (const page of scan.pages) {
    if (expected === null || page.cursor !== expected) throw new Error('Feedback pages are incomplete or reordered')
    for (const item of page.items) {
      const itemId = `feedback-${sha256(canonicalJson([scan.source_id, item.message_id, item.source_version]))}`
      const previous = items[itemId]
      if (previous && previous.content.sha256 !== item.content.sha256) throw new Error('A feedback source version changed its original bytes')
      if (!previous) items[itemId] = { item_id: itemId, source_id: scan.source_id, message_id: item.message_id,
        source_version: item.source_version, content: item.content, disposition: 'pending', reason: null,
        changed_action: null, effect: null, effect_status: 'pending' }
    }
    expected = page.next_cursor
  }
  if (expected !== null) throw new Error('Partial feedback scan cannot advance the watermark')
  return FeedbackStateSchema.parse({ cursors: { ...state.cursors, [scan.source_id]: { cursor: scan.end_cursor, scan: scanRef } }, items })
}
export function disposeFeedback(state: FeedbackState, itemId: string, disposition: 'adopted' | 'rejected' | 'deferred' | 'stale', reason: string,
  changedAction: ArtifactReference | null): FeedbackState {
  const item = state.items[itemId]
  if (!item) throw new Error('Feedback source version is unknown')
  if (item.disposition !== 'pending' && item.disposition !== 'deferred') {
    if (item.disposition === disposition && item.reason === reason && item.changed_action?.sha256 === changedAction?.sha256) return state
    throw new Error('A finalized disposition requires a new causal correction, not an overwrite')
  }
  if (disposition === 'adopted' && changedAction === null) throw new Error('Adoption needs a changed frozen action')
  return FeedbackStateSchema.parse({ ...state, items: { ...state.items, [itemId]: { ...item, disposition, reason: Id.parse(reason),
    changed_action: changedAction, effect_status: disposition === 'adopted' ? 'pending' : 'not_adopted' } } })
}
export function recordFeedbackEffect(state: FeedbackState, itemId: string, action: ArtifactReference, receipt: ArtifactReference, status: 'executed' | 'failed'): FeedbackState {
  const item = state.items[itemId]
  if (!item || item.disposition !== 'adopted' || item.changed_action?.sha256 !== action.sha256) throw new Error('Effect is not linked to the adopted action')
  if (item.effect !== null) {
    if (item.effect.sha256 === receipt.sha256 && item.effect_status === status) return state
    throw new Error('An effect receipt cannot overwrite its original association')
  }
  return FeedbackStateSchema.parse({ ...state, items: { ...state.items, [itemId]: { ...item, effect: receipt, effect_status: status } } })
}

/** Ignore transport/plan names when detecting an unchanged rejected scientific subject. */
export function scientificSubject(manifest: Manifest): string {
  const input = manifest.inputs.map(i => [i.artifact.sha256, i.split, i.purpose, i.access])
  return sha256(canonicalJson({ candidate: [manifest.candidate.tree.sha256, manifest.candidate.configuration.sha256],
    evaluator: [manifest.evaluator.verifier.sha256, manifest.evaluator.interpreter.sha256], input,
    invocation: [manifest.invocation.executable, manifest.invocation.argv.slice(2), manifest.invocation.env],
    operation: manifest.proposal.operation, bounds: manifest.bounds, output: manifest.output.schema.sha256, domain_policy: manifest.domain_policy.sha256 }))
}

export function progressReport(kind: 'continue' | 'diagnose' | 'operational_hold' | 'goal_complete', detail: string, pendingHumanAction: string | null = null) {
  return { outcome: kind === 'goal_complete' ? 'ready' : kind === 'operational_hold' ? 'waiting' : 'working',
    detail: Id.parse(detail), human_action: pendingHumanAction }
}
