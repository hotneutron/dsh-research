import { z } from 'zod'
import { zstdDecompressSync } from 'node:zlib'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { AuthorityRef, Binding, Bounds, ByteRef, Count, EvidenceSchema, Id, ReviewSchema } from './records.js'
import type { ArtifactReference, Evidence, Manifest, Review } from './records.js'
import { DevelopmentPolicySchema, ResearchStateSchema, equalIdentity } from './admission.js'
import type { ActionState, DevelopmentPolicy, ResearchState } from './admission.js'
import { canonicalJson, sha256 } from './bindings.js'
import { ProjectArtifacts, loadManifest, verifyIdentity } from './manifest.js'
import { checkpointFor } from './loop.js'
import { SciencePolicySchema } from './science.js'

export const NoDispatchTupleSchema = z.strictObject({ action_id: Id, attempt_id: Id, dispatch_token: Id,
  admitted_revision: Count.positive(), manifest: ByteRef, review: ByteRef, review_id: Id,
  owner_session_id: Id, timeout_ms: Count.positive() })
const SourcePinSchema = z.strictObject({ role: z.enum(['native_adapter', 'shell', 'tools', 'jobs', 'hooks', 'parser']), content: ByteRef })
const SourcePinsSchema = z.array(SourcePinSchema).min(6).superRefine((pins, ctx) => {
  for (const role of ['native_adapter', 'shell', 'tools', 'jobs', 'hooks', 'parser'])
    if (!pins.some(pin => pin.role === role)) ctx.addIssue({ code: 'custom', message: `Missing original ${role} source pin` })
  if (new Set(pins.map(pin => pin.role)).size !== pins.length) ctx.addIssue({ code: 'custom', message: 'Source pin roles must be unique' })
})
/** Qualification is supplied by the host's independent source acceptance procedure.
 * Its truth is not inferred from JSON labels or from a model's error explanation. */
export const NoDispatchControlFlowSchema = z.strictObject({ schema_version: z.literal(1), kind: z.literal('no_dispatch_control_flow'),
  host_scope: Id, source_pins: SourcePinsSchema, unique_error: Id,
  failure_site: z.strictObject({ source: ByteRef, description: Id }),
  reachable_publications: z.array(z.strictObject({ operation: z.enum(['jobs.start', 'shell.execute', 'science.admit', 'deferred_continuation']),
    source: ByteRef, failure_precedes_publication: z.literal(true) })).min(4),
  all_reachable_publications_covered: z.literal(true), no_deferred_continuation: z.literal(true), qualification_capture: ByteRef,
}).superRefine((value, ctx) => {
  for (const operation of ['jobs.start', 'shell.execute', 'science.admit', 'deferred_continuation'])
    if (!value.reachable_publications.some(site => site.operation === operation)) ctx.addIssue({ code: 'custom', message: `Unqualified ${operation} publication route` })
  for (const ref of [value.failure_site.source, ...value.reachable_publications.map(site => site.source)])
    if (!value.source_pins.some(pin => equalIdentity(pin.content, ref))) ctx.addIssue({ code: 'custom', message: 'Control flow site lacks its original source pin' })
})
export const NoDispatchQualificationSchema = z.strictObject({ schema_version: z.literal(1), kind: z.literal('no_dispatch_qualification'),
  host_scope: Id, guard: ByteRef, assurance: z.enum(['fixture_verified', 'live_verified']),
  source_pins: SourcePinsSchema, control_flow: ByteRef, qualification_capture: ByteRef,
  complete_prefix_parser_qualified: z.literal(true), original_owner_observation_qualified: z.literal(true),
  exclusive_writer_observation_qualified: z.literal(true), original_no_admission_observation_qualified: z.literal(true),
})
export const NoDispatchRecoveryPolicySchema = z.strictObject({ schema_version: z.literal(1), kind: z.literal('no_dispatch_recovery_policy'),
  authority: AuthorityRef, binding: Binding, host_scope: Id, original_policy: ByteRef,
  original_snapshot: ByteRef, current_snapshot: ByteRef, tuple: NoDispatchTupleSchema,
  guard: ByteRef, qualification: ByteRef, source_pins: SourcePinsSchema,
  review_author_session_id: Id, bounds: Bounds, prerequisites: z.array(ByteRef).min(1),
  decision: z.literal('settle_never_dispatched_coordination'), preserve_consumed_attempts_and_timeout: z.literal(true),
  scientific_completion: z.literal(false), execution_cost_refund: z.literal(false),
})
export const NoDispatchObservationSchema = z.strictObject({ schema_version: z.literal(1), kind: z.literal('no_dispatch_ownership_observation'),
  host_scope: Id, authority: AuthorityRef, current_snapshot: ByteRef, tuple: NoDispatchTupleSchema,
  original_science_policy: SciencePolicySchema.nullable(), original_owner_session_id: Id, original_owner_stopped: z.literal(true),
  current_writer_id: Id, exclusive_current_writer: z.literal(true), no_deferred_continuation: z.literal(true),
  ownership_capture: ByteRef, original_science_capture: ByteRef,
  // State describes this exact target campaign, which never entered original
  // admission. admissions_count counts all original authority history; it does
  // not claim a closed target record or manufacture its scientific checkpoint.
  original_science_before: z.strictObject({ campaign_id: Id, state: z.literal('not_admitted'), admissions_count: Count }),
  original_science_after: z.strictObject({ campaign_id: Id, state: z.literal('not_admitted'), admissions_count: Count }),
  original_admission_for_attempt: z.literal(false), original_admission_delta: z.literal(0),
})
export const NoDispatchProofSchema = z.strictObject({ schema_version: z.literal(1), kind: z.literal('qualified_native_no_dispatch'),
  host_scope: Id, authority: AuthorityRef, binding: Binding, original_policy: ByteRef,
  original_snapshot: ByteRef, current_snapshot: ByteRef, recovery_policy: ByteRef, tuple: NoDispatchTupleSchema,
  guard: ByteRef, qualification: ByteRef, source_pins: SourcePinsSchema, control_flow_qualification: ByteRef,
  actual_tool_call_id: Id, native_prefix: ByteRef, native_prefix_source: ByteRef,
  native_prefix_encoding: z.enum(['canonical_session', 'session_v4_jsonl', 'session_v4_jsonl_zstd']),
  tool_call_capture: ByteRef, tool_result_capture: ByteRef,
  capture_ref: ByteRef, parser_input_sha256: z.string().regex(/^[a-f0-9]{64}$/), parser_source: ByteRef,
  prefix_complete: z.literal(true), tool_result_complete: z.literal(true), observed_unique_error: Id,
  observation: ByteRef, no_dispatch: z.literal(true),
})
export type NoDispatchRecoveryPolicy = z.infer<typeof NoDispatchRecoveryPolicySchema>
export type NoDispatchProof = z.infer<typeof NoDispatchProofSchema>
export interface NoDispatchContext {
  recoveryPolicy: NoDispatchRecoveryPolicy
  recoveryPolicyRef: ArtifactReference
  originalPolicy: DevelopmentPolicy
  originalSnapshot: ResearchState
  currentSnapshot: ResearchState
  manifest: Manifest
}
export interface NoDispatchReviewContext extends NoDispatchContext {
  review: Review
  reviewRef: ArtifactReference
}
export interface NoDispatchReviewObservation {
  session_id: string
  provider: string
  events: readonly SessionEvent[]
}
/** Register this object in trusted host code, separately from the author tool.
 * observe must read existing producer/Session, writer and original science authority
 * services. Empty job/GPU lists and model assertions do not implement this port.
 * qualification and identity are accepted source pins owned by that same host. */
