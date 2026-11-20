import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ScientificHandoff, ScientificEvidenceIndexSchema, ScientificCapabilityEnvelopeSchema,
  ScientificDecisionSchema, assertLessonRetention } from '../src/steering.js'
import { ProjectArtifacts } from '../src/manifest.js'
import { canonicalJson, deriveActionId } from '../src/bindings.js'
import { ManifestSchema } from '../src/records.js'
import { packets } from './fixtures/packets.js'

async function fixture(maxContextBytes = 65536) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'scientific-handoff-')))
  const artifacts = await ProjectArtifacts.open(root)
  const prefix = 'local_artifacts/autoresearch/dsh/synthetic-handoff'
  const write = (name: string, value: unknown) => artifacts.writeOnce(`${prefix}/${name}`,
    Buffer.from(typeof value === 'string' ? value : canonicalJson(value)))
  const original = await write('request.md', 'Synthetic reviewed research; no execution authority')
  const methodology = await write('methodology.md', 'Frozen observer-side temporal measurement')
  const evidence = await write('historical-negative.json', { observed: 'Exposure failed; physics remains unidentified', note: '中文🙂' })
  const bulk = await write('auditor-input.json', { kind: 'synthetic complete bulk input' })
  const lessons = []
  for (const [id, status, classification, finding] of [
    ['cpu', 'supported', 'supported_inference', 'CPU protocol prerequisite passed'],
    ['exposure', 'negative', 'observation', 'Exposure screen failed'],
    ['physics', 'unresolved', 'limitation', 'Physical contention is unidentified'],
  ] as const) lessons.push(await write(`lessons/${id}.json`, { kind: 'scientific_lesson.v1', id, status, classification,
    finding, tested_scope: 'Synthetic observer-side fixture', uncertainty: 'No physical attribution', support: [evidence],
    invalidation_conditions: ['Different source or measurement definition'], supersedes: [], applicable_decisions: ['Next diagnostic'] }))
  const index = ScientificEvidenceIndexSchema.parse({ kind: 'scientific_evidence_index.v1', revision: 'r1',
    previous_index: null, original_request: original, methodology, lessons,
    evidence: [{ reference: evidence, purpose: 'Retained negative and limitation', access: 'released', delivery: 'model_readable' },
      { reference: bulk, purpose: 'Bulk fixture input', access: 'released', delivery: 'guarded_auditor_only' }] })
  const indexRef = await write('index-r1.json', index)
  const envelope = ScientificCapabilityEnvelopeSchema.parse({ kind: 'scientific_capability_envelope.v1', methodology,
    capabilities: [{ id: 'coverage', operation: 'audit_coverage', question: 'Does coverage reproduce?', observable: 'Coverage discrepancy', prerequisites: [] },
      { id: 'arrival', operation: 'inspect_arrival', question: 'Is exposure missing at arrival?', observable: 'Arrival alignment', prerequisites: [] }] })
  const envelopeRef = await write('capabilities.json', envelope)
  const checkpoint = await write('checkpoint.json', { kind: 'synthetic checkpoint', evidence })
  const sciencePlan = await write('plan.json', { kind: 'synthetic experiment plan' })
  let stopped = false
  const config = { artifacts: artifacts.withReadPrefixes(['local_artifacts/autoresearch/dsh/']), artifactPrefix: prefix,
    evidenceIndex: indexRef, capabilityEnvelope: envelopeRef, maxContextBytes, maxIndexHistory: 16,
    assertActiveAuthority: async () => { if (stopped) throw new Error('Original owner is stopped') } }
  const helper = new ScientificHandoff(config)
  const alternatives = envelope.capabilities.map(row => ({ id: row.id, capability_id: row.id, question: row.question,
    observable: row.observable, feasible: true, unmet_condition: null,
    outcomes: [{ observation: 'Adequate discriminating evidence', next_action: 'Advance the affected stage' },
      { observation: 'Inadequate or negative evidence', next_action: 'Retain limitation and diagnose' }],
    protocol_obligation: null, legal_exit: 'Complete bounded diagnostic',
    costs: [{ unit: 'CPU seconds', estimate: null, unknown_reason: 'Not measured in this synthetic case' }] }))
  const decision = ScientificDecisionSchema.parse({ kind: 'scientific_decision.v1', scope: 'inner_loop',
    trigger: { kind: 'outcome', checkpoint, evidence: [evidence] }, methodology, evidence_index: indexRef,
    capability_envelope: envelopeRef, blocked_decision: 'Can exposure support the next stage?', alternatives,
    selected: 'coverage', disposition: 'run', reason: 'Audit existing evidence before expanding collection',
    reused_evidence: [evidence], inapplicable_evidence: [], next_checkpoint: 'Diagnostic result' })
  async function manifest() {
    const decisionRef = await helper.freezeDecision(decision)
    const plan = await helper.bindPlan(sciencePlan, decisionRef)
    const prereqs = await helper.prerequisites(sciencePlan, decisionRef)
    const packet = packets(root).manifest
    const value = { ...packet, goal: { ...packet.goal, checkpoint }, plan: { ...packet.plan, snapshot: plan },
      proposal: { ...packet.proposal, operation: 'audit_coverage', prerequisites: prereqs } }
    return ManifestSchema.parse({ ...value, action_id: deriveActionId(value) })
  }
  return { root, artifacts, write, helper, config, index, indexRef, envelope, evidence, bulk, lessons, decision, manifest,
    stop: () => { stopped = true }, close: () => rm(root, { recursive: true, force: true }) }
}

