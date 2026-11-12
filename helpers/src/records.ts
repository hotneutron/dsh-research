import { z } from 'zod'
import { isAbsolute } from 'node:path'

// These are public encodings. A parsed record is not provider qualification or authorization.
export const Id = z.string().min(1).refine(value => value.trim().length > 0, 'Identifier must not be blank')
export const Sha256 = z.string().regex(/^[a-f0-9]{64}$/)
export const Count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const Amount = z.number().nonnegative().finite()
export const Assurance = z.enum(['specified', 'implemented', 'fixture_verified', 'live_verified', 'disabled'])
export const Decision = z.enum(['continue', 'diagnose', 'pivot', 'defer', 'stop'])
export const ByteRef = z.strictObject({ uri: Id, sha256: Sha256, size_bytes: Count })
export const ContractRef = z.strictObject({
  id: z.literal('dsh-research/research-loop'), version: Id, artifact: ByteRef,
})
export const CompatibilityRowRef = z.strictObject({
  register: ByteRef, contract_version: Id, row_id: Id, row_sha256: Sha256, table_sha256: Sha256,
})
export const AuthorityRef = z.strictObject({
  project_id: Id, project_root: Id.refine(isAbsolute, 'Canonical project root must be absolute'), authority_id: Id, registration: ByteRef, writer_id: Id,
})
export const ReleasePin = z.strictObject({ name: Id, version: Id, content: ByteRef })
export const ProfileRef = z.strictObject({
  revision: Id, effective: ByteRef, lock: ByteRef, releases: z.array(ReleasePin).min(1),
  confirmation: z.literal('off'), // Enabled confirmation has no qualified M1 encoding/provider route.
  assurance: Assurance,
})
export const Binding = z.strictObject({
  contract_ref: ContractRef, compatibility_row_ref: CompatibilityRowRef,
  authority: AuthorityRef, profile: ProfileRef,
})
export const Cost = z.strictObject({
  execution_id: Id, purpose: z.enum(['C_run', 'C_qual', 'C_science']), unit: Id,
  amount: Amount.nullable(), source: ByteRef.nullable(), unresolved_reason: Id.nullable(),
}).superRefine((value, ctx) => {
  if (value.amount === null && value.unresolved_reason === null)
    ctx.addIssue({ code: 'custom', message: 'Unknown cost needs an unresolved reason' })
  if (value.amount !== null && value.source === null)
    ctx.addIssue({ code: 'custom', message: 'Observed cost needs a source; missing cost is not zero' })
})
export const Bounds = z.strictObject({
  timeout_ms: Count.positive(), max_attempts: Count.positive(), timeout_reservation_ms: Count.positive(),
  concurrency: z.literal(1), resource_policy: ByteRef,
})
export const Balance = z.strictObject({
  consumed_attempts: Count, reserved_timeout_ms: Count, costs: z.array(Cost),
})
export const Hold = z.strictObject({
  kind: z.enum(['review_unavailable', 'unknown_execution', 'qualification', 'authority', 'other']),
  owner: Id, reason: Id, evidence: z.array(ByteRef), affected: z.array(Id).min(1),
  exit_condition: Id, next_check: Id, reassess_at: z.iso.datetime({ offset: true }),
})
export const OutputSchema = z.strictObject({
  schema: ByteRef, required_fields: z.record(Id, z.enum(['finite_number', 'string', 'boolean'])),
  additional_fields: z.literal(false),
})
export const Proposal = z.strictObject({
  decision: Decision, operation: Id, prerequisites: z.array(ByteRef),
  retry: z.strictObject({ parent_action_id: Id, parent_failure: ByteRef, recovery_policy: ByteRef }).nullable(),
})
export const ManifestSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('manifest'), action_id: Id, binding: Binding,
  author_session_id: Id, original_prompt: z.string().min(1),
  goal: z.strictObject({ id: Id, revision: Id, context: ByteRef, checkpoint: ByteRef.nullable() }),
  plan: z.strictObject({ revision: Id, snapshot: ByteRef, purpose: z.enum(['deliberate', 'explorative']) }),
  architecture: ByteRef,
  candidate: z.strictObject({
    commit: Id, tree: ByteRef, configuration: ByteRef,
    snapshot_kind: z.enum(['clean_tree', 'content_snapshot']),
    content_inventory: ByteRef, // Includes relevant untracked files, modes and submodules.
  }),
  evaluator: z.strictObject({ verifier: ByteRef, interpreter: ByteRef, environment: ByteRef }),
  inputs: z.array(z.strictObject({
    artifact: ByteRef, version: Id, split: Id, purpose: Id, access: z.literal('released'),
  })),
  invocation: z.strictObject({ executable: Id, argv: z.array(z.string()), cwd: Id, env: z.record(Id, z.string()) }),
  bounds: Bounds, output: OutputSchema, domain_policy: ByteRef, proposal: Proposal,
})

