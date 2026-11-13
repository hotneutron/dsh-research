import { z } from 'zod'
import { AuthorityRef, Binding, ByteRef, Count, Hold, Id } from './records.js'
import type { ArtifactReference, BoundIdentity, Manifest, Review } from './records.js'
import { canonicalJson, sha256 } from './bindings.js'
import { ReviewIntentSchema, FeedbackStateSchema, PublicationSchema } from './collaboration.js'
import { GpuPolicySchema } from './gpu.js'

export const DevelopmentPolicySchema = z.strictObject({
  scope: z.enum(['synthetic_released_cpu', 'project_gpu_development']), authority: AuthorityRef, binding: Binding,
  goal_id: Id, goal_revision: Id, max_attempts: Count.positive(), max_timeout_ms: Count.positive(),
  max_total_timeout_ms: Count.positive(), max_output_bytes: Count.positive(),
  allowed_executables: z.array(Id).min(1), allowed_operations: z.array(Id).min(1),
  domain_policy: ByteRef, verifier: ByteRef, entrypoint: ByteRef, reviewer: z.strictObject({
    session_id: Id, provider: Id, preset: ByteRef, permissions: ByteRef,
  }),
  review_limits: z.strictObject({ max_requests: Count.positive(), timeout_ms: Count.positive(), max_tokens: Count.positive(),
    subagent_provider: Id, model: Id }).optional(),
  allowed_read_prefixes: z.array(z.enum(['snapshots/', 'local_artifacts/autoresearch/dsh/'])).min(1),
  gpu: GpuPolicySchema.optional(),
}).superRefine((v, ctx) => {
  if (canonicalJson(v.authority) !== canonicalJson(v.binding.authority)) ctx.addIssue({ code: 'custom', message: 'Policy binding and registered authority differ' })
  if ((v.scope === 'project_gpu_development') !== (v.gpu !== undefined)) ctx.addIssue({ code: 'custom', message: 'GPU scope requires its exact resource/guard policy; synthetic scope cannot carry GPU authority' })
  if (v.gpu && v.gpu.environment.CUDA_VISIBLE_DEVICES !== v.gpu.resource.device_uuid) ctx.addIssue({ code: 'custom', message: 'GPU environment must bind the exact device UUID' })
  // This initial GPU mapping is qualification-only. A caller-set assurance label
  // cannot enable scientific adoption before its full profile/authority gate.
})
export type DevelopmentPolicy = z.infer<typeof DevelopmentPolicySchema>
const actionStateObject = z.strictObject({
  action_id: Id, attempt_id: Id, manifest: ByteRef, review: ByteRef, review_id: Id, dispatch_token: Id,
  admitted_revision: Count.positive(), timeout_ms: Count.positive(), reservation_active: z.boolean(),
  phase: z.enum(['admitted', 'dispatching', 'running', 'settled', 'unknown']), job_id: Id.nullable(),
  owner_session_id: Id, evidence: ByteRef.nullable(), checkpoint: ByteRef.nullable(),
})
export const ActionStateSchema = actionStateObject.extend({
  runtime_facts: z.strictObject({ admission: ByteRef, identity: ByteRef, terminal: ByteRef, capture: ByteRef }).nullable().default(null),
})
const legacyStateObject = z.strictObject({
  schema_version: z.literal(1), authority: AuthorityRef, binding: Binding, policy: ByteRef,
  revision: Count, stopped: z.boolean(), consumed_attempts: Count, consumed_timeout_ms: Count,
  reserved_timeout_ms: Count, consumed_reviews: z.array(Id),
  active_action_id: Id.nullable(), actions: z.record(Id, actionStateObject), hold: Hold.nullable(),
})
export const LegacyResearchStateSchema = legacyStateObject.superRefine(validateConsumption)
const version2StateObject = legacyStateObject.extend({
  schema_version: z.literal(2), consumed_review_requests: Count, review_requests: z.record(Id, ReviewIntentSchema),
  rejected_subjects: z.record(Id, ByteRef), feedback: FeedbackStateSchema, publications: z.record(Id, PublicationSchema),
})
function validateCoordination(v: Omit<z.infer<typeof version2StateObject>, 'schema_version'>, ctx: z.RefinementCtx) {
  validateConsumption(v, ctx)
  if (v.consumed_review_requests !== Object.keys(v.review_requests).length) ctx.addIssue({ code: "custom", message: "Review request consumption differs from retained intents" })
}
export const Version2ResearchStateSchema = version2StateObject.superRefine(validateCoordination)
export const ResearchStateSchema = version2StateObject.extend({ schema_version: z.literal(3), actions: z.record(Id, ActionStateSchema) }).superRefine(validateCoordination)
export const HistoricalResearchStateSchema = z.union([LegacyResearchStateSchema, Version2ResearchStateSchema, ResearchStateSchema])