test('common readable context retains historical positive, negative and unresolved lessons beyond a recent window', async () => {
  const f = await fixture()
  try {
    const first = await f.helper.context(), second = await f.helper.context()
    assert.deepEqual(first, second)
    assert.deepEqual(first.lessons.map(row => row.lesson.status), ['supported', 'negative', 'unresolved'])
    assert.equal(first.evidence.length, 1)
    assert.ok(first.evidence[0]!.text.includes('中文🙂'))
    assert.equal(first.omitted[0]!.reference.sha256, f.bulk.sha256)
    assert.equal(first.execution_authority, false)
    assert.equal((await f.helper.readEvidence(f.evidence)).complete, true)
    await assert.rejects(f.helper.readEvidence(f.bulk), /pinned released model-readable index/)
    const unrelated = await f.write('not-indexed.json', { protected: 'synthetic inaccessible data' })
    await assert.rejects(f.helper.readEvidence(unrelated), /pinned released model-readable index/)
  } finally { await f.close() }
})

test('missing evidence, changed identities and context overflow refuse rather than substitute a summary', async () => {
  const f = await fixture(1)
  try {
    await assert.rejects(f.helper.context(), /no silent truncation/)
    await assert.rejects(f.helper.readEvidence({ ...f.evidence, sha256: '0'.repeat(64) }), /pinned released/)
    const damaged = new ScientificHandoff({ ...f.config, evidenceIndex: { ...f.indexRef, sha256: '0'.repeat(64) } })
    await assert.rejects(damaged.context(), /Artifact identity mismatch/)
    assert.throws(() => ScientificEvidenceIndexSchema.parse({ ...f.index,
      evidence: [{ ...f.index.evidence[0], access: 'sealed' }] }))
  } finally { await f.close() }
})

test('exact decision and every lesson prerequisite bind to the selected operation and checkpoint', async () => {
  const f = await fixture()
  try {
    const manifest = await f.manifest()
    assert.equal((await f.helper.assertManifest(manifest)).selected_capability, 'coverage')
    const wrongOperation = { ...manifest, proposal: { ...manifest.proposal, operation: 'inspect_arrival' } }
    await assert.rejects(f.helper.assertManifest(wrongOperation), /selected scientific option/)
    const omittedLesson = { ...manifest, proposal: { ...manifest.proposal,
      prerequisites: manifest.proposal.prerequisites.filter(ref => ref.sha256 !== f.lessons[1]!.sha256) } }
    await assert.rejects(f.helper.assertManifest(omittedLesson), /omits a scientific/)
    await assert.rejects(f.helper.assertManifest({ ...manifest, goal: { ...manifest.goal, checkpoint: null } }), /exact checkpoint/)
    assert.deepEqual(await f.helper.freezeDecision(f.decision), await f.helper.freezeDecision(f.decision))
  } finally { await f.close() }
})