export const AdmissionProof = z.strictObject({
  authority_id: Id, committed_revision: Count.positive(), acknowledgement: ByteRef,
  action_id: Id, attempt_id: Id, manifest_sha256: Sha256,
})
export const EvidenceSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('evidence'), binding: Binding,
  action_id: Id, attempt_id: Id, manifest: ByteRef, admission: AdmissionProof,
  native: z.strictObject({ owner_session_id: Id, producer: Id, job_id: Id.nullable(), tool_call_id: Id.nullable() }),
  terminal: z.strictObject({
    status: z.enum(['completed', 'timed_out', 'cancelled', 'crashed', 'unknown']), raw_status: Id,
    exit_code: z.number().int().nullable(), signal: Id.nullable(), timeout: z.boolean(), abort: z.boolean(),
    ownership_resolved: z.boolean(), settlement: ByteRef.nullable(),
  }),
  identity: z.strictObject({ expected: ByteRef, before: ByteRef.nullable(), after: ByteRef.nullable(), matches: z.boolean() }),
  capture: z.strictObject({ artifact: ByteRef, complete: z.boolean(), overflow: z.boolean(), parser_input_sha256: Sha256 }),
  output_schema: OutputSchema,
  result: z.record(Id, z.union([z.number().finite(), z.string(), z.boolean()])),
  verifier: z.strictObject({ identity: ByteRef, result: ByteRef.nullable(), verdict: z.enum(['positive', 'negative', 'inconclusive', 'unavailable']) }),
  evidence_status: z.enum(['valid', 'invalid', 'unresolved']), scientific_status: z.enum(['eligible', 'ineligible', 'unresolved']),
  costs: z.array(Cost), remaining: Balance,
}).superRefine((v, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (v.action_id !== v.admission.action_id || v.attempt_id !== v.admission.attempt_id
    || v.manifest.sha256 !== v.admission.manifest_sha256) reject('Admission subject does not match evidence')
  if (v.native.job_id === null && v.native.tool_call_id === null) reject('Evidence needs a native job or tool-call identity')
  if (v.capture.parser_input_sha256 !== v.capture.artifact.sha256) reject('Parser and capture hashes differ')
  const complete = v.capture.complete && !v.capture.overflow
  if (v.evidence_status === 'valid' && (!complete || !v.identity.matches)) reject('Incomplete or drifted evidence cannot be valid')
  if (v.evidence_status === 'valid' && (v.identity.before?.sha256 !== v.identity.expected.sha256
    || v.identity.after?.sha256 !== v.identity.expected.sha256)) reject('Observed identity differs from the frozen subject')
  if (v.evidence_status === 'valid') {
    const fields = v.output_schema.required_fields
    for (const [key, type] of Object.entries(fields)) {
      const value = v.result[key]
      if (type === 'finite_number' ? typeof value !== 'number' || !Number.isFinite(value) : typeof value !== type)
        reject(`Result field ${key} violates the frozen output schema`)
    }
    for (const key of Object.keys(v.result)) if (!Object.hasOwn(fields, key)) reject(`Undeclared result field ${key}`)
  }
  if (v.scientific_status === 'eligible') {
    if (v.evidence_status !== 'valid' || v.terminal.status !== 'completed' || v.terminal.exit_code !== 0
      || v.terminal.timeout || v.terminal.abort || v.terminal.signal !== null || !v.terminal.ownership_resolved
      || v.terminal.settlement === null || v.identity.before === null || v.identity.after === null
      || v.verifier.result === null || v.verifier.verdict === 'unavailable') reject('Scientific eligibility lacks normal completion or verified evidence')
  }
})

