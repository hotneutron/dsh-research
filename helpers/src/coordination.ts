import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { z } from 'zod'
import { ByteRef, Id, ManifestSchema, EvidenceSchema, CheckpointSchema } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { ResearchStateSchema } from './admission.js'
import type { ResearchState } from './admission.js'
import { captureFeedback, disposeFeedback, FeedbackScanSchema, recordFeedbackEffect } from './collaboration.js'
import type { FeedbackState } from './collaboration.js'
import { canonicalJson, deriveActionId, sha256 } from './bindings.js'
import { ProjectArtifacts, loadManifest, verifyIdentity } from './manifest.js'

export const ProposalRequestSchema = z.strictObject({ operation: Id, plan_revision: Id,
  checkpoint: ByteRef.nullable(), feedback_item_id: Id.nullable(), design_json: z.string().optional(), feedback_reason: Id.optional() })
export interface NativeCoordinationConfig {
  artifactPrefix?: string
  artifacts: ProjectArtifacts
  table: KvTable<string, ResearchState>
  projectKey: string
  authorSessionId: string
  /** Mandatory in a production installer; verify fresh native Ticket, mandate and pause. */
  assertActiveAuthority?: (owner: Agent) => void | Promise<void>
  beforePropose?: () => Promise<void>
  afterPropose?: (ref: ArtifactReference, manifest: Manifest, args: z.infer<typeof ProposalRequestSchema>) => Promise<void>
  validateDisposition?: (item: FeedbackState['items'][string], manifest: Manifest, state: ResearchState) => Promise<void>
  /** Project code owns scientific plan construction; the package freezes/checks the result. */
  propose(args: z.infer<typeof ProposalRequestSchema>, state: ResearchState): Promise<Omit<Manifest, 'action_id'>>
}