export interface NativeNoDispatchGuard {
  identity: ArtifactReference
  qualification: ArtifactReference
  observe(context: NoDispatchContext, signal: AbortSignal): Promise<ArtifactReference>
}
export interface NoDispatchReconciliationConfig {
  artifacts: ProjectArtifacts
  table: KvTable<string, ResearchState>
  projectKey: string
  originalPolicy: ArtifactReference
  hostScope: string
  guardIdentity: ArtifactReference
  guardQualification: ArtifactReference
  guard: NativeNoDispatchGuard
  /** Mandatory source-accepted host procedure over the exact registered native
   * reviewer Session/service namespace. Read its actual live or retained full
   * prefix; never echo caller-authored completion bytes or metadata labels. */
  observeReview(context: NoDispatchReviewContext, signal: AbortSignal): Promise<NoDispatchReviewObservation>
  /** Must check the existing writer mandate, not create a replacement authority. */
  assertCurrentWriter(context: NoDispatchContext): void | Promise<void>
  timeoutMs: number
}
export const NoDispatchRequestSchema = z.strictObject({ recovery_policy: ByteRef, review: ByteRef, proof: ByteRef.optional() })
export interface NoDispatchAssociation {
  status: 'settled'
  action_id: string
  attempt_id: string
  job_id: null
  evidence: ArtifactReference
  checkpoint: ArtifactReference
  proofRef: ArtifactReference
  replay: boolean
}