test('stale context, fake feasibility and methodology changes cannot produce a bound scientific decision', async () => {
  const f = await fixture()
  try {
    await assert.rejects(f.helper.freezeDecision({ ...f.decision, evidence_index: { ...f.indexRef, sha256: '0'.repeat(64) } }), /stale/)
    const changed = await f.write('other-methodology.md', 'Different observable')
    await assert.rejects(f.helper.freezeDecision({ ...f.decision, methodology: changed }), /stale or changed/)
    await assert.rejects(f.helper.freezeDecision({ ...f.decision,
      alternatives: f.decision.alternatives.map(row => ({ ...row, capability_id: 'unqualified-GPU-route' })) }), /qualified capability/)
    assert.throws(() => ScientificDecisionSchema.parse({ ...f.decision, scope: 'outer_loop' }))
    const sameBranches = f.decision.alternatives.map(row => ({ ...row,
      outcomes: row.outcomes.map(outcome => ({ ...outcome, next_action: 'Repeat unchanged' })) }))
    assert.throws(() => ScientificDecisionSchema.parse({ ...f.decision, alternatives: sameBranches }))
    assert.doesNotThrow(() => ScientificDecisionSchema.parse({ ...f.decision,
      alternatives: sameBranches.map(row => ({ ...row, protocol_obligation: 'Frozen matched repeat obligation' })) }))
  } finally { await f.close() }
})

test('a new lesson revision retains historical negatives and supporting access classification', async () => {
  const f = await fixture()
  try {
    assertLessonRetention(f.index, { ...f.index, revision: 'r2' })
    assert.throws(() => assertLessonRetention(f.index, { ...f.index, lessons: [f.lessons[0]!] }), /retain historical lessons/)
    assert.throws(() => assertLessonRetention(f.index, { ...f.index,
      evidence: f.index.evidence.map(row => ({ ...row, delivery: 'guarded_auditor_only' as const })) }), /supporting evidence/)
    f.stop()
    await assert.rejects(f.helper.context(), /Original owner is stopped/)
    await assert.rejects(f.helper.freezeDecision(f.decision), /Original owner is stopped/)
  } finally { await f.close() }
})

test('immutable index evolution retains intermediate lessons and invalidates older planned decisions', async () => {
  const f = await fixture()
  try {
    const oldManifest = await f.manifest()
    const r2 = await f.write('index-r2.json', { ...f.index, revision: 'r2', previous_index: f.indexRef })
    await f.helper.advanceIndex(r2)
    assert.equal((await f.helper.context()).evidence_index.sha256, r2.sha256)
    await assert.rejects(f.helper.assertManifest(oldManifest), /stale scientific context/)
    const disconnected = await f.write('index-disconnected.json', { ...f.index, revision: 'r3', previous_index: null })
    await assert.rejects(f.helper.advanceIndex(disconnected), /complete retention chain/)
    const erased = await f.write('index-erased.json', { ...f.index, revision: 'r3', previous_index: r2, lessons: [f.lessons[0]] })
    await assert.rejects(f.helper.advanceIndex(erased), /retain historical lessons/)
    assert.equal((await f.helper.context()).evidence_index.sha256, r2.sha256)
  } finally { await f.close() }
})

test('declared evidence pages preserve the full parent identity and never claim complete content', async () => {
  const f = await fixture()
  try {
    const large = await f.write('large-source.txt', 'prefix 中文🙂 suffix')
    const next = await f.write('index-paged.json', { ...f.index, revision: 'paged', previous_index: f.indexRef,
      evidence: [...f.index.evidence, { reference: large, purpose: 'Explicit bounded readable source', access: 'released', delivery: 'model_readable', preload: false }] })
    await f.helper.advanceIndex(next)
    const context = await f.helper.context()
    assert.ok(context.omitted.some(row => row.reference.sha256 === large.sha256))
    const page = await f.helper.readEvidence(large, { offset_bytes: 0, length_bytes: 7 })
    assert.equal(page.text, 'prefix '); assert.equal(page.complete, false)
    assert.equal(page.reference.sha256, large.sha256); assert.equal(page.next_offset_bytes, 7)
    assert.equal((await f.helper.readEvidence(large)).text, 'prefix 中文🙂 suffix')
    await assert.rejects(f.helper.readEvidence(large, { offset_bytes: 8, length_bytes: 1 }), /UTF-8 boundaries/)
    await assert.rejects(f.helper.readEvidence(large, { offset_bytes: 0, length_bytes: large.size_bytes + 1 }), /page boundaries/)
  } finally { await f.close() }
})

