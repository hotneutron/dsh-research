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
import { canonicalJson, deriveActionId, sha256 } from './bindings.js'
import { ProjectArtifacts, loadManifest, verifyIdentity } from './manifest.js'

export const ProposalRequestSchema = z.strictObject({ operation: Id, plan_revision: Id,
  checkpoint: ByteRef.nullable(), feedback_item_id: Id.nullable() })
export interface NativeCoordinationConfig {
  artifacts: ProjectArtifacts
  table: KvTable<string, ResearchState>
  projectKey: string
  authorSessionId: string
  /** Project code owns scientific plan construction; the package freezes/checks the result. */
  propose(args: z.infer<typeof ProposalRequestSchema>, state: ResearchState): Promise<Omit<Manifest, 'action_id'>>
}

export class NativeCoordinationTools {
  constructor(private readonly ctx: Context, private readonly config: NativeCoordinationConfig) {}
  private owner(agent: Agent | undefined): Agent {
    if (!agent || agent.id !== this.config.authorSessionId || this.ctx.agents.get(agent.id) !== agent) throw new Error('Only the exact configured author may mutate project coordination')
    return agent
  }
  async propose(input: unknown, agent: Agent) {
    this.owner(agent)
    const args = ProposalRequestSchema.parse(input)
    const state = this.config.table.get(this.config.projectKey)!
    if (state.stopped) throw new Error('Explicit stop prevents a new proposal')
    if (args.checkpoint) await this.config.artifacts.read(args.checkpoint)
    if (args.feedback_item_id && !state.feedback.items[args.feedback_item_id]) throw new Error('Proposal feedback version is not durably captured')
    const subject = await this.config.propose(args, state)
    const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
    if (manifest.author_session_id !== agent.id || canonicalJson(manifest.binding) !== canonicalJson(state.binding)) throw new Error('Project proposal changed its authority/profile')
    await verifyIdentity(manifest, this.config.artifacts)
    const bytes = Buffer.from(canonicalJson(manifest))
    const uri = `snapshots/proposals/${manifest.action_id}.json`
    const ref: ArtifactReference = { uri, sha256: sha256(bytes), size_bytes: bytes.byteLength }
    try { await this.config.artifacts.write(uri, bytes) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await this.config.artifacts.read(ref)
    }
    return { manifest: ref, action_id: manifest.action_id, state_revision: this.config.table.get(this.config.projectKey)!.revision }
  }
  async capture(scanRef: ArtifactReference) {
    const scan = FeedbackScanSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(scanRef)).toString()))
    for (const page of scan.pages) {
      const captured = JSON.parse(Buffer.from(await this.config.artifacts.read(page.capture)).toString())
      if (canonicalJson(captured) !== canonicalJson({ cursor: page.cursor, next_cursor: page.next_cursor, items: page.items })) throw new Error('Feedback page capture differs from the scan')
      for (const item of page.items) await this.config.artifacts.read(item.content)
    }
    const next = await this.config.table.update(this.config.projectKey, current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
      feedback: captureFeedback(current.feedback, scan, scanRef) }))
    return { items: Object.values(next.feedback.items), state_revision: next.revision }
  }
  async disposition(itemId: string, disposition: 'adopted' | 'rejected' | 'deferred' | 'stale', reason: string, action: ArtifactReference | null) {
    if (action) await loadManifest(action, this.config.artifacts)
    const state = await this.config.table.update(this.config.projectKey, current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
      feedback: disposeFeedback(current.feedback, itemId, disposition, reason, action) }))
    return { item: state.feedback.items[itemId], state_revision: state.revision }
  }
  async effect(itemId: string, action: ArtifactReference, evidenceRef: ArtifactReference) {
    const manifest = await loadManifest(action, this.config.artifacts)
    const evidence = EvidenceSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(evidenceRef)).toString()))
    const associated = this.config.table.get(this.config.projectKey)!.actions[manifest.action_id]
    if (!associated || associated.phase !== 'settled' || associated.evidence?.sha256 !== evidenceRef.sha256 || evidence.action_id !== manifest.action_id) throw new Error('Executed feedback effect lacks the actual settled action receipt')
    const previous = this.config.table.get(this.config.projectKey)!.feedback.items[itemId]
    if (previous?.effect_checkpoint && previous.effect?.sha256 === evidenceRef.sha256 && previous.changed_action?.sha256 === action.sha256)
      return { item: previous, checkpoint: previous.effect_checkpoint, state_revision: this.config.table.get(this.config.projectKey)!.revision }
    if (associated.checkpoint === null) throw new Error('Effect has no original checkpoint')
    const feedback = recordFeedbackEffect(this.config.table.get(this.config.projectKey)!.feedback, itemId, action, evidenceRef, evidence.scientific_status === 'eligible' ? 'executed' : 'failed')
    const original = CheckpointSchema.parse(JSON.parse(Buffer.from(await this.config.artifacts.read(associated.checkpoint)).toString()))
    const corrected = CheckpointSchema.parse({ ...original, checkpoint_id: `${original.checkpoint_id}:effect:${itemId}`,
      rationale: `${original.rationale}. This version records the actual feedback effect and supersedes checkpoint ${associated.checkpoint.sha256}.`,
      evidence: [...original.evidence, associated.checkpoint], feedback: Object.values(feedback.items).filter(i => i.disposition !== 'pending').map(i => ({
        source: i.content, disposition: i.reason ?? i.disposition, effect: i.effect, status: i.effect_status })) })
    const checkpointRef = await this.config.artifacts.writeOnce(`snapshots/effect-checkpoints/${corrected.checkpoint_id}.json`, Buffer.from(canonicalJson(corrected)))
    const state = await this.config.table.update(this.config.projectKey, current => {
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
      parameters: { operation: { type: 'string', required: true }, plan_revision: { type: 'string', required: true }, checkpoint: { ...optionalRef, required: true }, feedback_item_id: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true } }, output,
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