const readJson = async (artifacts: ProjectArtifacts, ref: ArtifactReference): Promise<unknown> => JSON.parse(Buffer.from(await artifacts.read(ref)).toString('utf8'))
function fail(message: string): never { throw new Error(`No-dispatch reconciliation refused: ${message}`) }
function tupleFor(action: ActionState) {
  return NoDispatchTupleSchema.parse({ action_id: action.action_id, attempt_id: action.attempt_id, dispatch_token: action.dispatch_token,
    admitted_revision: action.admitted_revision, manifest: action.manifest, review: action.review, review_id: action.review_id,
    owner_session_id: action.owner_session_id, timeout_ms: action.timeout_ms })
}
function assertUnknown(snapshot: ResearchState, policy: NoDispatchRecoveryPolicy) {
  const action = snapshot.actions[policy.tuple.action_id]
  if (!action || !equalIdentity(tupleFor(action), policy.tuple) || !equalIdentity(snapshot.policy, policy.original_policy)
    || !equalIdentity(snapshot.authority, policy.authority) || !equalIdentity(snapshot.binding, policy.binding)) fail('snapshot/action/authority/policy tuple mismatch')
  if (action.phase !== 'unknown' || !action.reservation_active || snapshot.active_action_id !== action.action_id
    || action.job_id !== null || action.runtime_facts !== null || action.evidence !== null || action.checkpoint !== null)
    fail('original action is not unknown, reserved and conclusively without existing native facts')
  if (snapshot.hold?.kind !== 'unknown_execution' || snapshot.hold.owner !== action.owner_session_id
    || !equalIdentity(snapshot.hold.affected, [action.action_id])) fail('unknown execution hold belongs to a different action or owner')
}

// Use actual Session events. Parsed views below retain unknown event fields; raw
// event artifacts and the complete prefix remain the original byte authorities.
const EventSchema = z.object({ type: Id, seq: Count, data: z.record(z.string(), z.unknown()) }).passthrough()
const CaptureSchema = z.object({ session_id: Id, events: z.array(EventSchema).min(1) }).passthrough()
function decodeNativePrefix(bytes: Uint8Array): unknown {
  const raw = Buffer.from(bytes).toString('utf8')
  // Accept the native durable Session v4 JSONL bytes directly. Normalized JSON
  // captures remain useful for public Session observations in disposable tests.
  try { return JSON.parse(raw) } catch {
    const lines = raw.trimEnd().split('\n').map(line => JSON.parse(line))
    const header = z.object({ type: z.literal('session'), version: z.literal(4), id: Id }).passthrough().parse(lines[0])
    return { session_id: header.id, header, events: lines.slice(1) }
  }
}
// Node may return partial output for an incomplete frame. Scan the complete
// standard frame first; skippable frames and unqualified frame types refuse.
function completeZstdFrameLength(bytes: Buffer, start: number): number {
  if (start + 5 > bytes.length || bytes.readUInt32LE(start) !== 0xfd2fb528) fail('original standard Zstandard frame required')
  const descriptor = bytes[start + 4]!
  if (descriptor & 0x18) fail('reserved Zstandard frame header bits are not qualified')
  const single = Boolean(descriptor & 0x20), contentFlag = descriptor >>> 6
  const dictionarySize = [0, 1, 2, 4][descriptor & 3]!
  const contentSize = contentFlag === 0 ? (single ? 1 : 0) : [0, 2, 4, 8][contentFlag]!
  let offset = start + 5 + (single ? 0 : 1) + dictionarySize + contentSize
  if (offset > bytes.length) fail('complete Zstandard frame header required')
  for (;;) {
    if (offset + 3 > bytes.length) fail('complete Zstandard block header required')
    const block = bytes.readUIntLE(offset, 3), kind = (block >>> 1) & 3, size = block >>> 3
    if (kind === 3) fail('reserved Zstandard block type is not qualified')
    offset += 3 + (kind === 1 ? 1 : size)
    if (offset > bytes.length) fail('complete Zstandard block payload required')
    if (block & 1) break
  }
  if (descriptor & 4) offset += 4
  if (offset > bytes.length) fail('complete Zstandard checksum required')
  return offset - start
}
/** Bounded decoder for every standard frame in original native Session bytes.
 * Frame completeness is checked independently of Node's permissive decoder. */
