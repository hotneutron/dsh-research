import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { z } from 'zod'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { JobOutcome } from '@deepseek-ai/dsh-jobs'
import type { ShellExecution, ShellRunResult, ShellExecutor } from '@deepseek-ai/dsh-shell'
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
import { ResearchStateSchema, DevelopmentPolicySchema, equalIdentity, reserveAction, updateAction, assertApprovedReview } from './admission.js'
import type { ResearchState, DevelopmentPolicy } from './admission.js'
import { checkCapture } from './evaluate.js'
import { checkpointFor } from './loop.js'
import { checkGpuPreflight, checkGpuSettlement } from './gpu.js'
import type { NativeGpuGuard } from './gpu.js'

export const researchDomain = defineDomain({ name: 'dsh_research_admission', version: 3, tables: { projects: domainTable<string, ResearchState>(ResearchStateSchema) } })
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
  /** Existing host authority check, e.g. current Ticket mandate and operator pause. Rechecked before dispatch. */
  assertActiveAuthority?: (owner: Agent) => void | Promise<void>
  /** Existing project domain verifier; its pinned code supplies scientific meaning. */
  verifier: { identity: ArtifactReference; verify(result: Record<string, number | string | boolean>): Promise<'positive' | 'negative' | 'inconclusive'> }
  gpu?: NativeGpuGuard
  observe?: (event: string, detail: unknown) => void
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
    const events = observed.slice(0, retained.events.length)
    const completion = Buffer.from(canonicalJson({ session_id: this.policy.reviewer.session_id, provider: this.policy.reviewer.provider, events }))
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
    if (resolve(manifest.invocation.cwd) !== this.config.artifacts.root || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(manifest.goal.id)) throw new Error('Execution profile requires canonical project cwd and a safe goal ID')
    if (manifest.inputs.length !== 1 || manifest.invocation.argv.length !== 3
      || manifest.invocation.argv[0] !== resolve(this.config.artifacts.root, this.policy.entrypoint.uri)
      || manifest.invocation.argv[1] !== resolve(this.config.artifacts.root, manifest.inputs[0]!.artifact.uri)
      || manifest.invocation.argv[2] !== manifest.proposal.operation) throw new Error('Invocation does not match the pinned producer/input/operation template')
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
    if (this.policy.gpu) {
      for (const ref of [this.policy.gpu.guard, this.policy.gpu.qualification, this.policy.gpu.budget, this.policy.gpu.lease_namespace]) await this.config.artifacts.read(ref)
      if (!manifest.proposal.prerequisites.some(ref => equalIdentity(ref, this.policy.gpu!.qualification))) throw new Error('Exact GPU qualification must be a reviewed manifest prerequisite')
      const preflightRef = await boundedGuard(s => this.config.gpu!.preflight({ manifest, manifestRef: request.manifest }, s), Math.min(this.policy.max_timeout_ms, 5000), signal)
      const preflight = checkGpuPreflight(JSON.parse(Buffer.from(await this.config.artifacts.read(preflightRef)).toString()), this.policy.gpu, request.manifest)
      await this.config.artifacts.read(preflight.observation)
    }
    signal.throwIfAborted()
    const token = randomUUID()
    const committed = await this.config.table.update(this.config.projectKey, current => reserveAction(current, manifest, request.manifest, review, request.review,
      this.policy, this.config.policy, request.expected_revision, token))
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
      await this.config.assertActiveAuthority?.(owner)
      signal.throwIfAborted()
      // The durable acknowledgement is awaited; the registered tuple is verified immediately before native dispatch.
      const live = this.config.table.get(this.config.projectKey)!
      const proof = live.actions[manifest.action_id]!
      if (live.stopped || live.hold !== null || proof.dispatch_token !== token || proof.admitted_revision !== action.admitted_revision
        || proof.manifest.sha256 !== request.manifest.sha256 || live.authority.authority_id !== manifest.binding.authority.authority_id) throw new Error('Committed admission proof or stop state no longer permits dispatch')
      signal.throwIfAborted()
      const command = [manifest.invocation.executable, ...manifest.invocation.argv].map(shellLiteral).join(' ')
      const shell = this.config.executionShell ?? this.ctx.shell
      const spec = shell.resolve({ command, workdir: manifest.invocation.cwd, timeoutMs: manifest.bounds.timeout_ms,
        onExpiry: 'kill', stdoutMaxBytes: this.policy.max_output_bytes, env: manifest.invocation.env, signal })
      if (spec.command !== command || resolve(spec.workdir) !== resolve(manifest.invocation.cwd) || spec.onExpiry !== 'kill'
        || spec.timeoutMs !== manifest.bounds.timeout_ms) throw new Error('Resolved shell spec differs from the frozen invocation/deadline')
      let running: Promise<ShellExecution> | null = null
      let terminal: ShellRunResult | null = null
      let nativeFailure: string | null = null
      const start = performance.now()
      this.observe('dispatch_after_verified_ack', { action_id: action.action_id, admitted_revision: action.admitted_revision })
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
      }
      let matches = true
      try { await verifyIdentity(manifest, this.config.artifacts); await this.config.artifacts.read(this.config.policy); await this.config.artifacts.read(this.policy.entrypoint)
        if (this.policy.gpu) for (const ref of [this.policy.gpu.guard, this.policy.gpu.qualification, this.policy.gpu.budget, this.policy.gpu.lease_namespace]) await this.config.artifacts.read(ref)
      } catch { matches = false }
      const after = await this.config.artifacts.write(`${directory}/identity-after.json`, matches ? identityBytes : Buffer.from('identity drift'))
      const normal = completeUnit && job.status === 'completed' && facts.exitCode === 0 && !facts.timedOut && !facts.aborted && facts.signal === null
      const verdict = checked.valid && matches && normal ? await this.config.verifier.verify(checked.result) : 'unavailable'
      const verifierResult = verdict === 'unavailable' ? null : await this.config.artifacts.write(`${directory}/verifier.json`, Buffer.from(canonicalJson({ verdict })))
      const current = this.config.table.get(this.config.projectKey)!
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
        costs: [{ execution_id: id, purpose: this.policy.gpu?.purpose ?? 'C_qual', unit: 'process_elapsed_seconds', amount: elapsed, source: terminalRef, unresolved_reason: null }], remaining: balance,
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
    return defineTool({ name: 'research_run', description: 'Run one exact reviewed frozen synthetic research action; all execution and state limits are host-owned.',
      parameters: { manifest: { ...reference, required: true }, review: { ...reference, required: true }, expected_revision: { type: 'integer', required: true } },
      output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      execute: async (args, exec) => {
        if (!exec.agent) throw new Error('Native author Session is required')
        return JSON.parse(JSON.stringify(await this.run(args, exec.agent, exec.signal)))
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