export class NativeCoordinationTools {
  constructor(private readonly ctx: Context, private readonly config: NativeCoordinationConfig) {}
  private owner(agent: Agent | undefined): Agent {
    if (!agent || agent.id !== this.config.authorSessionId || this.ctx.agents.get(agent.id) !== agent) throw new Error('Only the exact configured author may mutate project coordination')
    return agent
  }
  private async current(agent?: Agent) {
    const owner = this.owner(agent ?? this.ctx.agents.get(this.config.authorSessionId as Agent['id']))
    await this.config.assertActiveAuthority?.(owner)
    this.owner(owner)
    const state = this.config.table.get(this.config.projectKey)
    if (!state || state.stopped) throw new Error('Current registered author authority is stopped or missing')
    return state
  }
  private unchanged(current: ResearchState, expected: ResearchState) {
    if (current.stopped || current.revision !== expected.revision || canonicalJson(current.binding) !== canonicalJson(expected.binding)
      || canonicalJson(current.policy) !== canonicalJson(expected.policy)) throw new Error('Project coordination authority changed before durable update')
  }
  async propose(input: unknown, agent: Agent) {
    const args = ProposalRequestSchema.parse(input)
    this.owner(agent)
    await this.config.beforePropose?.()
    const state = await this.current(agent)
    if (state.stopped) throw new Error('Explicit stop prevents a new proposal')
    if (args.checkpoint) await this.config.artifacts.read(args.checkpoint)
    if (args.feedback_item_id && !state.feedback.items[args.feedback_item_id]) throw new Error('Proposal feedback version is not durably captured')
    const subject = await this.config.propose(args, state)
    const fresh = await this.current(agent)
    this.unchanged(fresh, state)
    const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
    if (manifest.author_session_id !== agent.id || canonicalJson(manifest.binding) !== canonicalJson(state.binding)) throw new Error('Project proposal changed its authority/profile')
    await verifyIdentity(manifest, this.config.artifacts)
    this.unchanged(await this.current(agent), state)
    const bytes = Buffer.from(canonicalJson(manifest))
    const uri = `${this.config.artifactPrefix ?? 'snapshots'}/proposals/${manifest.action_id}.json`
    const ref: ArtifactReference = { uri, sha256: sha256(bytes), size_bytes: bytes.byteLength }
    try { await this.config.artifacts.write(uri, bytes) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await this.config.artifacts.read(ref)
    }
    await this.config.afterPropose?.(ref, manifest, args)
    return { manifest: ref, action_id: manifest.action_id, state_revision: this.config.table.get(this.config.projectKey)!.revision }
  }
  async capture(scanRef: ArtifactReference) {
    await this.current()
    const scan = FeedbackScanSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(scanRef)).toString()))
    for (const page of scan.pages) {
      const captured = JSON.parse(Buffer.from(await this.config.artifacts.read(page.capture)).toString())
      if (canonicalJson(captured) !== canonicalJson({ cursor: page.cursor, next_cursor: page.next_cursor, items: page.items })) throw new Error('Feedback page capture differs from the scan')
      for (const item of page.items) await this.config.artifacts.read(item.content)
    }
    const expected = await this.current()
    const next = await this.config.table.update(this.config.projectKey, current => {
      this.unchanged(current, expected)
      let feedback = captureFeedback(current.feedback, scan, scanRef)
      if (current.schema_version === 4 && feedback !== current.feedback)
        feedback = { ...feedback, items: Object.fromEntries(Object.entries(feedback.items).map(([id, item]) => [id,
          current.feedback.items[id] ? item : { ...item, captured_revision: current.revision + 1 }])) }
      return feedback === current.feedback ? current : ResearchStateSchema.parse({ ...current, revision: current.revision + 1, feedback })
    })
    return { items: Object.values(next.feedback.items), state_revision: next.revision }
  }
  async disposition(itemId: string, disposition: 'adopted' | 'rejected' | 'deferred' | 'stale', reason: string, action: ArtifactReference | null) {
    const manifest = action ? await loadManifest(action, this.config.artifacts) : null
    const expected = await this.current()
    const item = expected.feedback.items[itemId]
    if (!item) throw new Error('Feedback version is not captured')
    if (disposition === 'adopted' && manifest && action) {
      const identical = item.disposition === 'adopted' && item.reason === reason && item.changed_action?.sha256 === action.sha256
      if (!identical && expected.schema_version === 4) {
        if (!('captured_revision' in item) || item.captured_revision === undefined || expected.actions[manifest.action_id])
          throw new Error('Prospective feedback adoption requires a captured revision and an unadmitted changed action')
        if (canonicalJson(manifest.binding) !== canonicalJson(expected.binding) || manifest.author_session_id !== this.config.authorSessionId)
          throw new Error('Feedback successor differs from the current author/profile')
        if (!this.config.validateDisposition) throw new Error('Production feedback requires the registered project change validator')
        await this.config.validateDisposition(item, manifest, expected)
        this.unchanged(await this.current(), expected)
      }
    }
    const state = await this.config.table.update(this.config.projectKey, current => {
      this.unchanged(current, expected)
      const feedback = disposeFeedback(current.feedback, itemId, disposition, reason, action)
      return feedback === current.feedback ? current : ResearchStateSchema.parse({ ...current, revision: current.revision + 1, feedback })
    })
    return { item: state.feedback.items[itemId], state_revision: state.revision }
  }
  async effect(itemId: string, action: ArtifactReference, evidenceRef: ArtifactReference) {
    const manifest = await loadManifest(action, this.config.artifacts)
    const evidence = EvidenceSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(evidenceRef)).toString()))
    const expected = await this.current()
    const associated = expected.actions[manifest.action_id]
    if (!associated || associated.phase !== 'settled' || associated.evidence?.sha256 !== evidenceRef.sha256 || evidence.action_id !== manifest.action_id) throw new Error('Executed feedback effect lacks the actual settled action receipt')
    const previous = this.config.table.get(this.config.projectKey)!.feedback.items[itemId]
    if (previous?.effect_checkpoint && previous.effect?.sha256 === evidenceRef.sha256 && previous.changed_action?.sha256 === action.sha256)
      return { item: previous, checkpoint: previous.effect_checkpoint, state_revision: this.config.table.get(this.config.projectKey)!.revision }
    const capturedRevision = previous && 'captured_revision' in previous && typeof previous.captured_revision === 'number' ? previous.captured_revision : null
    if (expected.schema_version === 4 && (capturedRevision === null || associated.admitted_revision <= capturedRevision))
      throw new Error('Executed production feedback must have been captured before the corresponding scientific admission')
    if (associated.checkpoint === null) throw new Error('Effect has no original checkpoint')
    const feedback = recordFeedbackEffect(this.config.table.get(this.config.projectKey)!.feedback, itemId, action, evidenceRef, evidence.scientific_status === 'eligible' ? 'executed' : 'failed')
    const original = CheckpointSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(associated.checkpoint)).toString()))
    const corrected = CheckpointSchema.parse({ ...original, checkpoint_id: `${original.checkpoint_id}:effect:${itemId}`,
      rationale: `${original.rationale}. This version records the actual feedback effect and supersedes checkpoint ${associated.checkpoint.sha256}.`,
      evidence: [...original.evidence, associated.checkpoint], feedback: Object.values(feedback.items).filter(i => i.disposition !== 'pending').map(i => ({
        source: i.content, disposition: i.reason ?? i.disposition, effect: i.effect, status: i.effect_status })) })
    const checkpointRef = await this.config.artifacts.writeOnce(`${this.config.artifactPrefix ?? 'snapshots'}/effect-checkpoints/${corrected.checkpoint_id}.json`, Buffer.from(canonicalJson(corrected)))
    this.unchanged(await this.current(), expected)
    const state = await this.config.table.update(this.config.projectKey, current => {
      this.unchanged(current, expected)
      const next = recordFeedbackEffect(current.feedback, itemId, action, evidenceRef, evidence.scientific_status === 'eligible' ? 'executed' : 'failed')
      return ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
        feedback: { ...next, items: { ...next.items, [itemId]: { ...next.items[itemId]!, effect_checkpoint: checkpointRef } } } })
    })
    return { item: state.feedback.items[itemId], checkpoint: checkpointRef, state_revision: state.revision }
  }
  tools(): ToolDefinition[] {
    const reference = { type: 'object' as const, additionalProperties: false, properties: { uri: { type: 'string' as const, required: true as const }, sha256: { type: 'string' as const, required: true as const }, size_bytes: { type: 'integer' as const, required: true as const } } }
    const optionalRef = { oneOf: [reference, { type: 'null' as const }] as const }
    const output = { schema: { type: 'json' as const }, render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value) }] }
    return [defineTool({ name: 'research_propose', description: 'Freeze a bounded project-authored scientific proposal using the configured project factory.',
      parameters: { operation: { type: 'string', required: true }, plan_revision: { type: 'string', required: true }, checkpoint: { ...optionalRef, required: true }, feedback_item_id: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true }, design_json: { type: 'string', description: 'Project-defined JSON design/configuration; the bound proposal factory validates it.' }, feedback_reason: { type: 'string', description: 'Scientific reason for adopting the selected captured feedback version.' } }, output,
      execute: async (args, exec) => JSON.parse(JSON.stringify(await this.propose(args, this.owner(exec.agent)))) }),
      defineTool({ name: 'research_feedback', description: 'Capture a complete feedback scan, disposition a source version or associate its actual settled effect. This grants no launch authority.',
        parameters: { operation: { type: 'string', enum: ['capture', 'disposition', 'effect'], required: true }, scan: { ...optionalRef, required: true },
          item_id: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true }, disposition: { oneOf: [{ type: 'string', enum: ['adopted', 'rejected', 'deferred', 'stale'] }, { type: 'null' }], required: true },
          reason: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true }, action: { ...optionalRef, required: true }, evidence: { ...optionalRef, required: true } }, output,
        execute: async (args, exec) => {
          this.owner(exec.agent)
          if (args.operation === 'capture') return JSON.parse(JSON.stringify(await this.capture(ByteRef.parse(args.scan))))
          if (args.operation === 'disposition') return JSON.parse(JSON.stringify(await this.disposition(Id.parse(args.item_id), z.enum(['adopted', 'rejected', 'deferred', 'stale']).parse(args.disposition), Id.parse(args.reason), args.action === null ? null : ByteRef.parse(args.action))))
          return JSON.parse(JSON.stringify(await this.effect(Id.parse(args.item_id), ByteRef.parse(args.action), ByteRef.parse(args.evidence))))
        } })]
  }
}