function validateConsumption(v: Omit<z.infer<typeof legacyStateObject>, 'schema_version'>, ctx: z.RefinementCtx) {
  if (canonicalJson(v.authority) !== canonicalJson(v.binding.authority)) ctx.addIssue({ code: 'custom', message: 'State binding and registered authority differ' })
  const actions = Object.values(v.actions)
  const reserved = actions.filter(a => a.reservation_active)
  if (v.consumed_attempts !== actions.length || new Set(v.consumed_reviews).size !== v.consumed_reviews.length
    || v.consumed_reviews.length !== actions.length || actions.some(a => !v.consumed_reviews.includes(a.review_id)))
    ctx.addIssue({ code: 'custom', message: 'Consumed attempt/review history does not match the coupled action set' })
  if (v.consumed_timeout_ms !== actions.reduce((sum, a) => sum + a.timeout_ms, 0)
    || v.reserved_timeout_ms !== reserved.reduce((sum, a) => sum + a.timeout_ms, 0))
    ctx.addIssue({ code: 'custom', message: 'Timeout consumption/reservation differs from retained actions' })
  if (reserved.length > 1 || (reserved.length === 0 ? v.active_action_id !== null : v.active_action_id !== reserved[0]?.action_id))
    ctx.addIssue({ code: 'custom', message: 'Active action does not match retained reservation' })
  if (actions.some(a => a.phase === 'settled' && (a.reservation_active || a.evidence === null || a.checkpoint === null)))
    ctx.addIssue({ code: 'custom', message: 'Settled action lacks retained evidence/checkpoint or still reserves resources' })
}
export type ResearchState = z.infer<typeof ResearchStateSchema>
export type ActionState = z.infer<typeof ActionStateSchema>

export class AdmissionError extends Error {
  constructor(readonly code: 'review' | 'stale' | 'stop' | 'bounds' | 'held' | 'identity', message: string) { super(message) }
}
export const equalIdentity = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b)

export function assertApprovedReview(manifest: Manifest, manifestRef: ArtifactReference, review: Review, policy: DevelopmentPolicy): void {
  const fail = (message: string): never => { throw new AdmissionError('review', message) }
  if (review.subject_kind !== 'scientific_action' || review.status !== 'completed' || review.decision !== 'approve' || review.completion === null) fail('Completed scientific-action review is required')
  if (review.action_id !== manifest.action_id || review.manifest?.sha256 !== manifestRef.sha256 || review.subject.sha256 !== manifestRef.sha256
    || review.packet.sha256 !== manifestRef.sha256 || !equalIdentity(review.binding, manifest.binding)) fail('Review is bound to a different subject/profile')
  if (review.author_session_id !== manifest.author_session_id || review.reviewer.session_id === manifest.author_session_id) fail('Reviewer must be separate from the bound author')
  if (review.reviewer.session_id !== policy.reviewer.session_id || review.reviewer.provider !== policy.reviewer.provider
    || !equalIdentity(review.reviewer.preset, policy.reviewer.preset) || !equalIdentity(review.reviewer.permissions, policy.reviewer.permissions)) fail('Reviewer does not match the host-owned profile')
  if (review.scope.proposal.sha256 !== sha256(canonicalJson(manifest.proposal)) || !equalIdentity(review.scope.bounds, manifest.bounds)
    || !equalIdentity(review.scope.prerequisites, manifest.proposal.prerequisites)) fail('Review does not cover the exact proposed action and limits')
}