test('scientific discovery retains all lesson statuses through deterministic complete catalog pages', async () => {
  const f = await fixture()
  try {
    const statuses = ['supported', 'negative', 'tentative', 'disputed', 'unresolved', 'superseded'] as const
    const added = []
    for (let n = 0; n < 48; n++) added.push(await f.write(`lessons/catalog-${n}.json`, {
      kind: 'scientific_lesson.v1', id: `catalog-${n}`, status: statuses[n % statuses.length], classification: 'observation',
      finding: 'Partial observation 中文🙂', tested_scope: 'Only this synthetic case', uncertainty: 'Missing physical attribution',
      support: [f.evidence], invalidation_conditions: ['New released evidence'], supersedes: [f.lessons[0]], applicable_decisions: ['Next diagnostic'],
    }))
    const next = await f.write('catalog-index-r2.json', { ...f.index, revision: 'r2', previous_index: f.indexRef, lessons: [...f.lessons, ...added] })
    await f.helper.advanceIndex(next)
    const discovery = await f.helper.discovery()
    assert.deepEqual(await f.helper.discovery(), discovery)
    assert.equal(discovery.lesson_catalog.total_lessons, 51)
    assert.equal(discovery.lesson_catalog.complete, false)
    assert.ok(discovery.lesson_catalog.total_pages > 1)
    assert.equal(discovery.lesson_catalog.counts_by_status.disputed, 8)
    assert.equal(discovery.lesson_catalog.counts_by_status.negative, 9)
    assert.ok(Buffer.byteLength(canonicalJson(discovery)) <= 6000)
    const catalog = JSON.parse((await f.helper.readContext(discovery.lesson_catalog.reference)).text)
    assert.equal(catalog.complete, true)
    let reference = discovery.lesson_catalog.first_page
    const entries = [], pages = []
    while (reference) {
      const page = JSON.parse((await f.helper.readContext(reference)).text)
      assert.ok(reference.size_bytes <= 4000)
      assert.equal(page.offset, entries.length)
      assert.equal(page.complete, false)
      entries.push(...page.entries); pages.push(reference)
      reference = page.next_page
    }
    assert.deepEqual(pages, catalog.pages)
    assert.deepEqual(entries.map(row => row.reference), [...f.lessons, ...added])
    assert.deepEqual([...new Set(entries.map(row => row.status))].sort(), [...statuses].sort())
    assert.ok(entries.every(row => row.body_complete === false))
    const partial = JSON.parse((await f.helper.readContext(added[4]!)).text)
    assert.equal(partial.status, 'unresolved')
    assert.equal(partial.uncertainty, 'Missing physical attribution')
    assert.deepEqual(partial.support, [f.evidence])
    assert.deepEqual(partial.invalidation_conditions, ['New released evidence'])
  } finally { await f.close() }
})

test('metadata retrieval is exact, current and separate from evidence and auditor-only access', async () => {
  const f = await fixture()
  try {
    const discovery = await f.helper.discovery()
    for (const reference of [f.indexRef, f.config.capabilityEnvelope, f.index.methodology, f.index.original_request, ...f.lessons,
      discovery.lesson_catalog.reference, discovery.lesson_catalog.first_page!]) {
      const read = await f.helper.readContext(reference)
      assert.equal(read.complete, true)
      assert.equal(read.text, Buffer.from(await f.artifacts.read(reference)).toString('utf8'))
    }
    await assert.rejects(f.helper.readContext(f.bulk), /exact pinned scientific/)
    await assert.rejects(f.helper.readEvidence(f.indexRef), /pinned released model-readable/)
    await assert.rejects(f.helper.readContext({ ...f.lessons[0]!, sha256: '0'.repeat(64) }), /exact pinned scientific/)
    const arbitrary = await f.write('arbitrary-context.json', { protected: true })
    await assert.rejects(f.helper.readContext(arbitrary), /exact pinned scientific/)
    const r2 = await f.write('metadata-index-r2.json', { ...f.index, revision: 'r2', previous_index: f.indexRef })
    await f.helper.advanceIndex(r2)
    await assert.rejects(f.helper.readContext(f.indexRef), /exact pinned scientific/)
    await assert.rejects(f.helper.readContext(discovery.lesson_catalog.reference), /exact pinned scientific/)
    f.stop()
    await assert.rejects(f.helper.readContext(r2), /Original owner is stopped/)
    await assert.rejects(f.helper.discovery(), /Original owner is stopped/)
  } finally { await f.close() }
})

test('oversized discovery roots and catalog entries fail explicitly without shortened identities', async () => {
  const f = await fixture()
  try {
    await assert.rejects(new ScientificHandoff({ ...f.config, maxDiscoveryBytes: 1 }).discovery(), /root exceeds declared byte bound/)
    await assert.rejects(new ScientificHandoff({ ...f.config, maxCatalogPageBytes: 1 }).discovery(), /entry exceeds declared page bound/)
    assert.throws(() => new ScientificHandoff({ ...f.config, maxDiscoveryBytes: 0 }), /Positive scientific discovery/)
  } finally { await f.close() }
})
