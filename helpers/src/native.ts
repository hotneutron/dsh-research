import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { z } from 'zod'
import type { Context } from '@deepseek-ai/cordis'
import { Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { JobOutcome } from '@deepseek-ai/dsh-jobs'
import type { ShellExecSpec, ShellExecution, ShellRunResult, ShellExecutor } from '@deepseek-ai/dsh-shell'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-query'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { ByteRef, Count, ReviewSchema, EvidenceSchema } from './records.js'
import type { ArtifactReference, Evidence, Manifest, Review } from './records.js'
import { canonicalJson, sha256 } from './bindings.js'
import { ProjectArtifacts, loadManifest, verifyIdentity } from './manifest.js'
import { ResearchStateSchema, Version3ResearchStateSchema, Version4ResearchStateSchema, DevelopmentPolicySchema, ActionStateSchema, equalIdentity, reserveAction, updateAction, assertApprovedReview } from './admission.js'
import type { ResearchState, DevelopmentPolicy } from './admission.js'
import { checkCapture } from './evaluate.js'
import { checkpointFor } from './loop.js'
import { checkGpuPreflight, checkGpuSettlement } from './gpu.js'
import type { NativeGpuGuard } from './gpu.js'
import { checkSciencePreflight, checkScienceSettlement, ScienceSettlementSchema } from './science.js'
import type { NativeScienceGuard } from './science.js'
import { checkRecoveryPreflight } from './recovery.js'
import type { NativeRecoveryGuard, RecoveryPreflight } from './recovery.js'
import { assertInvocation } from './execution.js'

export const researchDomain = defineDomain({ name: 'dsh_research_admission', version: 3, tables: { projects: domainTable<string, ResearchState>(Version3ResearchStateSchema) } })
export const productionResearchDomain = defineDomain({ name: 'dsh_research_admission', version: 4, tables: { projects: domainTable<string, ResearchState>(Version4ResearchStateSchema) } })
export const RunActionSchema = z.strictObject({ manifest: ByteRef, review: ByteRef, expected_revision: Count })
export interface NativeResearchConfig {
  artifacts: ProjectArtifacts
  table: KvTable<string, ResearchState>
  projectKey: string
  policy: ArtifactReference
  authorSessionId: string
  authorTools?: readonly string[]
  /** Host-selected existing shell, e.g. the default worker's scoped shell. */
  executionShell?: ShellExecutor
  /** Existing host-owned Session policy, bound to the immutable effective profile. */
  executionSandbox?: {
    profile: ArtifactReference
    resolve: () => NonNullable<ReturnType<ShellExecutor['resolve']>['sandboxPolicy']>
  }
  /** Existing host authority check, e.g. current Ticket mandate and operator pause. Rechecked before dispatch. */
  assertActiveAuthority?: (owner: Agent) => void | Promise<void>
  /** Existing project domain verifier; its pinned code supplies scientific meaning. */
  verifier: { identity: ArtifactReference; verify(result: Record<string, number | string | boolean>): Promise<'positive' | 'negative' | 'inconclusive'> }
  gpu?: NativeGpuGuard
  science?: NativeScienceGuard
  /** Host-qualified recovery for a fresh, reviewed replacement; never another launch of its parent. */
  recovery?: NativeRecoveryGuard
  observe?: (event: string, detail: unknown) => void
  /** Existing native wakeup over a settled action; it cannot change the action's validity. */
  afterSettlement?: (association: RunAssociation, owner: Agent, signal: AbortSignal) => Promise<void>
}
export interface RunAssociation {
  status: 'settled' | 'held' | 'running' | 'admitted' | 'dispatching' | 'unknown'
  action_id: string
  attempt_id: string
  job_id: string | null
  evidence: ArtifactReference | null
  checkpoint: ArtifactReference | null
  replay: boolean
}
export interface ResearchToolRegistration {
  /** Agent-local tools coexist with a host's inherited-tool masks without weakening its guards. */
  toolScope?: 'host' | 'author'
  /** In author-local mode, retain only these explicitly named inherited capabilities (default: none). */
  inheritedTools?: readonly string[]
}
class ReviewUnavailable extends Error {}
async function boundedGuard<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let rejectWait: (reason: unknown) => void = () => {}
  const aborted = () => { controller.abort(parent?.reason); rejectWait(parent?.reason ?? new Error('GPU guard aborted')) }
  try {
    if (parent?.aborted) throw parent.reason
    const deadline = new Promise<never>((_, reject) => {
      rejectWait = reject
      timer = setTimeout(() => { const error = new Error('GPU guard deadline'); controller.abort(error); reject(error) }, timeoutMs)
      parent?.addEventListener('abort', aborted, { once: true })
    })
    return await Promise.race([operation(controller.signal), deadline])
  } finally { if (timer) clearTimeout(timer); parent?.removeEventListener('abort', aborted) }
}

/** POSIX shell literals for the exact argv; no model-supplied shell program is accepted. */
export const shellLiteral = (value: string): string => `'${value.replace(/'/g, `'"'"'`)}'`

function freezeExecutionValue<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeExecutionValue(child)
    Object.freeze(value)
  }
  return value
}
const executionIdentity = (spec: ShellExecSpec) => ({ command: spec.command, workdir: spec.workdir, timeoutMs: spec.timeoutMs,
  onExpiry: spec.onExpiry, stdoutMaxBytes: spec.stdoutMaxBytes, stdin: spec.stdin ?? null,
  env: spec.env ?? null, dshEnv: spec.dshEnv ?? null, sandboxPolicy: spec.sandboxPolicy ?? null })
// Cordis traces a service through a fresh proxy on each context read; its provider tracker is stable.
const shellIdentity = (shell: ShellExecutor): unknown => Reflect.get(shell, Service.tracker) ?? shell

