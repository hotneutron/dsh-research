import { z } from 'zod'
import { ByteRef, Count, Id } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { canonicalJson } from './bindings.js'

export const GpuResourceSchema = z.strictObject({ host: Id, device_uuid: z.string().regex(/^GPU-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/) })
export const GpuPolicySchema = z.strictObject({
  resource: GpuResourceSchema, guard: ByteRef, qualification: ByteRef, budget: ByteRef, lease_namespace: ByteRef,
  environment: z.record(Id, z.string()), purpose: z.literal('C_qual'),
})
export const GpuPreflightSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('gpu_preflight'), manifest: ByteRef,
  guard: ByteRef, resource: GpuResourceSchema, ready: z.boolean(), observation: ByteRef,
})
export const GpuSettlementSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('gpu_settlement'), manifest: ByteRef,
  guard: ByteRef, resource: GpuResourceSchema, action_id: Id, attempt_id: Id,
  dispatch_token: Id, admitted_revision: Count.positive(), native_terminal: ByteRef, capture: ByteRef,
  lease: ByteRef, observation: ByteRef, complete_unit: z.boolean(),
  process_tree_quiescent: z.boolean(), device_context_quiescent: z.boolean(), lease_released: z.boolean(),
})
export type GpuPolicy = z.infer<typeof GpuPolicySchema>
export interface GpuExecutionContext {
  manifest: Manifest
  manifestRef: ArtifactReference
}
export interface GpuSettlementContext extends GpuExecutionContext {
  action_id: string
  attempt_id: string
  dispatch_token: string
  admitted_revision: number
  native_terminal: ArtifactReference
  capture: ArtifactReference
}
/** Host-registered project procedure over existing resource/producer services.
 * GPU acquisition occurs in the pinned producer before scientific GPU dispatch;
 * the producer must retain the existing lease through device/child teardown.
 * The author cannot replace these hooks, and their provenance needs separate qualification.
 */
export interface NativeGpuGuard {
  identity: ArtifactReference
  preflight(context: GpuExecutionContext, signal: AbortSignal): Promise<ArtifactReference>
  settle(context: GpuSettlementContext, signal: AbortSignal): Promise<ArtifactReference>
}
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b)

export function checkGpuPreflight(input: unknown, policy: GpuPolicy, manifest: ArtifactReference) {
  const receipt = GpuPreflightSchema.parse(input)
  if (!same(receipt.manifest, manifest) || !same(receipt.guard, policy.guard) || !same(receipt.resource, policy.resource))
    throw new Error('GPU preflight subject/provider/resource mismatch')
  if (!receipt.ready) throw new Error('GPU resource/profile preflight is unavailable; no admission or dispatch permitted')
  return receipt
}
export function checkGpuSettlement(input: unknown, policy: GpuPolicy, context: GpuSettlementContext) {
  const receipt = GpuSettlementSchema.parse(input)
  if (!same(receipt.manifest, context.manifestRef) || !same(receipt.guard, policy.guard) || !same(receipt.resource, policy.resource)
    || receipt.action_id !== context.action_id || receipt.attempt_id !== context.attempt_id
    || receipt.dispatch_token !== context.dispatch_token || receipt.admitted_revision !== context.admitted_revision
    || !same(receipt.native_terminal, context.native_terminal) || !same(receipt.capture, context.capture))
    throw new Error('GPU settlement differs from the committed native subject/capture')
  if (!receipt.process_tree_quiescent || !receipt.device_context_quiescent || !receipt.lease_released)
    throw new Error('GPU ownership/lease/quiescence unresolved; retain the original reservation')
  return receipt
}
