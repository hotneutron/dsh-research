import { z } from 'zod'
import { ByteRef, Id } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { ProjectArtifacts } from './manifest.js'
import { canonicalJson, sha256 } from './bindings.js'
import { equalIdentity } from './admission.js'

/** Project artifacts, not new native state or execution authority. */
export const ScientificLessonSchema = z.strictObject({
  kind: z.literal('scientific_lesson.v1'), id: Id,
  classification: z.enum(['observation', 'supported_inference', 'tentative_explanation', 'limitation']),
  status: z.enum(['supported', 'negative', 'tentative', 'disputed', 'unresolved', 'superseded']),
  finding: Id, tested_scope: Id, uncertainty: Id,
  support: z.array(ByteRef).min(1), invalidation_conditions: z.array(Id).min(1),
  supersedes: z.array(ByteRef), applicable_decisions: z.array(Id).min(1),
})
export const ScientificEvidenceIndexSchema = z.strictObject({
  kind: z.literal('scientific_evidence_index.v1'), revision: Id,
  previous_index: ByteRef.nullable().default(null),
  original_request: ByteRef, methodology: ByteRef, lessons: z.array(ByteRef).min(1),
  evidence: z.array(z.strictObject({ reference: ByteRef, purpose: Id, access: z.literal('released'),
    delivery: z.enum(['model_readable', 'guarded_auditor_only']), preload: z.boolean().default(true) })).min(1),
})
export const ScientificCapabilitySchema = z.strictObject({
  id: Id, operation: Id, question: Id, observable: Id, prerequisites: z.array(ByteRef),
  configuration_constraints: z.record(Id, z.union([z.string(), z.number().finite(), z.boolean()])).default({}),
})
export const ScientificCapabilityEnvelopeSchema = z.strictObject({
  kind: z.literal('scientific_capability_envelope.v1'), methodology: ByteRef,
  capabilities: z.array(ScientificCapabilitySchema).min(1),
}).superRefine((value, ctx) => {
  if (new Set(value.capabilities.map(row => row.id)).size !== value.capabilities.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate capability identity' })
  if (new Set(value.capabilities.map(row => row.question)).size !== value.capabilities.length)
    ctx.addIssue({ code: 'custom', message: 'Capabilities must declare distinct questions; review still judges scientific value' })
})
const Alternative = z.strictObject({
  id: Id, capability_id: Id.nullable(), question: Id, observable: Id,
  feasible: z.boolean(), unmet_condition: Id.nullable(),
  outcomes: z.array(z.strictObject({ observation: Id, next_action: Id })).min(2),
  protocol_obligation: Id.nullable(), legal_exit: Id,
  costs: z.array(z.strictObject({ unit: Id, estimate: z.number().finite().nonnegative().nullable(),
    unknown_reason: Id.nullable() })).min(1),
}).superRefine((row, ctx) => {
  if (row.feasible && (row.capability_id === null || row.unmet_condition !== null))
    ctx.addIssue({ code: 'custom', message: 'Feasible option needs a capability and no unmet condition' })
  if (!row.feasible && row.unmet_condition === null)
    ctx.addIssue({ code: 'custom', message: 'Unavailable option needs its unmet condition' })
  if (new Set(row.outcomes.map(outcome => outcome.next_action)).size < 2 && row.protocol_obligation === null)
    ctx.addIssue({ code: 'custom', message: 'Outcome branches need distinct next actions or a fixed protocol obligation' })
  for (const cost of row.costs) if ((cost.estimate === null) !== (cost.unknown_reason !== null))
    ctx.addIssue({ code: 'custom', message: 'Unknown cost requires an explicit reason; known cost must not claim missingness' })
})
export const ScientificDecisionSchema = z.strictObject({
  kind: z.literal('scientific_decision.v1'), scope: z.literal('inner_loop'),
  trigger: z.strictObject({ kind: z.enum(['outcome', 'batch', 'prerequisite', 'contradiction', 'direction']),
    checkpoint: ByteRef, evidence: z.array(ByteRef).min(1) }),
  methodology: ByteRef, evidence_index: ByteRef, capability_envelope: ByteRef,
  blocked_decision: Id, alternatives: z.array(Alternative).min(1),
  selected: Id.nullable(), disposition: z.enum(['run', 'defer', 'finish_batch']),
  reason: Id, reused_evidence: z.array(ByteRef), inapplicable_evidence: z.array(ByteRef), next_checkpoint: Id,
}).superRefine((value, ctx) => {
  if (new Set(value.alternatives.map(row => row.id)).size !== value.alternatives.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate alternative identity' })
  const selected = value.alternatives.find(row => row.id === value.selected)
  if (value.disposition === 'run' && (!selected || !selected.feasible))
    ctx.addIssue({ code: 'custom', message: 'Run disposition requires a selected feasible alternative' })
  if (value.selected !== null && !selected)
    ctx.addIssue({ code: 'custom', message: 'Selected alternative is absent' })
})
export const ScientificPlanAssociationSchema = z.strictObject({
  kind: z.literal('scientific_plan_association.v1'), scientific_plan: ByteRef,
  decision: ByteRef, evidence_index: ByteRef, capability_envelope: ByteRef,
})
export type ScientificDecision = z.infer<typeof ScientificDecisionSchema>
export interface ScientificHandoffConfig {
  artifacts: ProjectArtifacts
  artifactPrefix: string
  evidenceIndex: ArtifactReference
  capabilityEnvelope: ArtifactReference
  maxContextBytes: number
  maxIndexHistory: number
  /** Discovery and catalog pages are bounded independently of complete context. */
  maxDiscoveryBytes?: number
  maxCatalogPageBytes?: number
  /** Host owns original actor, read scope, policy and current stop checks. */
  assertActiveAuthority: () => Promise<void>
}
const hasRef = (refs: readonly ArtifactReference[], ref: ArtifactReference) => refs.some(row => equalIdentity(row, ref))

/** Exact UTF-8 artifact page. Explicit boundaries are never silently adjusted. */
export async function readArtifactPage(artifacts: ProjectArtifacts, ref: ArtifactReference,
  page?: { offset_bytes: number; length_bytes: number }) {
  if (page && (!Number.isSafeInteger(page.offset_bytes) || !Number.isSafeInteger(page.length_bytes)
    || page.offset_bytes < 0 || page.length_bytes <= 0 || page.offset_bytes + page.length_bytes > ref.size_bytes))
    throw new Error('Explicit evidence page boundaries are outside the complete artifact')
  const bytes = Buffer.from(await artifacts.read(ref))
  const offset = page?.offset_bytes ?? 0, length = page?.length_bytes ?? bytes.length
  const selected = bytes.subarray(offset, offset + length), text = selected.toString('utf8')
  if (!Buffer.from(text).equals(selected)) throw new Error('Evidence page must have exact UTF-8 boundaries')
  return { reference: ref, text, complete: offset === 0 && length === bytes.length,
    page: { offset_bytes: offset, length_bytes: length, sha256: sha256(selected), total_bytes: bytes.length },
    next_offset_bytes: offset + length < bytes.length ? offset + length : null, execution_authority: false }
}

export function assertLessonRetention(previous: z.infer<typeof ScientificEvidenceIndexSchema>,
  next: z.infer<typeof ScientificEvidenceIndexSchema>) {
  if (!equalIdentity(previous.original_request, next.original_request) || !equalIdentity(previous.methodology, next.methodology))
    throw new Error('Changed objective or methodology requires separate scope review')
  for (const lesson of previous.lessons) if (!hasRef(next.lessons, lesson))
    throw new Error('A newer index must retain historical lessons, including negative or superseded records')
  for (const evidence of previous.evidence) if (!next.evidence.some(row => equalIdentity(row.reference, evidence.reference)
    && row.delivery === evidence.delivery && row.preload === evidence.preload)) throw new Error('A newer index must retain supporting evidence and access classification')
}

/** Opt-in artifact helper. Its outputs never authorize a scientific action. */
export class ScientificHandoff {
  constructor(private readonly config: ScientificHandoffConfig) {
    if (!config.artifactPrefix.startsWith('local_artifacts/autoresearch/dsh/') || config.artifactPrefix.split('/').includes('..'))
      throw new Error('Scientific handoff artifacts must be project-owned')
    if (!Number.isSafeInteger(config.maxContextBytes) || config.maxContextBytes <= 0)
      throw new Error('Explicit positive readable context byte bound required')
    if (!Number.isSafeInteger(config.maxIndexHistory) || config.maxIndexHistory <= 0)
      throw new Error('Explicit positive index-history bound required')
    for (const bound of [config.maxDiscoveryBytes ?? 6000, config.maxCatalogPageBytes ?? 4000])
      if (!Number.isSafeInteger(bound) || bound <= 0) throw new Error('Positive scientific discovery/catalog byte bounds required')
  }
  private async text(ref: ArtifactReference) {
    const bytes = Buffer.from(await this.config.artifacts.read(ref)), text = bytes.toString('utf8')
    if (!Buffer.from(text).equals(bytes)) throw new Error('Readable scientific context requires exact UTF-8 content')
    return text
  }
  private async json(ref: ArtifactReference) { return JSON.parse(await this.text(ref)) as unknown }
  async advanceIndex(reference: ArtifactReference) {
    if (equalIdentity(reference, this.config.evidenceIndex)) return
    await this.config.assertActiveAuthority()
    const previous = ScientificEvidenceIndexSchema.parse(await this.json(this.config.evidenceIndex))
    let current = ScientificEvidenceIndexSchema.parse(await this.json(reference))
    const visited = new Set<string>([reference.sha256])
    for (let depth = 0; ; depth++) {
      if (depth >= this.config.maxIndexHistory || current.previous_index === null)
        throw new Error('New index needs a bounded complete retention chain to the current index')
      const parent = ScientificEvidenceIndexSchema.parse(await this.json(current.previous_index))
      assertLessonRetention(parent, current)
      if (equalIdentity(current.previous_index, this.config.evidenceIndex)) break
      if (visited.has(current.previous_index.sha256)) throw new Error('Cyclic scientific index history')
      visited.add(current.previous_index.sha256)
      current = parent
    }
    const next = ScientificEvidenceIndexSchema.parse(await this.json(reference))
    assertLessonRetention(previous, next)
    await this.config.assertActiveAuthority()
    this.config.evidenceIndex = reference
  }
  private async load() {
    await this.config.assertActiveAuthority()
    const index = ScientificEvidenceIndexSchema.parse(await this.json(this.config.evidenceIndex))
    const envelope = ScientificCapabilityEnvelopeSchema.parse(await this.json(this.config.capabilityEnvelope))
    if (!equalIdentity(index.methodology, envelope.methodology)) throw new Error('Capability methodology differs from evidence index')
    const refs = index.evidence.map(row => row.reference)
    if (new Set(refs.map(row => row.uri)).size !== refs.length || new Set(index.lessons.map(row => row.uri)).size !== index.lessons.length)
      throw new Error('Conflicting or duplicate evidence/lesson identities')
    const lessons = []
    for (const reference of index.lessons) {
      const lesson = ScientificLessonSchema.parse(await this.json(reference))
      if (lesson.support.some(ref => !hasRef(refs, ref))) throw new Error('Lesson support must be discoverable in the evidence index')
      if (lesson.supersedes.some(ref => !hasRef(index.lessons, ref))) throw new Error('Superseded lesson must remain discoverable')
      lessons.push({ reference, lesson })
    }
    if (new Set(lessons.map(row => row.lesson.id)).size !== lessons.length) throw new Error('Duplicate lesson identity')
    await this.config.assertActiveAuthority()
    return { index, envelope, lessons }
  }
  async context() {
    const loaded = await this.load(), evidence = []
    for (const row of loaded.index.evidence) if (row.delivery === 'model_readable' && row.preload)
      evidence.push({ reference: row.reference, purpose: row.purpose, text: await this.text(row.reference) })
    const context = { kind: 'readable_scientific_context.v1', evidence_index: this.config.evidenceIndex,
      capability_envelope: this.config.capabilityEnvelope, ...loaded, evidence,
      original_request: await this.text(loaded.index.original_request), methodology: await this.text(loaded.index.methodology),
      omitted: loaded.index.evidence.filter(row => row.delivery === 'guarded_auditor_only' || !row.preload).map(row => ({
        reference: row.reference, reason: row.delivery === 'guarded_auditor_only'
          ? 'Complete bulk input is reserved for the independently guarded auditor'
          : 'Not automatically preloaded; exact complete or bounded-page content remains available through the qualified read/preload route' })),
      execution_authority: false }
    if (Buffer.byteLength(canonicalJson(context)) > this.config.maxContextBytes)
      throw new Error('Readable scientific context exceeds declared input bound; no silent truncation')
    await this.config.assertActiveAuthority()
    return context
  }
  /** Complete immutable inventory; individual lesson bodies always retain their exact source identity. */
  async discovery() {
    const loaded = await this.load()
    const entries = loaded.lessons.map(({ reference, lesson }) => ({ reference, id: lesson.id, status: lesson.status,
      body_complete: false as const, read_body: 'research_context' as const }))
    const counts = Object.fromEntries(ScientificLessonSchema.shape.status.options.map(status =>
      [status, entries.filter(entry => entry.status === status).length]))
    const write = async (directory: string, value: unknown) => {
      const bytes = Buffer.from(canonicalJson(value))
      return this.config.artifacts.writeOnce(`${this.config.artifactPrefix}/${directory}/${sha256(bytes)}.json`, bytes)
    }
    const pages: ArtifactReference[] = []
    let end = entries.length, next: ArtifactReference | null = null
    while (end > 0) {
      let start = end
      const page = (offset: number) => ({ kind: 'scientific_lesson_page.v1', evidence_index: this.config.evidenceIndex,
        offset, total_lessons: entries.length, entries: entries.slice(offset, end), next_page: next,
        complete: offset === 0 && end === entries.length, execution_authority: false })
      while (start > 0 && Buffer.byteLength(canonicalJson(page(start - 1))) <= (this.config.maxCatalogPageBytes ?? 4000)) start--
      if (start === end) throw new Error('Scientific lesson catalog entry exceeds declared page bound; no silent truncation')
      next = await write('lesson-pages', page(start)); pages.unshift(next); end = start
    }
    const catalog = await write('lesson-catalogs', { kind: 'scientific_lesson_catalog.v1', evidence_index: this.config.evidenceIndex,
      total_lessons: entries.length, counts_by_status: counts, pages, complete: true, execution_authority: false })
    const base = { kind: 'scientific_discovery.v1', evidence_index: this.config.evidenceIndex,
      methodology: loaded.index.methodology, original_request: loaded.index.original_request, capability_envelope: this.config.capabilityEnvelope,
      lesson_catalog: { reference: catalog, total_lessons: entries.length, counts_by_status: counts, total_pages: pages.length,
        first_page: pages[0] ?? null, complete: false, entries: [] as typeof entries },
      retrieval: { tool: 'research_context', parameters: ['reference', 'offset_bytes', 'length_bytes'], default_page_bytes: 1024,
        scope: 'Exact pinned released metadata, lessons and catalog pages; evidence uses research_evidence' }, execution_authority: false }
    const all = { ...base, lesson_catalog: { ...base.lesson_catalog, complete: true, entries } }
    const discovery = Buffer.byteLength(canonicalJson(all)) <= (this.config.maxDiscoveryBytes ?? 6000) ? all : base
    if (Buffer.byteLength(canonicalJson(discovery)) > (this.config.maxDiscoveryBytes ?? 6000))
      throw new Error('Scientific discovery root exceeds declared byte bound; no silent truncation')
    await this.config.assertActiveAuthority()
    return discovery
  }
  /** Validate exact metadata membership before any caller-selected artifact read. */
  async assertContextReference(ref: ArtifactReference) {
    const { index } = await this.load(), discovery = await this.discovery()
    const catalog = JSON.parse(await this.text(discovery.lesson_catalog.reference)) as { pages: ArtifactReference[] }
    const allowed = [this.config.evidenceIndex, this.config.capabilityEnvelope, index.original_request, index.methodology,
      ...index.lessons, discovery.lesson_catalog.reference, ...catalog.pages]
    if (!hasRef(allowed, ref)) throw new Error('Context is not an exact pinned scientific metadata, lesson or catalog reference')
  }
  /** Metadata membership is explicit and separate from the released evidence list. */
  async readContext(ref: ArtifactReference, page?: { offset_bytes: number; length_bytes: number }) {
    await this.assertContextReference(ref)
    const result = await readArtifactPage(this.config.artifacts, ref, page)
    if (Buffer.byteLength(canonicalJson(result)) > this.config.maxContextBytes) throw new Error('Context page exceeds declared context bound')
    await this.config.assertActiveAuthority()
    return result
  }
  async readEvidence(ref: ArtifactReference, page?: { offset_bytes: number; length_bytes: number }) {
    const { index } = await this.load()
    if (!index.evidence.some(row => row.delivery === 'model_readable' && equalIdentity(row.reference, ref)))
      throw new Error('Evidence is not in the pinned released model-readable index')
    const result = await readArtifactPage(this.config.artifacts, ref, page)
    if (Buffer.byteLength(canonicalJson(result)) > this.config.maxContextBytes) throw new Error('Evidence exceeds declared context bound')
    await this.config.assertActiveAuthority()
    return result
  }
  private async validateDecision(value: unknown) {
    const { index, envelope } = await this.load(), decision = ScientificDecisionSchema.parse(value)
    if (!equalIdentity(decision.methodology, index.methodology) || !equalIdentity(decision.evidence_index, this.config.evidenceIndex)
      || !equalIdentity(decision.capability_envelope, this.config.capabilityEnvelope)) throw new Error('Decision uses stale or changed scientific context')
    const available = index.evidence.map(row => row.reference)
    for (const ref of [...decision.trigger.evidence, ...decision.reused_evidence, ...decision.inapplicable_evidence])
      if (!hasRef(available, ref)) throw new Error('Decision evidence is absent from the common index')
    for (const option of decision.alternatives) if (option.feasible && !envelope.capabilities.some(row => row.id === option.capability_id))
      throw new Error('A feasible alternative must be in the qualified capability envelope')
    await this.config.artifacts.read(decision.trigger.checkpoint)
    await this.config.assertActiveAuthority()
    return { decision, index, envelope }
  }
  async freezeDecision(value: unknown) {
    const { decision } = await this.validateDecision(value), bytes = Buffer.from(canonicalJson(decision))
    return this.config.artifacts.writeOnce(`${this.config.artifactPrefix}/decisions/${sha256(bytes)}.json`, bytes)
  }
  async bindPlan(scientificPlan: ArtifactReference, decisionRef: ArtifactReference) {
    await this.validateDecision(await this.json(decisionRef))
    await this.config.artifacts.read(scientificPlan)
    const association = ScientificPlanAssociationSchema.parse({ kind: 'scientific_plan_association.v1',
      scientific_plan: scientificPlan, decision: decisionRef, evidence_index: this.config.evidenceIndex,
      capability_envelope: this.config.capabilityEnvelope })
    await this.config.assertActiveAuthority()
    const bytes = Buffer.from(canonicalJson(association))
    return this.config.artifacts.writeOnce(`${this.config.artifactPrefix}/plans/${sha256(bytes)}.json`, bytes)
  }
  async prerequisites(scientificPlan: ArtifactReference, decisionRef: ArtifactReference) {
    const { decision, index, envelope } = await this.validateDecision(await this.json(decisionRef))
    const selected = decision.alternatives.find(row => row.id === decision.selected)
    const capability = envelope.capabilities.find(row => row.id === selected?.capability_id)
    return [scientificPlan, decisionRef, this.config.evidenceIndex, this.config.capabilityEnvelope,
      index.original_request, index.methodology, ...index.lessons, ...(capability?.prerequisites ?? []),
      ...decision.trigger.evidence]
  }
  async assertManifest(manifest: Manifest) {
    const association = ScientificPlanAssociationSchema.parse(await this.json(manifest.plan.snapshot))
    if (!equalIdentity(association.evidence_index, this.config.evidenceIndex)
      || !equalIdentity(association.capability_envelope, this.config.capabilityEnvelope)) throw new Error('Manifest binds stale scientific context')
    const { decision, index, envelope } = await this.validateDecision(await this.json(association.decision))
    if (decision.disposition !== 'run' || !manifest.goal.checkpoint || !equalIdentity(manifest.goal.checkpoint, decision.trigger.checkpoint))
      throw new Error('Manifest must bind a running decision at its exact checkpoint')
    const selected = decision.alternatives.find(row => row.id === decision.selected)!
    const capability = envelope.capabilities.find(row => row.id === selected.capability_id)!
    if (manifest.proposal.operation !== capability.operation) throw new Error('Manifest operation differs from selected scientific option')
    if (Object.keys(capability.configuration_constraints).length) {
      const configuration = await this.json(manifest.candidate.configuration)
      if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration))
        throw new Error('Selected capability requires its exact declared configuration')
      for (const [key, expected] of Object.entries(capability.configuration_constraints))
        if ((configuration as Record<string, unknown>)[key] !== expected)
          throw new Error('Manifest configuration differs from the selected scientific capability')
    }
    for (const ref of await this.prerequisites(association.scientific_plan, association.decision)) {
      if (!hasRef(manifest.proposal.prerequisites, ref)) throw new Error('Manifest omits a scientific decision/lesson/evidence prerequisite')
      await this.config.artifacts.read(ref)
    }
    await this.config.assertActiveAuthority()
    return { decision: association.decision, selected_capability: capability.id, execution_authority: false }
  }
}