export function decodeCompleteZstd(input: Uint8Array, maximum: number): Buffer {
  if (!Number.isSafeInteger(maximum) || maximum <= 0 || input.byteLength === 0) fail('nonempty Zstandard source and positive native prefix byte bound required')
  const bytes = Buffer.from(input), chunks: Buffer[] = []
  let offset = 0, total = 0
  while (offset < bytes.length) {
    const length = completeZstdFrameLength(bytes, offset)
    // A zero-output frame may follow an exactly exhausted output budget. At
    // most one byte is allowed transiently, then the aggregate bound is checked.
    const decoded = zstdDecompressSync(bytes.subarray(offset, offset + length), {
      info: true, maxOutputLength: Math.max(1, maximum - total),
    }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } }
    const used = decoded.engine.bytesWritten
    if (!Number.isSafeInteger(used) || used <= 0 || used > bytes.length - offset || used !== length)
      fail('complete Zstandard frame consumption and positive progress required')
    total += decoded.buffer.length
    if (total > maximum) fail('complete native prefix aggregate byte bound exceeded')
    chunks.push(decoded.buffer); offset += used
  }
  if (offset !== bytes.length) fail('complete original Zstandard input consumption required')
  return Buffer.concat(chunks, total)
}
function messageText(input: unknown): string {
  const message = z.object({ content: z.array(z.object({ type: Id, text: z.string().optional() }).passthrough()) }).passthrough().parse(input)
  return message.content.filter(block => block.type === 'text').map(block => block.text ?? '').join('')
}
function verifyCompletion(input: unknown, review: Review, recoveryRef: ArtifactReference) {
  const capture = CaptureSchema.extend({ provider: Id }).parse(input)
  if (capture.session_id !== review.reviewer.session_id || capture.provider !== review.reviewer.provider) fail('recovery review producer mismatch')
  if (capture.events.some((event, index) => event.seq !== index)) fail('native recovery review prefix is incomplete or reordered')
  const answer = capture.events.findLast(event => event.type === 'assistant/message')
  const end = capture.events.findLast(event => event.type === 'turn/end')
  if (!answer || !end || end.seq <= answer.seq) fail('actual recovery review completion missing')
  const ended = z.object({ turn: Count, reason: z.object({ kind: Id }).passthrough() }).passthrough().parse(end.data)
  const answered = z.object({ turn: Count, message: z.object({ source: z.object({ kind: Id, provider: Id }).passthrough() }).passthrough() }).passthrough().parse(answer.data)
  if (ended.reason.kind !== 'completed' || ended.turn !== answered.turn || answered.message.source.kind !== 'model'
    || answered.message.source.provider !== review.reviewer.provider) fail('recovery review was not separately completed by its registered model producer')
  const output = z.object({ decision: Id, review_id: Id, request_sha256: Id, recovery_policy_sha256: Id, subject_kind: Id }).passthrough()
    .parse(JSON.parse(messageText(answer.data.message)))
  if (output.decision !== 'approve' || output.subject_kind !== 'contract_revision' || output.review_id !== review.review_id
    || output.request_sha256 !== review.request.sha256 || output.recovery_policy_sha256 !== recoveryRef.sha256) fail('actual review output does not approve this recovery policy/request')
}
async function checkReview(config: NoDispatchReconciliationConfig, ref: ArtifactReference, context: NoDispatchContext, signal: AbortSignal) {
  const { artifacts } = config
  const { recoveryPolicy: policy, recoveryPolicyRef: policyRef, originalPolicy } = context
  const review = ReviewSchema.parse(await readJson(artifacts, ref))
  if (review.subject_kind !== 'contract_revision' || review.status !== 'completed' || review.decision !== 'approve' || review.completion === null
    || review.action_id !== null || review.manifest !== null || review.review_id === policy.tuple.review_id || equalIdentity(ref, policy.tuple.review)
    || !equalIdentity(review.binding, policy.binding) || !equalIdentity(review.subject, policyRef) || !equalIdentity(review.packet, policyRef)
    || !equalIdentity(review.scope.proposal, policyRef) || !equalIdentity(review.scope.bounds, policy.bounds)
    || !equalIdentity(review.scope.prerequisites, policy.prerequisites) || review.author_session_id !== policy.review_author_session_id
    || review.reviewer.session_id === policy.tuple.owner_session_id || review.reviewer.session_id === policy.review_author_session_id
    || !equalIdentity({ session_id: review.reviewer.session_id, provider: review.reviewer.provider, preset: review.reviewer.preset, permissions: review.reviewer.permissions }, originalPolicy.reviewer))
    fail('fresh separate contract_revision approval does not cover the exact recovery policy')
  const request = z.object({ subject_kind: Id, recovery_policy: ByteRef, review_id: Id, author_session_id: Id, reviewer_session_id: Id }).passthrough()
    .parse(await readJson(artifacts, review.request))
  if (request.subject_kind !== 'contract_revision' || !equalIdentity(request.recovery_policy, policyRef) || request.review_id !== review.review_id
    || request.author_session_id !== review.author_session_id || request.reviewer_session_id !== review.reviewer.session_id) fail('recovery review request differs')
  for (const source of [review.packet, review.subject, review.scope.proposal, review.reviewer.preset, review.reviewer.permissions,
    ...review.evidence, ...review.scope.prerequisites, ...(review.checkpoint ? [review.checkpoint] : [])]) await artifacts.read(source)
  const declared = CaptureSchema.extend({ provider: Id }).parse(await readJson(artifacts, review.completion))
  verifyCompletion(declared, review, policyRef)
  // The bound request and declared answer have been checked before consulting
  // the actual registered native reviewer. Neither hashes nor copied IDs make
  // caller-provided completion bytes an authentic native Session observation.
  const observed = CaptureSchema.extend({ provider: Id }).parse(await bounded(
    s => config.observeReview({ ...context, review, reviewRef: ref }, s), config.timeoutMs, signal))
  // Later native turns may append to the same Session. Authenticate the full
  // retained completed prefix, preserving every original event field/order;
  // additional turns cannot replace or invalidate that immutable association.
  const observedPrefix = { session_id: observed.session_id, provider: observed.provider, events: observed.events.slice(0, declared.events.length) }
  if (!equalIdentity({ session_id: declared.session_id, provider: declared.provider, events: declared.events },
    observedPrefix))
    fail('declared recovery review completion differs from the actual registered native Session prefix')
  verifyCompletion(observedPrefix, review, policyRef)
  return review
}
function checkPrefix(prefixInput: unknown, callInput: unknown, resultInput: unknown, proof: NoDispatchProof,
  originalSnapshot: ResearchState) {
  const prefix = CaptureSchema.parse(prefixInput), call = EventSchema.parse(callInput), result = EventSchema.parse(resultInput)
  if (prefix.session_id !== proof.tuple.owner_session_id || prefix.events.some((event, index) => event.seq !== index))
    fail('native prefix owner or ordered event sequence differs')
  if (!prefix.events.some(event => equalIdentity(event, call)) || !prefix.events.some(event => equalIdentity(event, result))
    || call.type !== 'tool/call' || result.type !== 'tool/result' || result.seq <= call.seq) fail('complete original tool call/result prefix missing')
  const args = z.object({ turn: Count, step: Count, callId: Id, name: Id, arguments: z.string() }).passthrough().parse(call.data)
  const returned = z.object({ turn: Count, step: Count, message: z.object({ toolCallId: Id, source: z.object({ kind: Id, callId: Id }).passthrough(),
    isError: z.boolean() }).passthrough() }).passthrough().parse(result.data)
  if (args.callId !== proof.actual_tool_call_id || args.name !== 'research_run' || returned.message.toolCallId !== args.callId
    || returned.message.source.kind !== 'tool' || returned.message.source.callId !== args.callId || returned.turn !== args.turn || returned.step !== args.step
    || prefix.events.filter(event => event.type === 'tool/call' && event.data.callId === args.callId).length !== 1
    || prefix.events.filter(event => event.type === 'tool/result' && z.object({ message: z.object({ toolCallId: Id }).passthrough() }).passthrough().parse(event.data).message.toolCallId === args.callId).length !== 1)
    fail('actual native tool identity/turn is mismatched or duplicated')
  const input = z.object({ manifest: ByteRef, review: ByteRef, expected_revision: Count }).passthrough().parse(JSON.parse(args.arguments))
  if (!equalIdentity(input.manifest, proof.tuple.manifest) || !equalIdentity(input.review, proof.tuple.review)
    || input.expected_revision + 1 !== proof.tuple.admitted_revision) fail('native call did not admit this original tuple')
  const text = messageText(result.data.message)
  if (returned.message.isError) {
    if (!text.includes(proof.observed_unique_error)) fail('actual native refusal error differs from qualified unique failure')
  } else {
    const association = z.object({ status: Id, action_id: Id, attempt_id: Id, job_id: Id.nullable(), evidence: ByteRef.nullable(), checkpoint: ByteRef.nullable(), replay: z.boolean() }).passthrough().parse(JSON.parse(text))
    if (association.status !== 'unknown' || association.action_id !== proof.tuple.action_id || association.attempt_id !== proof.tuple.attempt_id
      || association.job_id !== null || association.evidence !== null || association.checkpoint !== null || association.replay
      || originalSnapshot.hold?.reason !== proof.observed_unique_error) fail('native unknown result and original failure snapshot differ')
  }
  const end = prefix.events.find(event => event.type === 'turn/end' && event.seq > result.seq && event.data.turn === args.turn)
  if (!end || z.object({ reason: z.object({ kind: Id }).passthrough() }).passthrough().parse(end.data).reason.kind !== 'completed')
    fail('complete original native Session turn/end is missing or unresolved')
  const sameActionCalls = prefix.events.filter(event => {
    if (event.type !== 'tool/call' || event.data.name !== 'research_run') return false
    const nativeArgs = z.object({ arguments: z.string() }).passthrough().parse(event.data)
    return z.object({ manifest: ByteRef }).passthrough().parse(JSON.parse(nativeArgs.arguments)).manifest.sha256 === proof.tuple.manifest.sha256
  })
  if (sameActionCalls.length !== 1) fail('complete original prefix has multiple native calls for this frozen action')
  if (!z.object({ sourceEventSeqs: z.array(Count) }).passthrough().parse(result).sourceEventSeqs.includes(call.seq))
    fail('actual native result does not reference its original call event')
}
async function checkProof(artifacts: ProjectArtifacts, proofRef: ArtifactReference, context: NoDispatchContext, config: NoDispatchReconciliationConfig) {
  const proof = NoDispatchProofSchema.parse(await readJson(artifacts, proofRef)), policy = context.recoveryPolicy
  for (const field of ['host_scope', 'authority', 'binding', 'original_policy', 'original_snapshot', 'current_snapshot', 'tuple', 'guard', 'qualification', 'source_pins'] as const)
    if (!equalIdentity(proof[field], policy[field])) fail(`proof ${field} does not match its reviewed recovery policy`)
  if (!equalIdentity(proof.recovery_policy, context.recoveryPolicyRef) || !equalIdentity(proof.guard, config.guardIdentity)
    || !equalIdentity(proof.qualification, config.guardQualification) || proof.parser_input_sha256 !== proof.capture_ref.sha256
    || !equalIdentity(proof.capture_ref, proof.tool_result_capture) || !equalIdentity(proof.parser_source, policy.source_pins.find(pin => pin.role === 'parser')!.content))
    fail('guard, source parser or actual result capture binding mismatch')
  const qualification = NoDispatchQualificationSchema.parse(await readJson(artifacts, proof.qualification))
  if (qualification.host_scope !== config.hostScope || !equalIdentity(qualification.guard, config.guardIdentity)
    || !equalIdentity(qualification.source_pins, policy.source_pins) || !equalIdentity(qualification.control_flow, proof.control_flow_qualification)) fail('original source qualification is not accepted by this host scope')
  const flow = NoDispatchControlFlowSchema.parse(await readJson(artifacts, qualification.control_flow))
  if (flow.host_scope !== config.hostScope || flow.unique_error !== proof.observed_unique_error
    || !equalIdentity(flow.source_pins, policy.source_pins) || context.originalSnapshot.hold?.reason !== flow.unique_error)
    fail('qualified original control flow/unique error differs')
  const observation = NoDispatchObservationSchema.parse(await readJson(artifacts, proof.observation))
  if (observation.host_scope !== config.hostScope || !equalIdentity(observation.authority, policy.authority)
    || !equalIdentity(observation.current_snapshot, policy.current_snapshot) || !equalIdentity(observation.tuple, policy.tuple)
    || observation.original_owner_session_id !== policy.tuple.owner_session_id || observation.current_writer_id !== policy.authority.writer_id
    || !equalIdentity(observation.original_science_before, observation.original_science_after)
    || !equalIdentity(observation.original_science_policy, context.originalPolicy.gpu?.purpose === 'C_science' ? context.originalPolicy.gpu.science : null))
    fail('exclusive writer/original owner/no original scientific admission observation differs')
  for (const ref of [proof.guard, proof.original_policy, proof.original_snapshot, proof.current_snapshot, proof.recovery_policy,
    ...proof.source_pins.map(pin => pin.content), qualification.qualification_capture, flow.qualification_capture,
    observation.ownership_capture, observation.original_science_capture,
    ...(observation.original_science_policy ? [observation.original_science_policy.envelope, observation.original_science_policy.guard,
      observation.original_science_policy.authority.registration] : [])]) await artifacts.read(ref)
  const sourceBytes = await artifacts.read(proof.native_prefix_source)
  const plainBytes = proof.native_prefix_encoding === 'session_v4_jsonl_zstd'
    ? decodeCompleteZstd(sourceBytes, artifacts.maxReadBytes) : sourceBytes
  const sourcePrefix = CaptureSchema.parse(proof.native_prefix_encoding === 'canonical_session'
    ? JSON.parse(Buffer.from(sourceBytes).toString('utf8'))
    : decodeNativePrefix(plainBytes))
  if (proof.native_prefix_encoding !== 'canonical_session' && !sourcePrefix.header) fail('original native Session JSONL header missing')
  const prefix = CaptureSchema.parse(decodeNativePrefix(await artifacts.read(proof.native_prefix)))
  if (sourcePrefix.session_id !== prefix.session_id || !equalIdentity(sourcePrefix.events, prefix.events)
    || (sourcePrefix.header && !equalIdentity(sourcePrefix.header, prefix.header))) fail('complete native prefix differs from original raw Session source bytes')
  if (prefix.original_compressed_source && !equalIdentity(ByteRef.parse(prefix.original_compressed_source), proof.native_prefix_source))
    fail('normalized original compressed source reference differs')
  if (prefix.original_plain_sha256 && prefix.original_plain_sha256 !== sha256(plainBytes)) fail('normalized original plain source hash differs')
  if (prefix.row_count_including_header !== undefined && prefix.row_count_including_header !== sourcePrefix.events.length + 1)
    fail('normalized original Session row count differs')
  checkPrefix(prefix, await readJson(artifacts, proof.tool_call_capture), await readJson(artifacts, proof.tool_result_capture), proof, context.originalSnapshot)
  await artifacts.read(proof.capture_ref)
  return proof
}
async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, milliseconds: number, parent: AbortSignal): Promise<T> {
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > 60000) fail('guard needs an explicit deadline of at most 60000ms')
  parent.throwIfAborted()
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let rejectDeadline: (reason: unknown) => void = () => {}
  const abort = () => { controller.abort(parent.reason); rejectDeadline(parent.reason) }
  try {
    const deadline = new Promise<never>((_, reject) => {
      rejectDeadline = reject
      parent.addEventListener('abort', abort, { once: true })
      timer = setTimeout(() => { const error = new Error('No-dispatch guard deadline'); controller.abort(error); reject(error) }, milliseconds)
    })
    return await Promise.race([operation(controller.signal), deadline])
  } finally { if (timer) clearTimeout(timer); parent.removeEventListener('abort', abort) }
}
function association(action: ActionState, proofRef: ArtifactReference, replay: boolean): NoDispatchAssociation {
  if (action.phase !== 'settled' || action.reservation_active || action.job_id !== null || action.evidence === null || action.checkpoint === null)
    fail('retained settlement association is incomplete')
  return { status: 'settled', action_id: action.action_id, attempt_id: action.attempt_id, job_id: null,
    evidence: action.evidence, checkpoint: action.checkpoint, proofRef, replay }
}