/** Pure coupled update for the existing serialized record boundary. */
export function reserveAction(current: ResearchState, manifest: Manifest, manifestRef: ArtifactReference, review: Review, reviewRef: ArtifactReference,
  policy: DevelopmentPolicy, policyRef: ArtifactReference, expectedRevision: number, dispatchToken: string): ResearchState {
  ResearchStateSchema.parse(current)
  if (!equalIdentity(current.authority, policy.authority) || !equalIdentity(current.binding, policy.binding)
    || !equalIdentity(manifest.binding, current.binding) || !equalIdentity(current.policy, policyRef)) throw new AdmissionError('identity', 'Registered project authority/profile differs')
  const previous = current.actions[manifest.action_id]
  if (previous) return current // Replay reconciles the original consumption; never a second launch.
  assertApprovedReview(manifest, manifestRef, review, policy)
  if (current.revision !== expectedRevision) throw new AdmissionError('stale', 'Current state revision differs')
  if (current.stopped) throw new AdmissionError('stop', 'Project is stopped')
  const resolvedReviewHold = current.hold?.kind === 'review_unavailable' && current.hold.affected.includes(manifest.action_id)
  if (current.active_action_id !== null || (current.hold !== null && !resolvedReviewHold)) throw new AdmissionError('held', 'Unsettled action or operational hold retains authority')
  if (current.consumed_reviews.includes(review.review_id)) throw new AdmissionError('review', 'Review has already been consumed')
  if (manifest.goal.id !== policy.goal_id || manifest.goal.revision !== policy.goal_revision
    || !policy.allowed_executables.includes(manifest.invocation.executable) || !policy.allowed_operations.includes(manifest.proposal.operation)
    || !equalIdentity(manifest.domain_policy, policy.domain_policy) || !equalIdentity(manifest.evaluator.verifier, policy.verifier)) throw new AdmissionError('identity', 'Action exceeds standing project scope')
  if (manifest.bounds.timeout_ms > policy.max_timeout_ms || manifest.bounds.max_attempts > policy.max_attempts
    || current.consumed_attempts >= manifest.bounds.max_attempts || current.consumed_attempts >= policy.max_attempts
    || current.consumed_timeout_ms + manifest.bounds.timeout_ms > policy.max_total_timeout_ms
    || current.consumed_timeout_ms + manifest.bounds.timeout_ms > manifest.bounds.timeout_reservation_ms) throw new AdmissionError('bounds', 'Attempt or total timeout allowance is exhausted')
  if (manifest.proposal.retry !== null) throw new AdmissionError('held', 'Fresh retry/rejected-path recovery policy is not yet qualified')
  const revision = current.revision + 1
  const action: ActionState = { action_id: manifest.action_id, attempt_id: `attempt-${manifest.action_id}`, manifest: manifestRef, review: reviewRef, dispatch_token: Id.parse(dispatchToken),
    review_id: review.review_id, admitted_revision: revision, timeout_ms: manifest.bounds.timeout_ms, reservation_active: true,
    phase: 'admitted', job_id: null, owner_session_id: manifest.author_session_id, evidence: null, checkpoint: null, runtime_facts: null }
  return ResearchStateSchema.parse({ ...current, revision, hold: resolvedReviewHold ? null : current.hold, consumed_attempts: current.consumed_attempts + 1,
    consumed_timeout_ms: current.consumed_timeout_ms + manifest.bounds.timeout_ms, reserved_timeout_ms: current.reserved_timeout_ms + manifest.bounds.timeout_ms,
    consumed_reviews: [...current.consumed_reviews, review.review_id], active_action_id: manifest.action_id, actions: { ...current.actions, [manifest.action_id]: action } })
}

export function updateAction(current: ResearchState, actionId: string, transform: (action: ActionState) => ActionState): ResearchState {
  const action = current.actions[actionId]
  if (!action) throw new AdmissionError('identity', 'Action is not registered')
  const next = transform(action)
  if (next.action_id !== action.action_id || next.admitted_revision !== action.admitted_revision || !equalIdentity(next.manifest, action.manifest)
    || next.timeout_ms !== action.timeout_ms || next.attempt_id !== action.attempt_id || next.dispatch_token !== action.dispatch_token
    || next.owner_session_id !== action.owner_session_id || next.review_id !== action.review_id || !equalIdentity(next.review, action.review)
    || (action.evidence !== null && !equalIdentity(action.evidence, next.evidence))
    || (action.runtime_facts !== null && !equalIdentity(action.runtime_facts, next.runtime_facts))
    || (action.checkpoint !== null && !equalIdentity(action.checkpoint, next.checkpoint))) throw new AdmissionError('identity', 'Consumed action identity cannot change')
  return ResearchStateSchema.parse({ ...current, revision: current.revision + 1, actions: { ...current.actions, [actionId]: next } })
}
