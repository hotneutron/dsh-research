import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { z } from 'zod'
import { ByteRef, CheckpointSchema, EvidenceSchema, ManifestSchema, ReviewSchema } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { DevelopmentPolicySchema, ResearchStateSchema, Version4ResearchStateSchema, equalIdentity } from './admission.js'
import type { DevelopmentPolicy, ResearchState } from './admission.js'
import { NativeResearchAdapter } from './native.js'
import type { NativeResearchConfig, RunAssociation } from './native.js'
import { NativeCoordinationTools } from './coordination.js'
import type { NativeCoordinationConfig } from './coordination.js'
import { NativeReviewDriver, AUTHOR_INSTRUCTIONS } from './review.js'
import { DecisionSubjectSchema } from './decision.js'
import type { DecisionSubject } from './decision.js'
import { canonicalJson, deriveActionId, sha256 } from './bindings.js'
import { assertInvocation } from './execution.js'
import { scientificSubject } from './collaboration.js'
import type { FeedbackState } from './collaboration.js'
import { publishCheckpoint } from './publication.js'
import type { PublicationTransport } from './publication.js'
import { ScientificHandoff, readArtifactPage } from './steering.js'
import type { ScientificHandoffConfig } from './steering.js'
import { boundedJsonContent, NativeRequiredContext, SCIENTIFIC_INLINE_LIMITS } from './delivery.js'
import type { InlineDeliveryLimits } from './delivery.js'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'research-outcome': { kind: 'research-outcome'; form: 'notice'; summary: string }
  }
}

export interface ProductionProjectHooks {
  propose: NativeCoordinationConfig['propose']
  reviewContext(subject: Manifest | DecisionSubject): Promise<readonly ArtifactReference[]>
  decision(kind: DecisionSubject['subject_kind'], rationale: string, state: ResearchState): Promise<DecisionSubject>
  assertDecisionPremises(subject: DecisionSubject, state: ResearchState): Promise<void>
  assertFeedbackChange?(item: FeedbackState['items'][string], manifest: Manifest, state: ResearchState): Promise<void>
  /** Existing project reader; returns complete captured scans only. Unavailability is optional feedback failure. */
  feedbackScan?(state: ResearchState): Promise<ArtifactReference | null>
}
export interface ProductionResearchConfig extends NativeResearchConfig {
  artifactPrefix: string
  assertActiveAuthority: (owner: Agent) => Promise<void>
  executionShell: NonNullable<NativeResearchConfig['executionShell']>
  executionSandbox: NonNullable<NativeResearchConfig['executionSandbox']>
  hooks: ProductionProjectHooks
  reviewContextMaxBytes: number
  statusMaxActions?: number
  inheritedTools?: readonly string[]
  extraAuthorTools?: readonly ToolDefinition[]
  /** Opt-in, profile-owned common evidence and scientific decision artifacts. */
  scientificHandoff?: Omit<ScientificHandoffConfig, 'artifacts' | 'assertActiveAuthority'>
  scientificInlineLimits?: InlineDeliveryLimits
  /** Project writer derives the current immutable index from retained checkpoint/feedback artifacts. */
  resolveScientificEvidenceIndex?: (state: ResearchState) => Promise<ArtifactReference>
  publication?: { audience: string; maxAttempts: number; transport: PublicationTransport;
    release(checkpoint: ArtifactReference, state: ResearchState): Promise<ArtifactReference> }
}

/** Installs research in an existing native author. Existing AgentLoop and Source own all scheduling. */
export class NativeProductionResearch {
  private coordination!: NativeCoordinationTools
  private reviewer!: NativeReviewDriver
  private adapter!: NativeResearchAdapter
  private handoff: ScientificHandoff | null = null
  private requiredContext: NativeRequiredContext | null = null
  private readonly disposers: Array<() => void> = []
  private approvedSteering: { question: string; evidence: ArtifactReference[] } | null = null
  private constructor(private readonly ctx: Context, private readonly config: ProductionResearchConfig,
    private readonly author: Agent, readonly policy: DevelopmentPolicy) {}