export class NativeResearchAdapter {
  private constructor(private readonly ctx: Context, private readonly config: NativeResearchConfig, readonly policy: DevelopmentPolicy) {}
  static async open(ctx: Context, config: NativeResearchConfig): Promise<NativeResearchAdapter> {
    const policy = DevelopmentPolicySchema.parse(JSON.parse(Buffer.from(await config.artifacts.read(config.policy)).toString('utf8')))
    const state = config.table.get(config.projectKey)
    if (!state) throw new Error('Registered project state is required; never initialize a new authority implicitly')
    ResearchStateSchema.parse(state)
    if (policy.authority.project_root !== config.artifacts.root || !equalIdentity(state.authority, policy.authority)
      || !equalIdentity(state.binding, policy.binding) || !equalIdentity(state.policy, config.policy)
      || !equalIdentity(config.verifier.identity, policy.verifier)) throw new Error('Project state/provider/profile registration mismatch')
    if (policy.gpu && (!config.gpu || !equalIdentity(config.gpu.identity, policy.gpu.guard))) throw new Error('Exact host-registered GPU guard is required')
    if (!policy.gpu && config.gpu) throw new Error('Synthetic scope cannot borrow a GPU guard')
    if (policy.gpu?.purpose === 'C_science') {
      if (!config.science || !equalIdentity(config.science.identity, policy.gpu.science.guard))
        throw new Error('Exact host-registered original scientific authority guard is required')
      if (policy.gpu.science.authority.project_root !== config.artifacts.root
        || policy.gpu.science.authority.project_id !== policy.authority.project_id)
        throw new Error('Scientific authority must belong to the same canonical project')
    } else if (config.science) throw new Error('Qualification scope cannot borrow scientific authority')
    return new NativeResearchAdapter(ctx, { ...config, artifacts: config.artifacts.withReadPrefixes(policy.allowed_read_prefixes) }, policy)
  }
  private observe(event: string, detail: unknown): void {
    // Optional diagnostics cannot change committed execution/settlement semantics.
    try { this.config.observe?.(event, detail) } catch {}
  }
  private association(actionId: string, replay: boolean): RunAssociation {
    const action = this.config.table.get(this.config.projectKey)?.actions[actionId]
    if (!action) throw new Error('Action association is unavailable')
    return { status: action.phase, action_id: action.action_id, attempt_id: action.attempt_id, job_id: action.job_id,
      evidence: action.evidence, checkpoint: action.checkpoint, replay }
  }
  private async resolveExecution(manifest: Manifest, owner: Agent, signal: AbortSignal) {
    const command = [manifest.invocation.executable, ...manifest.invocation.argv].map(shellLiteral).join(' ')
    const shell = this.config.executionShell ?? this.ctx.shell
    let sandboxPolicy: NonNullable<ShellExecSpec['sandboxPolicy']> | undefined
    if (this.config.executionSandbox) {
      if (!equalIdentity(this.config.executionSandbox.profile, manifest.binding.profile.effective)) throw new Error('Sandbox profile identity differs')
      const profile = JSON.parse(Buffer.from(await this.config.artifacts.read(this.config.executionSandbox.profile)).toString())
      sandboxPolicy = freezeExecutionValue(structuredClone(this.config.executionSandbox.resolve()))
      if (!equalIdentity(profile.execution_sandbox, sandboxPolicy)) throw new Error('Session sandbox policy differs from the frozen host profile')
      if (sandboxPolicy.mode !== 'read-only' && sandboxPolicy.mode !== 'workspace-write') throw new Error('Sandbox mode has no qualified research route')
      if (sandboxPolicy.sessionId !== owner.id) throw new Error('Sandbox policy belongs to another Session')
      const workspaceRoot = resolve(sandboxPolicy.workspaceRoot)
      if (sandboxPolicy.mode === 'workspace-write' && workspaceRoot !== this.config.artifacts.root
        && !workspaceRoot.startsWith(this.config.artifacts.root + '/')) throw new Error('Sandbox writable root must belong to the canonical project')
    }
    signal.throwIfAborted()
    const resolved = shell.resolve({ command, workdir: manifest.invocation.cwd, timeoutMs: manifest.bounds.timeout_ms,
      onExpiry: 'kill', stdoutMaxBytes: this.policy.max_output_bytes, env: freezeExecutionValue({ ...manifest.invocation.env }), signal,
      ...(sandboxPolicy ? { sandboxPolicy } : {}) })
    if (resolved.command !== command || resolve(resolved.workdir) !== resolve(manifest.invocation.cwd) || resolved.onExpiry !== 'kill'
      || resolved.timeoutMs !== manifest.bounds.timeout_ms) throw new Error('Resolved shell spec differs from the frozen invocation/deadline')
    if (resolved.stdoutMaxBytes !== this.policy.max_output_bytes || resolved.signal !== signal || resolved.stdin !== undefined
      || !equalIdentity(resolved.env ?? {}, manifest.invocation.env)) throw new Error('Resolved shell spec differs from the frozen output/environment/cancellation bounds')
    if (sandboxPolicy && !equalIdentity(resolved.sandboxPolicy, sandboxPolicy)) throw new Error('Resolved shell sandbox policy differs')
    // Detach all mutable executor-owned values, retaining the caller's live cancellation signal.
    const spec = Object.freeze({ ...resolved,
      ...(resolved.env ? { env: freezeExecutionValue(structuredClone(resolved.env)) } : {}),
      ...(resolved.dshEnv ? { dshEnv: freezeExecutionValue(structuredClone(resolved.dshEnv)) } : {}),
      ...(resolved.sandboxPolicy ? { sandboxPolicy: freezeExecutionValue(structuredClone(resolved.sandboxPolicy)) } : {}) })
    return { shell, spec }
  }
  private assertExecutionCurrent(execution: { shell: ShellExecutor; spec: ShellExecSpec }, manifest: Manifest, signal: AbortSignal,
    stage: 'before admission' | 'after admission acknowledgement'): void {
    if (shellIdentity(this.config.executionShell ?? this.ctx.shell) !== shellIdentity(execution.shell)) throw new Error(`Execution shell changed ${stage}`)
    if (this.config.executionSandbox && (!equalIdentity(this.config.executionSandbox.profile, manifest.binding.profile.effective)
      || !equalIdentity(this.config.executionSandbox.resolve(), execution.spec.sandboxPolicy)))
      throw new Error(`Execution sandbox changed ${stage}`)
    const current = execution.shell.resolve({ command: execution.spec.command, workdir: manifest.invocation.cwd,
      timeoutMs: manifest.bounds.timeout_ms, onExpiry: 'kill', stdoutMaxBytes: this.policy.max_output_bytes,
      env: execution.spec.env, signal, ...(execution.spec.sandboxPolicy ? { sandboxPolicy: execution.spec.sandboxPolicy } : {}) })
    if (current.signal !== signal || !equalIdentity(executionIdentity(current), executionIdentity(execution.spec)))
      throw new Error(`Execution configuration changed ${stage}`)
  }
  private async nativeReview(review: Review, manifest: Manifest, manifestRef: ArtifactReference): Promise<void> {
    if (review.status !== 'completed' || review.completion === null) throw new ReviewUnavailable('Exact review has no completed native receipt')
    assertApprovedReview(manifest, manifestRef, review, this.policy)
    const reviewer = this.ctx.agents.get(SessionId(this.policy.reviewer.session_id))
    if (reviewer && reviewer.options.provider !== this.policy.reviewer.provider) throw new ReviewUnavailable('Configured reviewer profile differs')
    const retained = JSON.parse(Buffer.from(await this.config.artifacts.read(review.completion)).toString('utf8'))
    if (retained.session_id !== this.policy.reviewer.session_id || retained.provider !== this.policy.reviewer.provider || !Array.isArray(retained.events)) throw new Error('Review completion identity mismatch')
    let observed: readonly SessionEvent[]
    if (reviewer) observed = reviewer.session.snapshotEvents()
    else {
      const query = this.ctx.get('sessionQuery')
      if (!query) throw new ReviewUnavailable('Retained reviewer query is unavailable')
      const cut = await query.observeSession(SessionId(this.policy.reviewer.session_id), { projectionMode: 'none' })
      try { observed = cut.events } finally { cut[Symbol.dispose]() }
    }
    const range = retained.range as { start_index?: number; end_index?: number } | undefined
    if (range && (!Number.isSafeInteger(range.start_index) || !Number.isSafeInteger(range.end_index) || range.start_index! < 0
      || range.end_index! > observed.length || range.end_index! <= range.start_index! || range.end_index! - range.start_index! !== retained.events.length))
      throw new Error('Reviewer native completion event range is invalid')
    const events = range ? observed.slice(range.start_index, range.end_index) : observed.slice(0, retained.events.length)
    const completion = Buffer.from(canonicalJson({ session_id: this.policy.reviewer.session_id, provider: this.policy.reviewer.provider, events, ...(range ? { range } : {}) }))
    if (sha256(completion) !== review.completion.sha256) throw new Error('Review completion does not match actual native Session prefix bytes')
    const end = events.findLast(e => e.type === 'turn/end')
    const message = events.findLast(e => e.type === 'assistant/message')
    if (!end || end.type !== 'turn/end' || end.data.reason.kind !== 'completed' || !message || message.type !== 'assistant/message') throw new ReviewUnavailable('Native reviewer did not complete normally')
    const output = JSON.parse(message.data.message.content.filter(b => b.type === 'text').map(b => b.text).join(''))
    if (output.decision !== 'approve' || output.action_id !== manifest.action_id || output.manifest_sha256 !== manifestRef.sha256
      || output.request_sha256 !== review.request.sha256 || output.review_id !== review.review_id) throw new Error('Actual reviewer output covers a different action/request')
    if (message.data.message.source?.kind !== 'model' || message.data.message.source.provider !== this.policy.reviewer.provider) throw new Error('Reviewer producer attribution mismatch')
    for (const ref of [review.request, review.packet, review.scope.proposal, review.reviewer.preset, review.reviewer.permissions, ...review.evidence]) await this.config.artifacts.read(ref)
  }
  async run(input: unknown, owner: Agent, signal: AbortSignal): Promise<RunAssociation> {
    const request = RunActionSchema.parse(input)
    if (owner.id !== this.config.authorSessionId || this.ctx.agents.get(owner.id) !== owner) throw new Error('Only the exact configured live author can invoke research_run')
    const manifest = await loadManifest(request.manifest, this.config.artifacts)
    if (manifest.author_session_id !== owner.id) throw new Error('Manifest author and native tool owner differ')
    assertInvocation(manifest, this.config.artifacts.root, this.policy)
    if (this.policy.gpu && (!equalIdentity(manifest.invocation.env, this.policy.gpu.environment)
      || manifest.inputs.some(input => input.purpose !== this.policy.gpu!.purpose))) throw new Error('GPU invocation environment or cost/input purpose differs from the registered profile')
    const known = this.config.table.get(this.config.projectKey)?.actions[manifest.action_id]
    if (known) return this.association(manifest.action_id, true)
    const review = ReviewSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(request.review)).toString('utf8')))
    try { await this.nativeReview(review, manifest, request.manifest) } catch (error) {
      if (error instanceof ReviewUnavailable) {
        await this.config.table.update(this.config.projectKey, current => {
          if (current.active_action_id !== null || (current.hold !== null && current.hold.kind !== 'review_unavailable')) return current
          return ResearchStateSchema.parse({ ...current, revision: current.revision + 1, hold: { kind: 'review_unavailable', owner: this.config.authorSessionId,
            reason: error.message, evidence: [request.review], affected: [manifest.action_id],
            exit_condition: 'Completed separate review for this exact action, verified against native Session bytes and current profile',
            next_check: 'Existing bounded reviewer completion/reconciliation', reassess_at: new Date(Date.now() + 60_000).toISOString() } })
        })
      }
      throw error
    }
    await verifyIdentity(manifest, this.config.artifacts)
    await this.config.artifacts.read(this.policy.entrypoint)
    await this.config.artifacts.read(this.config.policy)
    await this.config.assertActiveAuthority?.(owner)
    // Known unsupported/clamped execution profiles must fail without consuming a review or reserving an attempt.
    const execution = await this.resolveExecution(manifest, owner, signal)
    let recovery: RecoveryPreflight | undefined
    if (manifest.proposal.retry) {
      const guard = this.config.recovery
      if (!guard || !equalIdentity(guard.identity, manifest.proposal.retry.recovery_policy))
        throw new Error('Replacement recovery policy has no exact host-registered guard')
      const state = this.config.table.get(this.config.projectKey)!
      const parent = state.actions[manifest.proposal.retry.parent_action_id]
      if (!parent?.evidence || !parent.checkpoint) throw new Error('Replacement parent lacks retained reconciliation evidence/checkpoint')
      const parentManifest = await loadManifest(parent.manifest, this.config.artifacts)
      const parentEvidence = EvidenceSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(parent.evidence)).toString()))
      if (parentEvidence.action_id !== parent.action_id || parentEvidence.attempt_id !== parent.attempt_id
        || !equalIdentity(parentEvidence.manifest, parent.manifest) || !equalIdentity(parentEvidence.binding, parentManifest.binding)
        || parentEvidence.admission.committed_revision !== parent.admitted_revision
        || parentEvidence.admission.authority_id !== state.authority.authority_id
        || parentEvidence.native.owner_session_id !== parent.owner_session_id)
        throw new Error('Replacement parent evidence differs from the original admitted identity')
      if (guard.parentEvidenceKind === 'settled_scientific_failure') {
        const parentPolicy = DevelopmentPolicySchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(parentManifest.bounds.resource_policy)).toString()))
        if (!['project_gpu_development', 'project_research'].includes(parentPolicy.scope) || parentPolicy.gpu?.purpose !== 'C_science'
          || !equalIdentity(parentPolicy.binding, parentManifest.binding) || !equalIdentity(parentPolicy.authority, parentManifest.binding.authority)
          || parentManifest.inputs.length === 0 || parentManifest.inputs.some(input => input.purpose !== 'C_science'))
          throw new Error('Settled scientific recovery parent lacks its exact original C_science policy/manifest scope')
        const facts = parent.runtime_facts
        if (parent.phase !== 'settled' || parent.reservation_active || parentEvidence.scientific_status !== 'ineligible'
          || parentEvidence.evidence_status !== 'invalid' || !parentEvidence.terminal.ownership_resolved
          || parent.job_id === null || parentEvidence.native.job_id !== parent.job_id || !facts || parentEvidence.terminal.settlement === null
          || !equalIdentity(facts.admission, parentEvidence.admission.acknowledgement)
          || !equalIdentity(facts.identity, parentEvidence.identity.before) || !equalIdentity(facts.capture, parentEvidence.capture.artifact))
          throw new Error('Settled scientific recovery requires exact retained native job/admission/capture/ownership facts')
        const admission = z.object({ authority: z.unknown(), action: ActionStateSchema }).parse(JSON.parse(Buffer.from(await this.config.artifacts.read(facts.admission)).toString()))
        if (!equalIdentity(admission.authority, parentEvidence.binding.authority)
          || !equalIdentity(admission.action, { ...parent, phase: 'admitted', reservation_active: true,
            job_id: null, evidence: null, checkpoint: null, runtime_facts: null }))
          throw new Error('Settled scientific recovery admission differs from the original consumed action')
        const terminal = z.object({ job: z.object({ id: z.string(), owner: z.string(), label: z.string(), status: z.string() }),
          result: z.object({ exitCode: z.number().int().nullable(), signal: z.string().nullable(), timedOut: z.boolean(), aborted: z.boolean(),
            stdout: z.object({ text: z.string(), truncated: z.boolean() }) }) }).parse(JSON.parse(Buffer.from(await this.config.artifacts.read(facts.terminal)).toString()))
        if (terminal.job.id !== parent.job_id || terminal.job.owner !== parent.owner_session_id || terminal.job.label !== parent.action_id
          || terminal.job.status !== parentEvidence.terminal.raw_status || terminal.result.exitCode !== parentEvidence.terminal.exit_code
          || terminal.result.signal !== parentEvidence.terminal.signal || terminal.result.timedOut !== parentEvidence.terminal.timeout
          || terminal.result.aborted !== parentEvidence.terminal.abort
          || !Buffer.from(await this.config.artifacts.read(facts.capture)).equals(Buffer.from(terminal.result.stdout.text, 'utf8')))
          throw new Error('Settled scientific recovery terminal/capture differs from the actual native job')
        await this.config.artifacts.read(facts.identity)
        const settlement = z.strictObject({ gpu: ByteRef, science: ByteRef }).parse(JSON.parse(Buffer.from(await this.config.artifacts.read(parentEvidence.terminal.settlement)).toString()))
        const science = ScienceSettlementSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(settlement.science)).toString()))
        if (science.action_id !== parent.action_id || science.attempt_id !== parent.attempt_id || science.dispatch_token !== parent.dispatch_token
          || science.admitted_revision !== parent.admitted_revision || !equalIdentity(science.manifest, parent.manifest)
          || !equalIdentity(science.policy, parentPolicy.gpu.science)
          || !equalIdentity(science.native_terminal, facts.terminal) || !equalIdentity(science.capture, facts.capture)
          || !equalIdentity(science.costs, parentEvidence.costs.filter(cost => cost.purpose === 'C_science')))
          throw new Error('Settled scientific recovery settlement/charges differ from the original native facts')
        for (const source of [settlement.gpu, science.contract, science.admission, science.checkpoint, science.authority_observation,
          science.policy.envelope, science.policy.guard, science.policy.authority.registration, ...science.costs.map(cost => cost.source!)])
          await this.config.artifacts.read(source)
      } else if (parentEvidence.scientific_status !== 'ineligible' || parentEvidence.evidence_status !== 'invalid'
        || !parentEvidence.terminal.ownership_resolved || parentEvidence.native.job_id !== null
        || parentEvidence.native.tool_call_id === null || parentEvidence.terminal.settlement === null) {
        throw new Error('This recovery route requires an exact qualified pre-dispatch failure')
      }
      for (const ref of [guard.identity, guard.qualification, parent.checkpoint, parentEvidence.terminal.settlement])
        await this.config.artifacts.read(ref)
      const ref = await boundedGuard(s => guard.preflight({ manifest, manifestRef: request.manifest,
        policy: this.config.policy, parent, state }, s), Math.min(this.policy.max_timeout_ms, 5000), signal)
      recovery = checkRecoveryPreflight(JSON.parse(Buffer.from(await this.config.artifacts.read(ref)).toString()),
        this.config.table.get(this.config.projectKey)!, manifest, request.manifest, this.config.policy, guard.qualification)
      for (const observed of [recovery.observation, recovery.original_unit, recovery.replacement_unit])
        await this.config.artifacts.read(observed)
    }
    if (this.policy.gpu?.purpose === 'C_science') {
      const science = this.policy.gpu.science
      for (const ref of [science.envelope, science.guard, science.authority.registration]) await this.config.artifacts.read(ref)
      if (!manifest.proposal.prerequisites.some(ref => equalIdentity(ref, science.envelope))) throw new Error('Exact scientific envelope must be independently reviewed')
      const ref = await boundedGuard(s => this.config.science!.preflight({ manifest, manifestRef: request.manifest,
        approvedReview: structuredClone(review), approvedReviewRef: structuredClone(request.review) }, s), Math.min(this.policy.max_timeout_ms, 5000), signal)
      const proof = checkSciencePreflight(JSON.parse(Buffer.from(await this.config.artifacts.read(ref)).toString()), science, request.manifest)
      await this.config.artifacts.read(proof.observation)
    }
    if (this.policy.gpu) {
      for (const ref of [this.policy.gpu.guard, this.policy.gpu.qualification, this.policy.gpu.budget, this.policy.gpu.lease_namespace]) await this.config.artifacts.read(ref)
      if (!manifest.proposal.prerequisites.some(ref => equalIdentity(ref, this.policy.gpu!.qualification))) throw new Error('Exact GPU qualification must be a reviewed manifest prerequisite')
      const preflightRef = await boundedGuard(s => this.config.gpu!.preflight({ manifest, manifestRef: request.manifest }, s), Math.min(this.policy.max_timeout_ms, 5000), signal)
      const preflight = checkGpuPreflight(JSON.parse(Buffer.from(await this.config.artifacts.read(preflightRef)).toString()), this.policy.gpu, request.manifest)
      await this.config.artifacts.read(preflight.observation)
    }
    await this.config.assertActiveAuthority?.(owner)
    this.assertExecutionCurrent(execution, manifest, signal, 'before admission')
    signal.throwIfAborted()
    const token = randomUUID()
    let committed: ResearchState
    try { committed = await this.config.table.update(this.config.projectKey, current => reserveAction(current, manifest, request.manifest, review, request.review,
      this.policy, this.config.policy, request.expected_revision, token, recovery)) } catch (error) {
      const retained = this.config.table.get(this.config.projectKey)?.actions[manifest.action_id]
      if (retained?.dispatch_token !== token) throw error
      await this.config.table.update(this.config.projectKey, current => {
        const old = current.actions[manifest.action_id]!
        if (old.dispatch_token !== token || old.phase !== 'admitted') return current
        return ResearchStateSchema.parse({ ...updateAction(current, manifest.action_id, a => ({ ...a, phase: 'unknown' })),
          hold: { kind: 'unknown_execution', owner: owner.id, reason: 'Admission acknowledgement was lost; no dispatch is authorized',
            evidence: [request.manifest, request.review], affected: [manifest.action_id],
            exit_condition: 'Reconcile original durable admission and native execution facts without a new attempt',
            next_check: 'Read original state and native job/process evidence', reassess_at: new Date(Date.now() + 60_000).toISOString() } })
      })
      return this.association(manifest.action_id, false)
    }
    const action = committed.actions[manifest.action_id]!
    if (action.dispatch_token !== token) return this.association(manifest.action_id, true)
    this.observe('admission_acknowledged', { revision: action.admitted_revision, action_id: action.action_id, attempt_id: action.attempt_id })
    const directory = `local_artifacts/autoresearch/dsh/${manifest.goal.id}/${manifest.action_id}`
    let jobId: string | null = null
    try {
      const identityBytes = Buffer.from(canonicalJson({ manifest_sha256: request.manifest.sha256, bindings_verified: true }))
      const before = await this.config.artifacts.write(`${directory}/identity-before.json`, identityBytes)
      const ack = await this.config.artifacts.write(`${directory}/admission.json`, Buffer.from(canonicalJson({ authority: committed.authority, action })))
      await this.config.table.update(this.config.projectKey, current => updateAction(current, manifest.action_id, a => ({ ...a, phase: 'dispatching' })))
      // Configuration drift after durable acknowledgement retains this attempt's reservation; it cannot authorize a new spec.
      const currentExecution = await this.resolveExecution(manifest, owner, signal)
      if (shellIdentity(currentExecution.shell) !== shellIdentity(execution.shell) || !equalIdentity(executionIdentity(currentExecution.spec), executionIdentity(execution.spec)))
        throw new Error('Execution configuration changed after admission acknowledgement')
      await this.config.assertActiveAuthority?.(owner)
      signal.throwIfAborted()
      // The durable acknowledgement is awaited; the registered tuple is verified immediately before native dispatch.
      const live = this.config.table.get(this.config.projectKey)!
      const proof = live.actions[manifest.action_id]!
      if (live.stopped || live.hold !== null || proof.dispatch_token !== token || proof.admitted_revision !== action.admitted_revision
        || proof.manifest.sha256 !== request.manifest.sha256 || live.authority.authority_id !== manifest.binding.authority.authority_id
        || shellIdentity(this.config.executionShell ?? this.ctx.shell) !== shellIdentity(execution.shell)) throw new Error('Committed admission proof or stop state no longer permits dispatch')
      signal.throwIfAborted()
      const { shell, spec } = execution
      let running: Promise<ShellExecution> | null = null
      let terminal: ShellRunResult | null = null
      let nativeFailure: string | null = null
      const start = performance.now()
      this.observe('dispatch_after_verified_ack', { action_id: action.action_id, admitted_revision: action.admitted_revision })
      // No asynchronous work may separate this final configuration/authority proof from native dispatch.
      this.assertExecutionCurrent(execution, manifest, signal, 'after admission acknowledgement')
      const dispatchState = this.config.table.get(this.config.projectKey)!, dispatchAction = dispatchState.actions[manifest.action_id]!
      if (dispatchState.stopped || dispatchState.hold !== null || dispatchAction.dispatch_token !== token
        || dispatchAction.admitted_revision !== action.admitted_revision || dispatchAction.manifest.sha256 !== request.manifest.sha256
        || dispatchState.authority.authority_id !== manifest.binding.authority.authority_id) throw new Error('Committed admission proof or stop state no longer permits dispatch')
      signal.throwIfAborted()
      const id = this.ctx.jobs.start({ kind: 'bash', label: manifest.action_id, owner: owner.id,
        run: () => {
          running = shell.execute(spec)
          const done: Promise<JobOutcome> = running.then(handle => handle.result()).then((result): JobOutcome => {
            terminal = result
            return { status: result.timedOut || result.aborted || result.signal !== null ? 'killed' : result.exitCode === 0 ? 'completed' : 'failed' }
          }).catch(error => { nativeFailure = error instanceof Error ? error.message : 'native_failure'; return { status: 'failed' } })
          return { cancel: () => { if (running) void running.then(handle => handle.kill()).catch(() => {}) }, done }
        },
      })
      jobId = id
      this.observe('native_job_registered', { job_id: id, action_id: action.action_id })
      await this.config.table.update(this.config.projectKey, current => updateAction(current, manifest.action_id, a => ({ ...a, phase: 'running', job_id: id })))
      const job = await this.ctx.jobs.wait(id, manifest.bounds.timeout_ms + 5000, owner.id)
      if (terminal === null || nativeFailure !== null) throw new Error(`Native terminal/quiescence unresolved: ${nativeFailure ?? 'missing result'}`)
      // Assignments occur in an awaited native callback; this is its completed value, not an invented terminal flag.
      const facts: ShellRunResult = terminal
      const elapsed = (performance.now() - start) / 1000
      const terminalRef = await this.config.artifacts.write(`${directory}/native-terminal.json`, Buffer.from(canonicalJson({ job, result: facts, process_elapsed_seconds: elapsed })))
      const capturedBytes = Buffer.from(facts.stdout.text, 'utf8')
      const captureRef = await this.config.artifacts.write(`${directory}/result.json`, capturedBytes)
      const checked = checkCapture(capturedBytes, manifest, !facts.stdout.truncated)
      let settlementRef = terminalRef
      let completeUnit = true
      let scientificCosts: z.infer<typeof EvidenceSchema>['costs'] = []
      if (this.policy.gpu) {
        // Retain exact native facts in the coupled record before fallible GPU settlement.
        // An interrupted callback/reopen cannot discard or replace the original capture.
        await this.config.table.update(this.config.projectKey, current => updateAction(current, manifest.action_id, old => ({ ...old,
          runtime_facts: { admission: ack, identity: before, terminal: terminalRef, capture: captureRef } })))
        const context = { manifest, manifestRef: request.manifest, action_id: action.action_id, attempt_id: action.attempt_id,
          dispatch_token: action.dispatch_token, admitted_revision: action.admitted_revision, native_terminal: terminalRef, capture: captureRef }
        // Settlement/reconciliation must remain observable even if the caller aborted.
        const guardRef = await boundedGuard(s => this.config.gpu!.settle(context, s), Math.min(this.policy.max_timeout_ms, 5000))
        const proof = checkGpuSettlement(JSON.parse(Buffer.from(await this.config.artifacts.read(guardRef)).toString()), this.policy.gpu, context)
        for (const ref of [proof.lease, proof.observation, proof.guard]) await this.config.artifacts.read(ref)
        completeUnit = proof.complete_unit
        settlementRef = await this.config.artifacts.write(`${directory}/gpu-native-settlement.json`, Buffer.from(canonicalJson({ native_terminal: terminalRef, gpu: guardRef })))
        if (this.policy.gpu.purpose === 'C_science') {
          const ref = await boundedGuard(s => this.config.science!.settle(context, s), Math.min(this.policy.max_timeout_ms, 5000))
          const science = checkScienceSettlement(JSON.parse(Buffer.from(await this.config.artifacts.read(ref)).toString()), this.policy.gpu.science, context)
          for (const source of [science.contract, science.admission, science.checkpoint, science.authority_observation, ...science.costs.map(cost => cost.source!)]) await this.config.artifacts.read(source)
          scientificCosts = science.costs
          settlementRef = await this.config.artifacts.write(`${directory}/scientific-native-settlement.json`, Buffer.from(canonicalJson({ gpu: settlementRef, science: ref })))
        }
      }
      let matches = true
      try { await verifyIdentity(manifest, this.config.artifacts); await this.config.artifacts.read(this.config.policy); await this.config.artifacts.read(this.policy.entrypoint)
        if (this.policy.gpu) for (const ref of [this.policy.gpu.guard, this.policy.gpu.qualification, this.policy.gpu.budget, this.policy.gpu.lease_namespace]) await this.config.artifacts.read(ref)
        if (this.policy.gpu?.purpose === 'C_science') for (const ref of [this.policy.gpu.science.envelope, this.policy.gpu.science.guard, this.policy.gpu.science.authority.registration]) await this.config.artifacts.read(ref)
      } catch { matches = false }
      const after = await this.config.artifacts.write(`${directory}/identity-after.json`, matches ? identityBytes : Buffer.from('identity drift'))
      const normal = completeUnit && job.status === 'completed' && facts.exitCode === 0 && !facts.timedOut && !facts.aborted && facts.signal === null
      const verdict = checked.valid && matches && normal ? await this.config.verifier.verify(checked.result) : 'unavailable'
      const verifierResult = verdict === 'unavailable' ? null : await this.config.artifacts.write(`${directory}/verifier.json`, Buffer.from(canonicalJson({ verdict })))
      const current = this.config.table.get(this.config.projectKey)!
      const scientificElapsed = scientificCosts.reduce((total, cost) => total + cost.amount!, 0)
      if (scientificCosts.some(cost => cost.execution_id === id)) throw new Error('Scientific and native coordination execution IDs must be distinct')
      if (scientificElapsed > elapsed) throw new Error('Original scientific charge exceeds the containing native process interval; reconcile units/identity')
      const balance = { consumed_attempts: current.consumed_attempts, reserved_timeout_ms: current.reserved_timeout_ms - action.timeout_ms, costs: [] }
      const evidence: Evidence = EvidenceSchema.parse({ schema_version: 1, kind: 'evidence', binding: manifest.binding,
        action_id: action.action_id, attempt_id: action.attempt_id, manifest: request.manifest,
        admission: { authority_id: live.authority.authority_id, committed_revision: action.admitted_revision, acknowledgement: ack,
          action_id: action.action_id, attempt_id: action.attempt_id, manifest_sha256: request.manifest.sha256 },
        native: { owner_session_id: owner.id, producer: '@deepseek-ai/dsh-shell+jobs', job_id: id, tool_call_id: null },
        terminal: { status: facts.timedOut ? 'timed_out' : facts.aborted ? 'cancelled' : facts.signal !== null || facts.exitCode !== 0 ? 'crashed' : 'completed',
          raw_status: job.status, exit_code: facts.exitCode, signal: facts.signal, timeout: facts.timedOut, abort: facts.aborted,
          ownership_resolved: true, settlement: settlementRef },
        identity: { expected: before, before, after, matches }, capture: { artifact: captureRef, complete: !facts.stdout.truncated, overflow: facts.stdout.truncated, parser_input_sha256: checked.sha256 },
        output_schema: manifest.output, result: checked.result, verifier: { identity: this.config.verifier.identity, result: verifierResult, verdict },
        evidence_status: checked.valid && matches && normal ? 'valid' : 'invalid', scientific_status: checked.valid && matches && normal ? 'eligible' : 'ineligible',
        costs: [...scientificCosts, { execution_id: id, purpose: this.policy.gpu?.purpose === 'C_science' ? 'C_run' : this.policy.execution?.cost_purpose ?? this.policy.gpu?.purpose ?? 'C_qual',
          unit: 'process_elapsed_seconds', amount: elapsed - scientificElapsed, source: terminalRef, unresolved_reason: null }], remaining: balance,
      })
      const evidenceRef = await this.config.artifacts.write(`${directory}/evidence.json`, Buffer.from(canonicalJson(evidence)))
      const settledState = { ...current, reserved_timeout_ms: balance.reserved_timeout_ms }
      const checkpoint = checkpointFor(manifest, evidence, evidenceRef, settledState, request.review)
      const checkpointRef = await this.config.artifacts.write(`${directory}/checkpoint.json`, Buffer.from(canonicalJson(checkpoint)))
      await this.config.table.update(this.config.projectKey, s => {
        const a = s.actions[manifest.action_id]!
        if (a.phase === 'settled' || !a.reservation_active) return s
        if (s.stopped !== current.stopped || !equalIdentity(s.binding, current.binding) || !equalIdentity(s.policy, current.policy)
          || !equalIdentity(s.actions[manifest.action_id], current.actions[manifest.action_id]) || s.consumed_attempts !== current.consumed_attempts
          || s.reserved_timeout_ms !== current.reserved_timeout_ms) throw new Error('Project state changed during evidence capture; reconcile the original settlement')
        return ResearchStateSchema.parse({ ...s, revision: s.revision + 1, active_action_id: null, reserved_timeout_ms: s.reserved_timeout_ms - action.timeout_ms,
          actions: { ...s.actions, [manifest.action_id]: { ...a, phase: 'settled', reservation_active: false, evidence: evidenceRef, checkpoint: checkpointRef } } })
      })
      this.observe('settled', { action_id: action.action_id, evidence_status: evidence.evidence_status, scientific_status: evidence.scientific_status })
      return this.association(manifest.action_id, false)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unresolved execution'
      await this.config.table.update(this.config.projectKey, current => {
        const updated = updateAction(current, manifest.action_id, old => ({ ...old, phase: 'unknown', job_id: jobId ?? old.job_id }))
        return ResearchStateSchema.parse({ ...updated, hold: { kind: 'unknown_execution', owner: this.config.authorSessionId, reason, evidence: [],
          affected: [manifest.action_id], exit_condition: 'Query native ownership/terminal facts and reconcile the original admitted attempt; never relaunch it',
          next_check: 'Existing host completion or explicit read-only reconciliation', reassess_at: new Date(Date.now() + 60_000).toISOString() } })
      })
      this.observe('unknown_execution_hold', { action_id: action.action_id, reason })
      return this.association(manifest.action_id, false)
    }
  }
  /** Observe an unresolved GPU settlement without admitting, relaunching or releasing state. */
  async inspectGpuSettlement(actionId: string, signal: AbortSignal) {
    const state = this.config.table.get(this.config.projectKey)!
    const action = state.actions[actionId]
    if (!this.policy.gpu || !action?.runtime_facts) return { status: 'unresolved' as const, action_id: actionId, reason: 'No retained exact GPU native facts' }
    const manifest = await loadManifest(action.manifest, this.config.artifacts)
    if (!equalIdentity(manifest.binding, state.binding) || !equalIdentity(state.policy, this.config.policy)) throw new Error('Original GPU binding/policy changed')
    await verifyIdentity(manifest, this.config.artifacts)
    for (const ref of [this.policy.gpu.guard, this.policy.gpu.qualification, this.policy.gpu.budget, this.policy.gpu.lease_namespace]) await this.config.artifacts.read(ref)
    for (const ref of Object.values(action.runtime_facts)) await this.config.artifacts.read(ref)
    const context = { manifest, manifestRef: action.manifest, action_id: action.action_id, attempt_id: action.attempt_id,
      dispatch_token: action.dispatch_token, admitted_revision: action.admitted_revision,
      native_terminal: action.runtime_facts.terminal, capture: action.runtime_facts.capture }
    const ref = await boundedGuard(s => this.config.gpu!.settle(context, s), Math.min(this.policy.max_timeout_ms, 5000), signal)
    const proof = checkGpuSettlement(JSON.parse(Buffer.from(await this.config.artifacts.read(ref)).toString()), this.policy.gpu, context)
    for (const artifact of [proof.lease, proof.observation]) await this.config.artifacts.read(artifact)
    return { status: 'quiescent' as const, action_id: actionId, proof: ref, complete_unit: proof.complete_unit, reservation_released: false }
  }
  tool(): ToolDefinition {
    const reference = { type: 'object' as const, additionalProperties: false, properties: {
      uri: { type: 'string' as const, required: true as const }, sha256: { type: 'string' as const, required: true as const }, size_bytes: { type: 'integer' as const, required: true as const } } }
    return defineTool({ name: 'research_run', description: 'Run one exact reviewed frozen research action through the registered project authority and execution limits.',
      parameters: { manifest: { ...reference, required: true }, review: { ...reference, required: true }, expected_revision: { type: 'integer', required: true } },
      output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      execute: async (args, exec) => {
        if (!exec.agent) throw new Error('Native author Session is required')
        const result = await this.run(args, exec.agent, exec.signal)
        if (result.status === 'settled' && !result.replay && this.config.afterSettlement) {
          try { await this.config.afterSettlement(result, exec.agent, exec.signal) }
          catch (error) { this.observe('settled_outcome_wakeup_pending', { action_id: result.action_id, reason: String(error) }) }
        }
        return JSON.parse(JSON.stringify(result))
      },
    })
  }
  register(options: ResearchToolRegistration = {}): () => void {
    const author = this.ctx.agents.get(SessionId(this.config.authorSessionId))
    const reviewer = this.ctx.agents.get(SessionId(this.policy.reviewer.session_id))
    if (!author) throw new Error('Author must exist before installing this scoped fixture route')
    const authorTools = this.config.authorTools ?? ['research_run']
    const disposers: Array<() => void> = []
    const dispose = () => { while (disposers.length) disposers.pop()!() }
    try {
      disposers.push(this.ctx.jobs.attachController('research_run'))
      disposers.push(this.ctx.tools.guard(exec => {
        if (exec.agent?.id === this.policy.reviewer.session_id) return 'Research reviewer has no execution tools in this profile'
        if (exec.agent?.id === this.config.authorSessionId && !authorTools.includes(exec.name)) return 'Research author must use the guarded frozen-action entrypoint'
        return undefined
      }))
      const local = options.toolScope === 'author'
      const inherited = options.inheritedTools ?? []
      if (!local && options.inheritedTools !== undefined) throw new Error('Inherited-tool selection requires author-local registration')
      if (inherited.some(name => !authorTools.includes(name))) throw new Error('Inherited capability is outside the registered author allowlist')
      disposers.push((local ? author.ctx.tools : this.ctx.tools).register(this.tool()))
      disposers.push(author.ctx.tools.restrict({ allow: local ? [...inherited] : [...authorTools] }))
      if (reviewer) {
        // Local tools are not valid names for inherited masks; the global reviewer guard also covers future reviewer instances.
        disposers.push(reviewer.ctx.tools.restrict(local ? { allow: [] } : { deny: [...authorTools] }))
      }
      return dispose
    } catch (error) { dispose(); throw error }
  }
}

export { NativeReviewDriver, AUTHOR_INSTRUCTIONS, REVIEW_INSTRUCTIONS } from './review.js'
export { NativeCoordinationTools } from './coordination.js'
export { NativeProductionResearch } from './production.js'
export type { ProductionResearchConfig, ProductionProjectHooks } from './production.js'
