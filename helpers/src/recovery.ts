import { z } from 'zod'
import { ByteRef, Count, Id } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import type { ActionState, ResearchState } from './admission.js'
import { canonicalJson } from './bindings.js'

/** A host assertion backed by an independently qualified recovery policy. */
export const RecoveryPreflightSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('native_recovery_preflight'),
  manifest: ByteRef, policy: ByteRef, recovery_policy: ByteRef,
  parent_action_id: Id, parent_attempt_id: Id, parent_failure: ByteRef, parent_checkpoint: ByteRef,
  replacement_unit: ByteRef, original_unit: ByteRef,
  observed_revision: Count, qualification: ByteRef, observation: ByteRef, ready: z.boolean(),
})
export type RecoveryPreflight = z.infer<typeof RecoveryPreflightSchema>
export interface NativeRecoveryGuard {
  identity: ArtifactReference
  qualification: ArtifactReference
  /** Host-only opt-in. The default accepts qualified pre-dispatch refusal only.
   * This mode must verify the original closed scientific admission/checkpoint,
   * retained charges, current original gate and a distinct replacement unit. */
  parentEvidenceKind?: 'settled_scientific_failure'
  preflight(context: { manifest: Manifest; manifestRef: ArtifactReference; policy: ArtifactReference;
    parent: ActionState; state: ResearchState }, signal: AbortSignal): Promise<ArtifactReference>
}
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b)

export function checkRecoveryPreflight(value: unknown, state: ResearchState, manifest: Manifest,
  manifestRef: ArtifactReference, policyRef: ArtifactReference, qualification?: ArtifactReference) {
  const proof = RecoveryPreflightSchema.parse(value)
  const retry = manifest.proposal.retry
  if (!retry || !same(proof.manifest, manifestRef) || !same(proof.policy, policyRef)
    || !same(proof.recovery_policy, retry.recovery_policy) || proof.parent_action_id !== retry.parent_action_id
    || !same(proof.parent_failure, retry.parent_failure)) throw new Error('Recovery proof differs from the frozen replacement/parent policy')
  const parent = state.actions[retry.parent_action_id]
  if (!parent || parent.action_id === manifest.action_id || parent.phase !== 'settled' || parent.reservation_active
    || parent.evidence === null || parent.checkpoint === null || !same(parent.evidence, retry.parent_failure)
    || proof.parent_attempt_id !== parent.attempt_id || !same(proof.parent_checkpoint, parent.checkpoint))
    throw new Error('Recovery parent is not the exact retained settled failure')
  if (!proof.ready || proof.observed_revision !== state.revision || !same(state.policy, policyRef)
    || (qualification && !same(proof.qualification, qualification))) throw new Error('Recovery authority/qualification/revision is unavailable')
  if (proof.original_unit.sha256 === proof.replacement_unit.sha256)
    throw new Error('The original immutable unit cannot be redispatched under another artifact location')
  if (!manifest.proposal.prerequisites.some(ref => same(ref, proof.qualification))
    || !manifest.proposal.prerequisites.some(ref => same(ref, retry.recovery_policy)))
    throw new Error('Recovery qualification and policy must be reviewed manifest prerequisites')
  return proof
}