export const ReviewSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('review'), binding: Binding, review_id: Id,
  subject_kind: z.enum(['scientific_action', 'architecture_entry', 'contract_revision']),
  request: ByteRef, packet: ByteRef, subject: ByteRef, manifest: ByteRef.nullable(), checkpoint: ByteRef.nullable(),
  action_id: Id.nullable(), author_session_id: Id,
  reviewer: z.strictObject({ session_id: Id, provider: Id, preset: ByteRef, permissions: ByteRef, assurance: Assurance }),
  completion: ByteRef.nullable(), status: z.enum(['completed', 'unavailable', 'unresolved']),
  decision: z.enum(['approve', 'request_changes', 'defer']), reason: Id, evidence: z.array(ByteRef),
  scope: z.strictObject({ consumable_once: z.literal(true), proposal: ByteRef, bounds: Bounds, prerequisites: z.array(ByteRef) }),
  hold: Hold.nullable(),
}).superRefine((v, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (v.status === 'completed' && v.completion === null) reject('Completed review needs its actual completion receipt')
  if (v.decision === 'approve' && (v.status !== 'completed' || v.author_session_id === v.reviewer.session_id))
    reject('Approval requires a completed separate reviewer')
  if (v.status !== 'completed' && (v.decision !== 'defer' || v.hold === null)) reject('Unavailable review must defer into an owned hold')
  if (v.subject_kind === 'scientific_action' && (v.action_id === null || v.manifest === null)) reject('Scientific review needs its exact action and manifest')
})

export const CheckpointSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('checkpoint'), binding: Binding, checkpoint_id: Id,
  goal_id: Id, question: Id, hypothesis: Id, alternative: Id,
  evidence_status: z.enum(['valid', 'invalid', 'unresolved']),
  scientific_outcome: z.enum(['positive', 'negative', 'inconclusive', 'unavailable']),
  rationale: Id, uncertainty: z.array(Id), evidence: z.array(ByteRef), reviews: z.array(ByteRef),
  balance: Balance, stopped: z.boolean(), decision: Decision, next_action: ByteRef.nullable(), hold: Hold.nullable(),
  feedback: z.array(z.strictObject({ source: ByteRef, disposition: Id, effect: ByteRef.nullable(), status: z.enum(['pending', 'executed', 'failed', 'not_adopted']) })),
  exhaustion: z.strictObject({ scope: ByteRef, alternatives: z.array(ByteRef).min(1), rebrainstorm: ByteRef, separate_review: ByteRef }).nullable(),
}).superRefine((v, ctx) => {
  if (['continue', 'diagnose', 'pivot'].includes(v.decision) && (v.stopped || v.hold !== null || v.next_action === null))
    ctx.addIssue({ code: 'custom', message: 'Continuation needs a successor with no stop or unresolved hold' })
  for (const f of v.feedback) if (f.status === 'executed' && f.effect === null)
    ctx.addIssue({ code: 'custom', message: 'Executed feedback needs its actual effect receipt' })
})

export const QualificationSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('qualification'), binding: Binding, scope: ByteRef,
  qualification_budget_ref: ByteRef, envelope_ref: ByteRef.nullable(),
  required_cells: z.array(Id).min(1), observations: z.array(z.strictObject({
    cell_id: Id, expected: Id, observed: Id, result: z.enum(['pass', 'fail', 'unresolved']), evidence: ByteRef,
  })),
  costs: z.array(Cost), review: ByteRef.nullable(),
})

export type Manifest = z.infer<typeof ManifestSchema>
export type Evidence = z.infer<typeof EvidenceSchema>
export type Review = z.infer<typeof ReviewSchema>
export type Checkpoint = z.infer<typeof CheckpointSchema>
export type BoundIdentity = z.infer<typeof Binding>
export type ArtifactReference = z.infer<typeof ByteRef>
