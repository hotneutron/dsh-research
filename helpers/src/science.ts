import { z } from 'zod'
import { AuthorityRef, ByteRef, Cost, Count, Id } from './records.js'
import type { ArtifactReference, Review } from './records.js'
import type { GpuExecutionContext, GpuSettlementContext } from './gpu.js'
import { canonicalJson } from './bindings.js'

/** An existing project admission/settlement procedure, never a replacement ledger. */
export const SciencePolicySchema = z.strictObject({ authority: AuthorityRef, envelope: ByteRef, guard: ByteRef })
export type SciencePolicy = z.infer<typeof SciencePolicySchema>
export const SciencePreflightSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('scientific_authority_preflight'),
  manifest: ByteRef, policy: SciencePolicySchema, ready: z.boolean(), observation: ByteRef,
})
export const ScienceSettlementSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('scientific_authority_settlement'),
  manifest: ByteRef, policy: SciencePolicySchema,
  action_id: Id, attempt_id: Id, dispatch_token: Id, admitted_revision: Count.positive(),
  native_terminal: ByteRef, capture: ByteRef,
  campaign_id: Id, contract: ByteRef, admission: ByteRef, checkpoint: ByteRef,
  // This first profile admits one complete original-controller unit. Its sole
  // supervisory wall charge includes children; child/overlapping cost sums are
  // outside this profile and require separate interval/allocation qualification.
  authority_observation: ByteRef, campaign_state: z.literal('closed'), costs: z.array(Cost).length(1),
}).superRefine((receipt, ctx) => {
  if (receipt.costs.some(cost => cost.purpose !== 'C_science' || cost.unit !== 'process_elapsed_seconds'
    || cost.amount === null || cost.source === null || cost.unresolved_reason !== null))
    ctx.addIssue({ code: 'custom', message: 'Scientific costs require resolved original process-wall receipts' })
  if (new Set(receipt.costs.map(cost => cost.execution_id)).size !== receipt.costs.length)
    ctx.addIssue({ code: 'custom', message: 'Original scientific execution costs must not be duplicated' })
})
export interface ScienceExecutionContext extends GpuExecutionContext {
  /** Supplied after native Session authentication; never supplied by author tool arguments. */
  approvedReview?: Review
  approvedReviewRef?: ArtifactReference
}
export interface NativeScienceGuard {
  identity: ArtifactReference
  /** Read the existing exact campaign gate. Reservation belongs to its original controller. */
  preflight(context: ScienceExecutionContext, signal: AbortSignal): Promise<ArtifactReference>
  /** Verify original admission, complete checkpoint and charges through the supported authority. */
  settle(context: GpuSettlementContext, signal: AbortSignal): Promise<ArtifactReference>
}
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b)
export function checkSciencePreflight(value: unknown, policy: SciencePolicy, manifest: ArtifactReference) {
  const receipt = SciencePreflightSchema.parse(value)
  if (!same(receipt.policy, policy) || !same(receipt.manifest, manifest))
    throw new Error('Scientific preflight differs from the registered original authority/envelope')
  if (!receipt.ready) throw new Error('Existing scientific authority does not permit this exact campaign')
  return receipt
}
export function checkScienceSettlement(value: unknown, policy: SciencePolicy, context: GpuSettlementContext) {
  const receipt = ScienceSettlementSchema.parse(value)
  if (!same(receipt.policy, policy) || !same(receipt.manifest, context.manifestRef)
    || receipt.action_id !== context.action_id || receipt.attempt_id !== context.attempt_id
    || receipt.dispatch_token !== context.dispatch_token || receipt.admitted_revision !== context.admitted_revision
    || !same(receipt.native_terminal, context.native_terminal) || !same(receipt.capture, context.capture))
    throw new Error('Original scientific settlement differs from the committed native attempt')
  return receipt
}