  static async open(ctx: Context, config: ProductionResearchConfig) {
    const author = ctx.agents.get(SessionId(config.authorSessionId))
    if (!author) throw new Error('Production installation requires the existing native author')
    const policy = DevelopmentPolicySchema.parse(JSON.parse(Buffer.from(await config.artifacts.read(config.policy)).toString()))
    if (policy.scope !== 'project_research' || !policy.execution || !policy.review_limits)
      throw new Error('Production installation requires the explicit project execution and reviewer profile')
    if (!config.artifactPrefix.startsWith('local_artifacts/autoresearch/dsh/') || config.artifactPrefix.split(/[\\/]/).includes('..'))
      throw new Error('Production artifacts must remain in the canonical hosted project artifact namespace')
    if (policy.binding.profile.confirmation !== 'off') throw new Error('Production confirmation is unqualified')
    if (!Number.isSafeInteger(config.reviewContextMaxBytes) || config.reviewContextMaxBytes <= 0)
      throw new Error('Explicit positive reviewer context byte budget required')
    const loop = new NativeProductionResearch(ctx, config, author, policy)
    if (config.scientificHandoff) loop.handoff = new ScientificHandoff({ ...config.scientificHandoff,
      artifacts: config.artifacts.withReadPrefixes(policy.allowed_read_prefixes),
      assertActiveAuthority: async () => { await loop.authority() } })
    Version4ResearchStateSchema.parse(config.table.get(config.projectKey))
    if (config.hooks.feedbackScan && !config.hooks.assertFeedbackChange)
      throw new Error('A project feedback source requires its domain-owned changed-action validator')
    await loop.authority()
    if (loop.state().authority.writer_id !== author.id)
      throw new Error('Production profile requires its registered single admission owner to be this exact native author')
    const json = (name: string, value: unknown) => config.artifacts.writeOnce(`${config.artifactPrefix}/${name}`, Buffer.from(canonicalJson(value)))
    loop.coordination = new NativeCoordinationTools(ctx, { ...config,
      beforePropose: () => loop.syncFeedback(),
      validateDisposition: async (item, manifest, state) => {
        const body = JSON.parse(Buffer.from(await config.artifacts.read(item.content)).toString())
        if (body.kind === 'native_reviewer_feedback') {
          const old = ManifestSchema.parse(JSON.parse(Buffer.from(await config.artifacts.read(ByteRef.parse(body.manifest))).toString()))
          if (scientificSubject(old) === scientificSubject(manifest)) throw new Error('Feedback adoption requires a materially changed rejected scientific subject')
        } else if (!config.hooks.assertFeedbackChange) throw new Error('Non-native feedback requires the project changed-action validator')
        await config.hooks.assertFeedbackChange?.(item, manifest, state)
      },
      propose: async (args, state) => {
        const subject = await config.hooks.propose(args, state)
        const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
        assertInvocation(manifest, config.artifacts.root, policy)
        if (manifest.goal.id !== policy.goal_id || manifest.goal.revision !== policy.goal_revision
          || !equalIdentity(manifest.domain_policy, policy.domain_policy) || !equalIdentity(manifest.evaluator.verifier, policy.verifier)
          || manifest.bounds.timeout_ms > policy.max_timeout_ms || manifest.bounds.max_attempts > policy.max_attempts
          || manifest.bounds.timeout_reservation_ms > policy.max_total_timeout_ms)
          throw new Error('Project proposal exceeds the accepted standing scientific scope/bounds')
        await loop.refreshScientificIndex()
        await loop.handoff?.assertManifest(manifest)
        return subject
      },
      afterPropose: async (ref, manifest, args) => {
        if (!args.feedback_item_id) return
        if (!args.feedback_reason) throw new Error('Adopted feedback requires the author scientific reason')
        const item = loop.state().feedback.items[args.feedback_item_id]
        if (!item) throw new Error('Selected feedback source version is not durably captured')
        // Native reviewer feedback must produce a materially different frozen subject.
        const body = JSON.parse(Buffer.from(await config.artifacts.read(item.content)).toString())
        if (body.kind === 'native_reviewer_feedback') {
          const old = ManifestSchema.parse(JSON.parse(Buffer.from(await config.artifacts.read(ByteRef.parse(body.manifest))).toString()))
          if (scientificSubject(old) === scientificSubject(manifest)) throw new Error('Feedback adoption cannot mint an unchanged rejected scientific subject')
        }
        await loop.coordination.disposition(item.item_id, 'adopted', args.feedback_reason, ref)
      } })
    loop.reviewer = await NativeReviewDriver.open(ctx, { ...config,
      ...(loop.handoff ? { preloadContextText: true } : {}),
      ...(loop.handoff ? { protectContext: (sessionId: string, content: Parameters<NativeRequiredContext['require']>[1]) =>
        loop.requiredContext!.require(sessionId, content) } : {}),
      deniedTools: ctx.tools.schemas().map(tool => tool.name),
      assertDecisionPremises: config.hooks.assertDecisionPremises,
      reviewContext: async subject => {
        const references = [...await config.hooks.reviewContext(subject)]
        if (loop.handoff) {
          await loop.refreshScientificIndex()
          if (subject.kind === 'manifest') await loop.handoff.assertManifest(subject)
          const context = await loop.handoff.context()
          references.push(await json(`scientific-context/${sha256(canonicalJson(context))}.json`, context))
          const discovery = await loop.handoff.discovery()
          if (!equalIdentity(discovery.evidence_index, context.evidence_index))
            throw new Error('Scientific context changed while freezing reviewer discovery')
          boundedJsonContent(discovery, config.scientificInlineLimits ?? SCIENTIFIC_INLINE_LIMITS)
          references.push(await json(`scientific-discovery/${sha256(canonicalJson(discovery))}.json`, discovery))
        }
        return references
      } })
    const scientificTools = loop.handoff ? loop.scientificTools() : []
    const authorTools = ['research_propose', 'research_review', 'research_feedback', 'research_run', 'research_status', 'research_conclude',
      'orchestrator_report', ...(config.inheritedTools ?? []), ...(config.extraAuthorTools ?? []).map(tool => tool.name),
      ...scientificTools.map(tool => tool.name)]
    loop.adapter = await NativeResearchAdapter.open(ctx, { ...config, authorTools,
      ...((loop.handoff || config.assertAdmissionPremises) ? { assertAdmissionPremises: async (manifest: Manifest, state: ResearchState, owner: Agent) => {
        await config.assertAdmissionPremises?.(manifest, state, owner)
        await loop.refreshScientificIndex()
        await loop.handoff?.assertManifest(manifest)
      } } : {}),
      afterSettlement: async (association, owner, signal) => {
        await config.afterSettlement?.(association, owner, signal)
        await loop.outcome(association)
      } })
    try {
      if (loop.handoff) {
        loop.requiredContext = new NativeRequiredContext(ctx)
        loop.disposers.push(() => loop.requiredContext!.close())
      }
      loop.disposers.push(loop.adapter.register({ toolScope: 'author', inheritedTools: config.inheritedTools ?? [] }))
      for (const tool of [...loop.coordination.tools(), loop.reviewer.tool(), ...loop.tools(), ...(config.extraAuthorTools ?? []), ...scientificTools])
        loop.disposers.push(author.ctx.tools.register(tool))
      loop.disposers.push(author.ctx.tools.guard(exec => {
        const args = exec.arguments as Record<string, unknown>
        if (exec.name !== 'orchestrator_report') return
        if (args.state === 'ready' || args.state === 'dropped') {
          const state = loop.state()
          if (!state.stopped || !state.loop.decision || (args.state === 'ready' && state.loop.decision.kind !== 'goal_completion'))
            return 'Terminal native reports require the exact separately reviewed production loop conclusion; use progress while research remains active'
        }
        if (args.human_action == null) return
        const question = loop.steeringQuestion()
        if (question !== null && args.human_action === question) return
        return 'Human scientific steering must match the exact separately reviewed scientific-exhaustion question'
      }))
      loop.disposers.push(author.ctx.systemPrompt.section({ name: 'production-research-loop', order: 10002, interpolate: false,
        text: `${AUTHOR_INSTRUCTIONS} This is the production loop for the registered project, not a one-shot fixture. Use research_status after review/results. It captures actual reviewer/source feedback and current costs/bounds. When adopting feedback, pass feedback_item_id and feedback_reason to research_propose. design_json is project-defined data validated by the proposal factory. A normal valid negative or request_changes leads to another materially changed scoped proposal and fresh review. research_run returns actual evidence and queues a native outcome wakeup; never relaunch an admitted action. End the goal through research_conclude with goal_completion only when the domain evidence fulfils the goal. scientific_exhaustion requires actual alternatives, orthogonal rebrainstorm, domain assessment and separate review; missing budget/review/process authority is an operational hold. Keep ordinary reports human_action=null. Optional feedback and publication failure never grant admission or block otherwise admissible research.` }))
      await json('installation.json', { kind: 'native_production_research_installation', policy: config.policy,
        author_session_id: author.id, binding: policy.binding, tool_names: authorTools, artifact_prefix: config.artifactPrefix })
      return loop
    } catch (error) { loop.close(); throw error }
  }
  private state() {
    const state = this.config.table.get(this.config.projectKey)
    if (!state) throw new Error('Existing registered project authority required')
    return Version4ResearchStateSchema.parse(state)
  }
  private async refreshScientificIndex() {
    if (this.handoff && this.config.resolveScientificEvidenceIndex) {
      const state = await this.authority(), index = await this.config.resolveScientificEvidenceIndex(state)
      if (this.state().revision !== state.revision) throw new Error('Scientific context changed during index resolution')
      await this.handoff.advanceIndex(index)
    }
  }
  private async authority() {
    if (this.ctx.agents.get(this.author.id) !== this.author) throw new Error('Production native author was replaced')
    await this.config.assertActiveAuthority(this.author)
    const state = this.state()
    if (this.ctx.agents.get(this.author.id) !== this.author || state.stopped || !equalIdentity(state.binding, this.policy.binding)
      || !equalIdentity(state.policy, this.config.policy)) throw new Error('Current production authority/profile is stopped or changed')
    return state
  }
  private async json(name: string, value: unknown) {
    return this.config.artifacts.writeOnce(`${this.config.artifactPrefix}/${name}`, Buffer.from(canonicalJson(value)))
  }
  async syncFeedback() {
    let state = await this.authority()
    const sourceId = `native-review:${state.authority.authority_id}`
    const candidates = Object.values(state.review_requests).filter(request => request.phase === 'request_changes' && request.receipt)
    const items = []
    for (const request of candidates) {
      const review = ReviewSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(request.receipt!)).toString()))
      if (review.subject_kind !== 'scientific_action') continue
      if (!request.native_message_id || !review.manifest || review.author_session_id !== this.author.id)
        throw new Error('Reviewer feedback requires its actual native author/message/manifest provenance')
      const content = await this.json(`feedback/reviewer-${request.receipt!.sha256}.json`, { kind: 'native_reviewer_feedback',
        source_id: sourceId, message_id: request.native_message_id, source_version: request.receipt!.sha256,
        actor: request.reviewer_session_id, review: request.receipt, completion: review.completion, manifest: review.manifest, reason: review.reason })
      items.push({ message_id: request.native_message_id, source_version: request.receipt!.sha256, content })
    }
    const end = `native-review-cut:${sha256(canonicalJson(items))}`
    const previous = state.feedback.cursors[sourceId]
    if (items.length && previous?.cursor !== end) {
      const page = { cursor: previous?.cursor ?? 'start', next_cursor: null, items }
      const capture = await this.json(`feedback/page-${sha256(canonicalJson(page))}.json`, page)
      const scan = await this.json(`feedback/scan-${sha256(canonicalJson([sourceId, page, end]))}.json`,
        { source_id: sourceId, start_cursor: page.cursor, end_cursor: end, pages: [{ ...page, capture }] })
      await this.coordination.capture(scan)
    }
    if (this.config.hooks.feedbackScan) {
      try {
        const scan = await this.config.hooks.feedbackScan(this.state())
        if (scan) await this.coordination.capture(scan)
      } catch (error) {
        const value = { kind: 'optional_feedback_source_unavailable', reason: String(error) }
        await this.json(`feedback/held-${sha256(canonicalJson(value))}.json`, value)
      }
    }
    state = await this.authority()
    for (const item of Object.values(state.feedback.items)) {
      if (item.disposition !== 'adopted' || item.effect || !item.changed_action) continue
      const action = Object.values(state.actions).find(action => equalIdentity(action.manifest, item.changed_action))
      if (action?.phase === 'settled' && action.evidence)
        await this.coordination.effect(item.item_id, item.changed_action, action.evidence)
    }
  }
  async status() {
    let state = this.state()
    if (this.ctx.agents.get(this.author.id) !== this.author || !equalIdentity(state.binding, this.policy.binding))
      throw new Error('Exact registered author/profile required for production status')
    if (!state.stopped && state.hold === null) await this.syncFeedback()
    state = this.state()
    await this.refreshScientificIndex()
    const maxActions = this.config.statusMaxActions ?? 16
    if (!Number.isSafeInteger(maxActions) || maxActions <= 0) throw new Error('Positive bounded status action window required')
    const all = Object.values(state.actions), selected = all.slice(-maxActions)
    const actions = []
    for (const action of selected) {
      const evidence = action.evidence ? EvidenceSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(action.evidence)).toString())) : null
      const checkpoint = action.checkpoint ? CheckpointSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(action.checkpoint)).toString())) : null
      actions.push({ action_id: action.action_id, phase: action.phase, evidence_ref: action.evidence, checkpoint_ref: action.checkpoint, evidence, checkpoint })
    }
    const status = { state_revision: state.revision, binding: state.binding, stopped: state.stopped, hold: state.hold,
      standing_policy: { goal_id: this.policy.goal_id, goal_revision: this.policy.goal_revision, allowed_operations: this.policy.allowed_operations },
      budget: { consumed_attempts: state.consumed_attempts, max_attempts: this.policy.max_attempts,
        consumed_timeout_ms: state.consumed_timeout_ms, reserved_timeout_ms: state.reserved_timeout_ms,
        max_total_timeout_ms: this.policy.max_total_timeout_ms, consumed_review_requests: state.consumed_review_requests,
        max_review_requests: this.policy.review_limits!.max_requests },
      actions, total_actions: all.length, omitted_actions: all.length - selected.length, loop: state.loop,
      feedback: Object.values(state.feedback.items), publications: Object.values(state.publications),
      ...(this.handoff ? { scientific_context: await this.handoff.context() } : {}) }
    if (!this.handoff) return status
    const scientific = await this.handoff.discovery()
    if (!status.scientific_context || !equalIdentity(scientific.evidence_index, status.scientific_context.evidence_index))
      throw new Error('Scientific index changed while preparing status discovery')
    const retained = { kind: 'retained_research_status.v1', status }
    const bytes = Buffer.from(canonicalJson(retained))
    if (bytes.length > this.config.artifacts.maxReadBytes) throw new Error('Complete retained status exceeds declared artifact capture limit')
    const fullStatus = await this.config.artifacts.writeOnce(`${this.config.artifactPrefix}/status/${sha256(bytes)}.json`, bytes)
    const control = { kind: 'research_status_discovery.v1', state_revision: status.state_revision, stopped: status.stopped,
      hold: status.hold ? { kind: status.hold.kind, reason: 'Read the complete retained status for the exact hold' } : null,
      budget: status.budget, scientific, full_status: fullStatus,
      status_retrieval: { tool: 'research_status_read', default_page_bytes: 1024 }, execution_authority: false }
    const limits = this.config.scientificInlineLimits ?? SCIENTIFIC_INLINE_LIMITS
    let delivery = control
    try { boundedJsonContent(delivery, limits) } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('overflow')) throw error
      delivery = { ...control, scientific: { ...scientific,
        lesson_catalog: { ...scientific.lesson_catalog, complete: false, entries: [] } } }
      boundedJsonContent(delivery, limits)
    }
    if (this.state().revision !== state.revision) throw new Error('State changed while retaining scientific status')
    return { ...status, scientific_delivery: delivery }
  }
  private async outcome(association: RunAssociation) {
    await this.syncFeedback()
    const state = await this.authority(), action = state.actions[association.action_id]
    if (!action || action.phase !== 'settled' || !action.checkpoint || !action.evidence) throw new Error('Native outcome wakeup lacks settled evidence')
    if (this.config.publication) {
      try {
        const release = await this.config.publication.release(action.checkpoint, state)
        await publishCheckpoint({ artifacts: this.config.artifacts, table: this.config.table, projectKey: this.config.projectKey,
          artifactPrefix: this.config.artifactPrefix, checkpoint: action.checkpoint, release,
          audience: this.config.publication.audience, maxAttempts: this.config.publication.maxAttempts, transport: this.config.publication.transport })
      } catch (error) { await this.json(`publication/preparation-${sha256(String(error))}.json`, { kind: 'optional_publication_pending', reason: String(error) }) }
    }
    const noticeId = `outcome-${action.action_id}-${action.checkpoint.sha256}`
    if (!this.state().loop.notifications[noticeId]) {
      const message = createUserMessage({ source: { kind: 'research-outcome', form: 'notice', summary: 'Settled scientific evidence; existing project authority retained' },
        content: [{ type: 'text', text: `Internal settled research outcome under the existing project authority. Read research_status and the exact checkpoint/evidence; choose a justified successor or reviewed conclusion. Ordinary negative/procedural outcomes require no human input. ${this.handoff ? 'Read the common scientific_context and retained lessons; compare lawful alternatives and freeze the inner-loop decision through research_decision before proposing its bound action. ' : ''}${canonicalJson({ action_id: action.action_id, evidence: action.evidence, checkpoint: action.checkpoint })}` }] })
      const content = await this.json(`outcomes/${noticeId}/message.json`, message)
      await this.config.table.update(this.config.projectKey, current => {
        const parsed = Version4ResearchStateSchema.parse(current)
        if (parsed.loop.notifications[noticeId]) return parsed
        return Version4ResearchStateSchema.parse({ ...parsed, revision: parsed.revision + 1,
          loop: { ...parsed.loop, notifications: { ...parsed.loop.notifications, [noticeId]: {
            action_id: action.action_id, checkpoint: action.checkpoint, content, message_id: message.id, status: 'pending', observation: null } } } })
      })
    }
    await this.deliverNotice(noticeId)
  }
  private async deliverNotice(noticeId: string) {
    const notice = this.state().loop.notifications[noticeId]
    if (!notice || notice.status === 'observed') return
    await this.authority()
    const message = JSON.parse(Buffer.from(await this.config.artifacts.read(notice.content)).toString()) as UserMessage
    if (message.id !== notice.message_id || message.source.kind !== 'research-outcome') throw new Error('Retained native wakeup identity differs')
    const observed = () => this.author.session.snapshotEvents().find(event => event.type === 'agent/inbox/spliced'
      && event.data.inserted.some(item => item.id === message.id))
    if (!observed()) this.author.followup(message)
    if (!await this.ctx.sessions.flush(this.author.session)) throw new Error('Native outcome inbox durability is unqualified; pending notice retained')
    const event = observed()
    if (!event) throw new Error('Actual native outcome inbox insertion is unresolved')
    const proof = await this.json(`outcomes/${noticeId}/observed.json`, { session_id: this.author.id, message_id: message.id, event,
      durability: 'existing native SessionStore.flush' })
    await this.authority()
    await this.config.table.update(this.config.projectKey, current => {
      const parsed = Version4ResearchStateSchema.parse(current), existing = parsed.loop.notifications[noticeId]
      if (!existing || !equalIdentity(existing.content, notice.content) || existing.message_id !== notice.message_id) throw new Error('Outcome notification changed before acknowledgement')
      if (existing.status === 'observed') return parsed
      return Version4ResearchStateSchema.parse({ ...parsed, revision: parsed.revision + 1,
        loop: { ...parsed.loop, notifications: { ...parsed.loop.notifications, [noticeId]: { ...existing, status: 'observed', observation: proof } } } })
    })
  }
  /** Existing Source/startup/scheduled readers invoke this; no new scheduler is introduced. */
  async wake(reason: string) {
    if (this.state().stopped) return { status: 'held', state: await this.status() }
    if (this.author.status !== 'idle') return { status: 'running', state_revision: this.state().revision }
    const retained = await this.authority()
    if (retained.hold?.kind === 'review_unavailable' && retained.hold.owner === this.author.id) {
      for (const request of Object.values(retained.review_requests)) {
        if (request.receipt || !retained.hold.affected.includes(request.action_id)) continue
        const subject = JSON.parse(Buffer.from(await this.config.artifacts.read(request.manifest)).toString())
        // Reconcile the original request only; the known association path cannot dispatch again.
        if (subject.kind === 'research_decision') await this.reviewer.reviewDecision(request.manifest, this.author, AbortSignal.timeout(5000))
        else await this.reviewer.review(request.manifest, this.author, AbortSignal.timeout(5000))
      }
    }
    const status = await this.status()
    if (status.stopped || status.hold !== null || this.state().active_action_id !== null) return { status: 'held', state: status }
    await this.authority()
    for (const [id, notice] of Object.entries(this.state().loop.notifications)) if (notice.status === 'pending') await this.deliverNotice(id)
    this.author.followup(createUserMessage({ source: { kind: 'research-outcome', form: 'notice', summary: 'Existing research authority wakeup' },
      content: [{ type: 'text', text: `${reason}\nRead research_status and continue the original bounded goal using retained receipts. No budget/reset/unchanged-action replay is authorized.` }] }))
    return { status: 'queued', state_revision: status.state_revision }
  }
  private steeringQuestion() {
    const state = this.state()
    if (!state.stopped || state.hold?.kind !== 'other' || state.hold.owner !== this.author.id || !this.approvedSteering
      || !equalIdentity(state.binding, this.policy.binding) || !equalIdentity(state.policy, this.config.policy)
      || !equalIdentity(state.hold.evidence, this.approvedSteering.evidence)) return null
    return this.approvedSteering.question
  }
  async conclude(kind: DecisionSubject['subject_kind'], rationale: string, signal: AbortSignal, retainedSubject?: ArtifactReference) {
    const state = await this.authority()
    if (state.active_action_id !== null) throw new Error('Unknown/active execution cannot be converted into scientific completion or exhaustion')
    const previous = retainedSubject && Object.values(state.review_requests).find(request => equalIdentity(request.manifest, retainedSubject))
    if (state.hold !== null && !(previous && state.hold.kind === 'review_unavailable' && state.hold.affected.includes(previous.action_id)))
      throw new Error('Operational hold cannot be converted into scientific completion or exhaustion')
    const subject = DecisionSubjectSchema.parse(retainedSubject
      ? JSON.parse(Buffer.from(await this.config.artifacts.read(retainedSubject)).toString())
      : await this.config.hooks.decision(kind, rationale, state))
    if (subject.subject_kind !== kind) throw new Error('Domain decision changed the requested subject kind')
    const ref = retainedSubject ?? await this.json(`decisions/subject-${sha256(canonicalJson(subject))}.json`, subject)
    const reviewed = await this.reviewer.reviewDecision(ref, this.author, signal)
    if (reviewed.decision !== 'approve' || !reviewed.review) return { status: 'held', subject: ref, review: reviewed, human_action: null }
    const fresh = await this.authority()
    await this.config.hooks.assertDecisionPremises(subject, fresh)
    const current = await this.authority()
    if (current.revision !== fresh.revision || current.active_action_id !== null || current.hold !== null) throw new Error('Conclusion premises changed after separate review')
    const original = CheckpointSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(subject.checkpoint)).toString()))
    const checkpoint = CheckpointSchema.parse({ ...original, checkpoint_id: `${original.checkpoint_id}:${kind}:${ref.sha256}`,
      rationale, decision: 'stop', next_action: null, stopped: true, hold: null,
      evidence: [...original.evidence, subject.checkpoint, ref], reviews: [...original.reviews, reviewed.review],
      exhaustion: kind === 'scientific_exhaustion' ? { scope: subject.scope, alternatives: subject.alternatives,
        rebrainstorm: subject.rebrainstorm!, separate_review: reviewed.review } : null })
    const checkpointRef = await this.json(`decisions/checkpoint-${sha256(canonicalJson(checkpoint))}.json`, checkpoint)
    await this.config.table.update(this.config.projectKey, old => {
      if (old.revision !== current.revision || old.stopped || old.hold !== null || old.active_action_id !== null)
        throw new Error('Current authority changed before the reviewed conclusion')
      return ResearchStateSchema.parse({ ...old, revision: old.revision + 1, stopped: true,
        loop: { ...Version4ResearchStateSchema.parse(old).loop, decision: { kind, subject: ref, review: reviewed.review!, checkpoint: checkpointRef, human_question: subject.human_question } },
        hold: { kind: 'other', owner: this.author.id, reason: kind === 'goal_completion' ? 'Goal completed through domain evidence and separate review' : 'Scoped scientific exhaustion separately reviewed',
          evidence: [ref, reviewed.review!, checkpointRef], affected: [this.policy.goal_id],
          exit_condition: kind === 'goal_completion' ? 'New separately authorized goal/context without resetting aggregate history' : 'Reviewed scientific steering/context revision preserving aggregate history',
          next_check: kind === 'goal_completion' ? 'Goal complete; no automatic successor' : 'Existing project steering source', reassess_at: new Date(Date.now() + 86400000).toISOString() } })
    })
    if (kind === 'scientific_exhaustion') this.approvedSteering = { question: subject.human_question!, evidence: [ref, reviewed.review, checkpointRef] }
    return { status: kind === 'goal_completion' ? 'complete' : 'scientific_exhaustion', checkpoint: checkpointRef,
      review: reviewed.review, human_action: kind === 'scientific_exhaustion' ? subject.human_question : null }
  }
  private scientificTools(): ToolDefinition[] {
    const handoff = this.handoff!
    const output = { schema: { type: 'json' as const }, render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value) }] }
    const ref = { type: 'object', additionalProperties: false, properties: {
      uri: { type: 'string', required: true }, sha256: { type: 'string', required: true }, size_bytes: { type: 'integer', required: true } } } as const
    const owner = (agent: Agent | undefined) => { if (agent !== this.author) throw new Error('Exact native author required for scientific handoff') }
    const page = async (reference: ArtifactReference, args: Record<string, unknown>) => {
      const offset = z.number().int().nonnegative().parse(args.offset_bytes ?? 0)
      if (args.length_bytes !== undefined)
        return { offset_bytes: offset, length_bytes: z.number().int().positive().parse(args.length_bytes) }
      if (!reference.size_bytes) {
        if (offset !== 0) throw new Error('Scientific context offset is outside the complete artifact')
        return undefined
      }
      const bytes = Buffer.from(await this.config.artifacts.read(reference))
      if (offset >= bytes.length) throw new Error('Scientific context offset is outside the complete artifact')
      let length = Math.min(1024, bytes.length - offset)
      while (length > 0 && !Buffer.from(bytes.subarray(offset, offset + length).toString('utf8')).equals(bytes.subarray(offset, offset + length))) length--
      if (!length) throw new Error('Scientific context default page requires exact UTF-8')
      return { offset_bytes: offset, length_bytes: length }
    }
    const readParameters = { reference: { ...ref, required: true }, offset_bytes: { type: 'integer' }, length_bytes: { type: 'integer' } } as const
    const boundedOutput = { schema: { type: 'json' as const }, render: (_args: unknown, value: unknown) =>
      boundedJsonContent(value, this.config.scientificInlineLimits ?? SCIENTIFIC_INLINE_LIMITS) }
    return [defineTool({ name: 'research_context', description: 'Read exact pinned scientific metadata, lesson bodies and catalog pages. Default is an explicit UTF-8 byte page; follow next_offset_bytes until complete.',
      parameters: readParameters, output: boundedOutput,
      execute: async (args, exec) => {
        owner(exec.agent); await this.refreshScientificIndex()
        const reference = ByteRef.parse(args.reference)
        // Validate membership before reading a caller-supplied path for default-page sizing.
        await handoff.assertContextReference(reference)
        const result = await handoff.readContext(reference, await page(reference, args))
        boundedJsonContent(result, this.config.scientificInlineLimits ?? SCIENTIFIC_INLINE_LIMITS)
        return result
      } }),
    defineTool({ name: 'research_status_read', description: 'Read a complete retained status from this exact project/profile and current scientific index, with explicit byte paging and completeness.',
      parameters: readParameters, output: boundedOutput,
      execute: async (args, exec) => {
        owner(exec.agent); await this.refreshScientificIndex()
        const reference = ByteRef.parse(args.reference)
        if (reference.uri !== `${this.config.artifactPrefix}/status/${reference.sha256}.json`) throw new Error('Status snapshot is outside the exact retained status namespace')
        const artifacts = this.config.artifacts.withReadPrefixes(this.policy.allowed_read_prefixes)
        const retained = JSON.parse(Buffer.from(await artifacts.read(reference)).toString('utf8'))
        const discovery = await handoff.discovery()
        if (retained.kind !== 'retained_research_status.v1' || !equalIdentity(retained.status?.binding, this.policy.binding)
          || !equalIdentity(retained.status?.scientific_context?.evidence_index, discovery.evidence_index))
          throw new Error('Retained status uses a stale scientific index or different profile')
        const result = await readArtifactPage(artifacts, reference, await page(reference, args))
        boundedJsonContent(result, this.config.scientificInlineLimits ?? SCIENTIFIC_INLINE_LIMITS)
        await this.authority()
        return result
      } }),
    defineTool({ name: 'research_decision', description: 'Retain an evidence-backed inner-loop decision and bind its scientific plan; this supplies no review or execution approval.',
      parameters: { decision_json: { type: 'string', required: true }, scientific_plan: ref }, output,
      execute: async (args, exec) => {
        owner(exec.agent)
        await this.refreshScientificIndex()
        const decision = await handoff.freezeDecision(JSON.parse(z.string().min(1).parse(args.decision_json)))
        const plan = args.scientific_plan ? ByteRef.parse(args.scientific_plan)
          : await this.json(`scientific-plans/${decision.sha256}.json`, { kind: 'scientific_plan_from_decision.v1', decision,
            scope: 'inner_loop', execution_authority: false })
        return { decision, plan_association: plan ? await handoff.bindPlan(plan, decision) : null,
          prerequisites: plan ? await handoff.prerequisites(plan, decision) : [], execution_authority: false }
      } }),
    defineTool({ name: 'research_evidence', description: 'Read the exact complete UTF-8 evidence from the pinned released scientific index; arbitrary/protected/bulk-auditor reads are refused.',
      parameters: { reference: { ...ref, required: true }, offset_bytes: { type: 'integer' }, length_bytes: { type: 'integer' } }, output,
      execute: async (args, exec) => {
        owner(exec.agent); await this.refreshScientificIndex()
        const page = args.offset_bytes !== undefined || args.length_bytes !== undefined
          ? { offset_bytes: z.number().int().nonnegative().parse(args.offset_bytes), length_bytes: z.number().int().positive().parse(args.length_bytes) } : undefined
        return handoff.readEvidence(ByteRef.parse(args.reference), page)
      } })]
  }
  private tools(): ToolDefinition[] {
    const output = { schema: { type: 'json' as const }, render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value) }] }
    const owner = (agent: Agent | undefined) => { if (agent !== this.author) throw new Error('Exact native author required for production loop control') }
    const statusOutput = this.handoff ? { schema: { type: 'json' as const }, render: (_args: unknown, value: unknown) =>
      boundedJsonContent((value as { scientific_delivery: unknown }).scientific_delivery, this.config.scientificInlineLimits ?? SCIENTIFIC_INLINE_LIMITS) } : output
    return [defineTool({ name: 'research_status', description: 'Capture complete status in an immutable artifact; expose bounded scientific discovery, every lesson catalog and exact read routes while preserving aggregate bounds.', parameters: {}, output: statusOutput,
      ...(this.handoff ? { finalizeContent: (_exec: unknown, result: { isError: boolean; value?: unknown }) => {
        if (result.isError) return undefined
        try { return statusOutput.render({}, result.value) } catch { return [{ type: 'text' as const, text: 'Scientific discovery delivery invalid; provider inference requires exact retained discovery.' }] }
      } } : {}),
      execute: async (_args, exec) => {
        owner(exec.agent)
        const status = await this.status()
        const modelCall = this.author.session.snapshotEvents().some(event => event.type === 'assistant/message'
          && event.data.message.content.some(block => block.type === 'tool-call' && block.id === exec.callId && block.name === 'research_status'))
        if ('scientific_delivery' in status && modelCall) this.requiredContext?.require(this.author.id, statusOutput.render({}, status))
        return JSON.parse(JSON.stringify(status))
      } }),
    defineTool({ name: 'research_conclude', description: 'Review a domain-backed goal completion or scoped scientific exhaustion before ending the autonomous loop.',
      parameters: { kind: { type: 'string', enum: ['goal_completion', 'scientific_exhaustion'], required: true }, rationale: { type: 'string', required: true },
        subject: { type: 'object', additionalProperties: false, description: 'Exact retained decision subject for reconciliation of an interrupted review.', properties: {
          uri: { type: 'string', required: true }, sha256: { type: 'string', required: true }, size_bytes: { type: 'integer', required: true } } } }, output,
      execute: async (args, exec) => { owner(exec.agent); return JSON.parse(JSON.stringify(await this.conclude(z.enum(['goal_completion', 'scientific_exhaustion']).parse(args.kind), z.string().min(1).parse(args.rationale), exec.signal,
        args.subject ? ByteRef.parse(args.subject) : undefined))) } })]
  }
  close() { while (this.disposers.length) this.disposers.pop()!() }
}