/** Public serialized KV update; this never dispatches a job, resolves process
 * metrics, refunds consumed allowance, or registers new scientific authority. */
export async function reconcileNoDispatch(config: NoDispatchReconciliationConfig, input: unknown, signal: AbortSignal): Promise<NoDispatchAssociation> {
  const request = NoDispatchRequestSchema.parse(input)
  if (!config.guard || !equalIdentity(config.guard.identity, config.guardIdentity) || !equalIdentity(config.guard.qualification, config.guardQualification))
    fail('separate host-registered guard identity and qualification are required')
  if (typeof config.observeReview !== 'function') fail('mandatory host-registered native review observation procedure is required')
  const policy = NoDispatchRecoveryPolicySchema.parse(await readJson(config.artifacts, request.recovery_policy))
  if (policy.host_scope !== config.hostScope || policy.authority.project_root !== config.artifacts.root
    || !equalIdentity(policy.guard, config.guardIdentity) || !equalIdentity(policy.qualification, config.guardQualification)
    || !equalIdentity(policy.original_policy, config.originalPolicy) || !equalIdentity(policy.authority, policy.binding.authority)) fail('registered host scope/recovery policy mismatch')
  const originalPolicy = DevelopmentPolicySchema.parse(await readJson(config.artifacts, config.originalPolicy))
  if (!equalIdentity(originalPolicy.authority, policy.authority) || !equalIdentity(originalPolicy.binding, policy.binding)) fail('original policy/authority differs')
  const originalSnapshot = ResearchStateSchema.parse(await readJson(config.artifacts, policy.original_snapshot))
  const currentSnapshot = ResearchStateSchema.parse(await readJson(config.artifacts, policy.current_snapshot))
  assertUnknown(originalSnapshot, policy); assertUnknown(currentSnapshot, policy)
  const manifest = await loadManifest(policy.tuple.manifest, config.artifacts)
  if (!equalIdentity(manifest.binding, policy.binding) || manifest.action_id !== policy.tuple.action_id
    || manifest.author_session_id !== policy.tuple.owner_session_id || manifest.bounds.timeout_ms !== policy.tuple.timeout_ms) fail('original frozen manifest differs')
  await verifyIdentity(manifest, config.artifacts)
  for (const ref of [policy.authority.registration, policy.bounds.resource_policy, ...policy.prerequisites, policy.tuple.review]) await config.artifacts.read(ref)
  const context: NoDispatchContext = { recoveryPolicy: policy, recoveryPolicyRef: request.recovery_policy, originalPolicy, originalSnapshot, currentSnapshot, manifest }
  await checkReview(config, request.review, context, signal)
  const current = ResearchStateSchema.parse(config.table.get(config.projectKey) ?? fail('registered project state missing'))
  const old = current.actions[policy.tuple.action_id]
  // Replays verify the same retained proof and review association; a different
  // guard observation may never overwrite or release the original settlement.
  if (old?.phase === 'settled') {
    if (!equalIdentity(tupleFor(old), policy.tuple) || old.runtime_facts !== null || old.evidence === null || old.checkpoint === null
      || !equalIdentity(current.authority, policy.authority) || !equalIdentity(current.binding, policy.binding) || !equalIdentity(current.policy, policy.original_policy)) fail('settled replay identity differs')
    const evidence = EvidenceSchema.parse(await readJson(config.artifacts, old.evidence))
    const checkpoint = z.object({ reviews: z.array(ByteRef), evidence: z.array(ByteRef) }).passthrough().parse(await readJson(config.artifacts, old.checkpoint))
    if (!evidence.terminal.settlement || evidence.terminal.raw_status !== 'raw_pre_dispatch_refusal' || evidence.scientific_status !== 'ineligible'
      || !checkpoint.reviews.some(ref => equalIdentity(ref, request.review)) || (request.proof && !equalIdentity(request.proof, evidence.terminal.settlement))) fail('replay differs from retained proof or separate recovery review')
    await checkProof(config.artifacts, evidence.terminal.settlement, context, config)
    if (!equalIdentity(config.table.get(config.projectKey), current)) fail('concurrent serialized state changed during retained settlement replay')
    return association(old, evidence.terminal.settlement, true)
  }
  if (!equalIdentity(current, currentSnapshot)) fail('current serialized state differs from reviewed snapshot')
  const proofRef = await bounded(s => config.guard.observe(context, s), config.timeoutMs, signal)
  if (request.proof && !equalIdentity(request.proof, proofRef)) fail('requested proof was not verified and returned by the registered host guard')
  const proof = await checkProof(config.artifacts, proofRef, context, config)
  await bounded(async () => config.assertCurrentWriter(context), config.timeoutMs, signal)
  signal.throwIfAborted()
  const remaining = { consumed_attempts: current.consumed_attempts, reserved_timeout_ms: current.reserved_timeout_ms - policy.tuple.timeout_ms,
    costs: [{ execution_id: proof.actual_tool_call_id, purpose: 'C_run' as const, unit: 'process_elapsed_seconds', amount: null,
      source: null, unresolved_reason: 'No native process was dispatched; process elapsed cost is unavailable. Coordination reservation settlement is not an execution cost refund.' }] }
  const evidence: Evidence = EvidenceSchema.parse({ schema_version: 1, kind: 'evidence', binding: policy.binding,
    action_id: policy.tuple.action_id, attempt_id: policy.tuple.attempt_id, manifest: policy.tuple.manifest,
    admission: { authority_id: policy.authority.authority_id, committed_revision: policy.tuple.admitted_revision, acknowledgement: policy.original_snapshot,
      action_id: policy.tuple.action_id, attempt_id: policy.tuple.attempt_id, manifest_sha256: policy.tuple.manifest.sha256 },
    native: { owner_session_id: policy.tuple.owner_session_id, producer: 'qualified_original_native_tool_result', job_id: null, tool_call_id: proof.actual_tool_call_id },
    terminal: { status: 'unknown', raw_status: 'raw_pre_dispatch_refusal', exit_code: null, signal: null, timeout: false, abort: false,
      ownership_resolved: true, settlement: proofRef },
    identity: { expected: policy.tuple.manifest, before: null, after: null, matches: false },
    capture: { artifact: proof.capture_ref, complete: false, overflow: false, parser_input_sha256: proof.parser_input_sha256 },
    output_schema: manifest.output, result: {}, verifier: { identity: manifest.evaluator.verifier, result: null, verdict: 'unavailable' },
    evidence_status: 'invalid', scientific_status: 'ineligible', costs: remaining.costs, remaining })
  const directory = `local_artifacts/autoresearch/dsh/${manifest.goal.id}/no-dispatch/${proofRef.sha256}`
  const evidenceRef = await config.artifacts.writeOnce(`${directory}/evidence.json`, Buffer.from(canonicalJson(evidence)))
  const checkpoint = checkpointFor(manifest, evidence, evidenceRef, { ...current, reserved_timeout_ms: remaining.reserved_timeout_ms }, request.review)
  checkpoint.reviews = [policy.tuple.review, request.review]
  checkpoint.evidence = [evidenceRef, policy.original_snapshot, proofRef]
  checkpoint.rationale = 'Qualified original native tool refusal occurred before every reachable publication. Settle coordination reservation only; preserve consumed allowance, original unknown facts and unavailable scientific output.'
  checkpoint.uncertainty = ['Scientific output and process metrics are unavailable; no execution cost amount is inferred', 'A successor requires its own fresh review and admission']
  const checkpointRef = await config.artifacts.writeOnce(`${directory}/checkpoint.json`, Buffer.from(canonicalJson(checkpoint)))
  signal.throwIfAborted()
  await bounded(async () => config.assertCurrentWriter(context), config.timeoutMs, signal)
  signal.throwIfAborted()
  let replay = false
  const committed = await config.table.update(config.projectKey, latest => {
    ResearchStateSchema.parse(latest)
    const action = latest.actions[policy.tuple.action_id]
    if (action?.phase === 'settled' && equalIdentity(action.evidence, evidenceRef) && equalIdentity(action.checkpoint, checkpointRef)
      && equalIdentity(tupleFor(action), policy.tuple) && equalIdentity(latest.authority, policy.authority)
      && equalIdentity(latest.binding, policy.binding) && equalIdentity(latest.policy, policy.original_policy)) { replay = true; return latest }
    if (!equalIdentity(latest, currentSnapshot)) fail('concurrent state/writer/policy/action change at atomic CAS')
    assertUnknown(latest, policy)
    return ResearchStateSchema.parse({ ...latest, revision: latest.revision + 1, active_action_id: null, hold: null,
      reserved_timeout_ms: latest.reserved_timeout_ms - policy.tuple.timeout_ms,
      actions: { ...latest.actions, [policy.tuple.action_id]: { ...action!, phase: 'settled', reservation_active: false, evidence: evidenceRef, checkpoint: checkpointRef } } })
  })
  return association(committed.actions[policy.tuple.action_id]!, proofRef, replay)
}
