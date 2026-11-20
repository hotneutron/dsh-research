// Native CPU handoff qualification with scripted models; no hosted-project science.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import ToolResultPruner from '@deepseek-ai/dsh-compaction-tool-result-pruner'
import { NativeProductionResearch } from 'dsh-research/native'
import { ScientificHandoff, ScientificEvidenceIndexSchema, canonicalJson, equalIdentity } from 'dsh-research'
import { createCpuFixture, text, tool } from '../synthetic-cpu/fixture.mjs'

if (!process.argv[2]) throw new Error('Provide a fresh disposable qualification root')
const root = resolve(process.argv[2]), prefix = 'local_artifacts/autoresearch/dsh/scientific-handoff-qualification'
const sandbox = { mode: 'workspace-write', sessionId: 'm2-author', workspaceRoot: root }
const f = await createCpuFixture(root, { production: true, automaticReview: true, executionSandbox: sandbox,
  executionSandboxResolver: () => sandbox, maxAttempts: 4, maxReviews: 8, maxTotalTimeoutMs: 8000, actionTimeoutMs: 2000 })
await f.ctx.plugin(TokenMeter)
await f.ctx.plugin(ToolResultPruner)
const json = (name, value) => f.json(`${prefix}/${name}`, value)
const read = async ref => JSON.parse(Buffer.from(await f.artifacts.read(ref)).toString())
const checks = [], check = id => checks.push({ id, status: 'pass' })
let loop, active = true, indexRef, index, contextUpdate = null
const started = performance.now()
try {
  const original = await json('request.json', { original: 'Explicit disposable CPU protocol qualification; no scientific authority' })
  const methodology = await json('methodology.json', { fixed: 'Synthetic score evaluator and source/terminal rules' })
  const historical = await json('historical-negative.json', { verdict: 'negative', scope: 'Historical released synthetic fixture' })
  const checkpoint = await json('initial-checkpoint.json', { kind: 'released synthetic prerequisite checkpoint' })
  const lesson = await json('lessons/historical.json', { kind: 'scientific_lesson.v1', id: 'historical-negative', classification: 'observation',
    status: 'negative', finding: 'Retain the released negative observation', tested_scope: 'Synthetic fixture only',
    uncertainty: 'No physical or production benefit claim', support: [historical], invalidation_conditions: ['Different evaluator'],
    supersedes: [], applicable_decisions: ['Select a protocol control'] })
  index = ScientificEvidenceIndexSchema.parse({ kind: 'scientific_evidence_index.v1', revision: 'r1', previous_index: null,
    original_request: original, methodology, lessons: [lesson],
    evidence: [{ reference: historical, purpose: 'Historical negative outside recent action window', access: 'released', delivery: 'model_readable' }] })
  const initialIndex = indexRef = await json('indices/initial.json', index)
  const capabilities = await json('capabilities.json', { kind: 'scientific_capability_envelope.v1', methodology,
    capabilities: [{ id: 'negative', operation: 'negative', question: 'Does the declared negative control remain valid?', observable: 'Valid negative score', prerequisites: [] },
      { id: 'positive', operation: 'positive', question: 'Does the qualifying candidate meet the frozen score gate?', observable: 'Valid positive score', prerequisites: [] }] })
  const handoffConfig = { artifactPrefix: prefix, evidenceIndex: initialIndex, capabilityEnvelope: capabilities,
    maxContextBytes: 262144, maxIndexHistory: 16 }
  const helper = new ScientificHandoff({ ...handoffConfig, artifacts: f.artifacts,
    assertActiveAuthority: async () => assert.ok(active, 'Original fixture authority is stopped') })
  const state = () => f.table.get('synthetic-m2')
  for (let i = 0; i < 12; i++) f.authorLLM.script.push(text('Observe the native outcome; this scripted qualification makes no scientific-intelligence claim.'))
  for (let i = 0; i < 8; i++) f.reviewerLLM.script.push(options => {
    const block = options.messages.flatMap(row => row.content ?? []).findLast(row => row.type === 'text' && row.text.includes('REVIEW_PACKET_JSON\n'))
    const packet = JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1))
    const readable = options.messages.flatMap(row => row.content ?? []).findLast(row => row.type === 'text'
      && row.text.startsWith('COMPLETE READABLE SELECTED REVIEW CONTEXT.'))
    assert.ok(readable, 'Scientific reviewer requires a separate complete readable context block')
    for (const row of packet.permitted_context) {
      assert.ok(readable.text.includes(canonicalJson(row.reference)))
      assert.ok(readable.text.includes(row.text), 'Exact source text must remain readable outside packet encoding')
    }
    const common = packet.permitted_context.map(row => { try { return JSON.parse(row.text) } catch { return null } })
      .find(row => row?.kind === 'readable_scientific_context.v1')
    assert.ok(common && common.lessons.some(row => row.lesson.id === 'historical-negative'))
    const discovery = options.messages.flatMap(row => row.content ?? []).map(row => {
      if (row.type !== 'text') return null
      try { return JSON.parse(row.text) } catch { return null }
    }).findLast(row => row?.kind === 'scientific_discovery.v1')
    assert.ok(discovery, 'Reviewer requires a separate bounded scientific discovery block')
    assert.ok(equalIdentity(discovery.evidence_index, common.evidence_index))
    assert.ok(equalIdentity(discovery.capability_envelope, common.capability_envelope))
    assert.ok(equalIdentity(discovery.methodology, common.index.methodology))
    assert.equal(discovery.lesson_catalog.total_lessons, common.lessons.length)
    assert.equal(common.execution_authority, false)
    return text(JSON.stringify({ decision: 'approve', reason: 'Scripted exact-scope native protocol qualification only',
      review_id: packet.review_id, action_id: packet.action_id, manifest_sha256: packet.manifest_sha256, request_sha256: packet.request_sha256 }))
  })
  const hooks = {
    async propose(args) {
      const supplied = JSON.parse(args.design_json)
      const subject = await f.makeSubject(args.operation, args)
      subject.plan.snapshot = supplied.plan_association
      subject.proposal.prerequisites.push(...supplied.prerequisites)
      return subject
    },
    async reviewContext(subject) { return [subject.plan.snapshot, subject.candidate.tree, subject.evaluator.verifier] },
    async decision() { throw Error('This qualification does not conclude a scientific objective') },
    async assertDecisionPremises() { throw Error('No scientific conclusion premise in this qualification') },
  }
  const config = { ...f.config, hooks, artifactPrefix: prefix, executionShell: f.ctx.shell,
    executionSandbox: { profile: f.binding.profile.effective, resolve: () => sandbox }, reviewContextMaxBytes: 524288,
    scientificHandoff: handoffConfig,
    async assertActiveAuthority(owner) { assert.equal(owner, f.author); assert.ok(active) },
    async resolveScientificEvidenceIndex(current) {
      if (contextUpdate) return contextUpdate
      const latest = Object.values(current.actions).filter(action => action.phase === 'settled' && action.evidence).at(-1)
      if (!latest) return initialIndex
      const link = JSON.parse(await readFile(join(root, prefix, `index-links/${latest.action_id}.json`), 'utf8'))
      assert.ok(equalIdentity(link.evidence, latest.evidence))
      return link.index
    },
    async afterSettlement(association) {
      const evidence = await read(association.evidence)
      const reference = await json(`lessons/${association.action_id}.json`, { kind: 'scientific_lesson.v1', id: association.action_id,
        classification: 'observation', status: evidence.verifier.verdict === 'negative' ? 'negative' : 'supported',
        finding: `Actual synthetic native result: ${evidence.verifier.verdict}`, tested_scope: 'Synthetic score/terminal protocol only',
        uncertainty: 'No production/scientific productivity claim', support: [association.evidence],
        invalidation_conditions: ['Different source/evaluator'], supersedes: [], applicable_decisions: ['Next fixture action'] })
      index = ScientificEvidenceIndexSchema.parse({ ...index, revision: association.action_id, previous_index: indexRef,
        lessons: [...index.lessons, reference], evidence: [...index.evidence, { reference: association.evidence,
          purpose: 'Actual settled synthetic native evidence', access: 'released', delivery: 'model_readable' }] })
      indexRef = await json(`indices/${association.action_id}.json`, index)
      await json(`index-links/${association.action_id}.json`, { index: indexRef, evidence: association.evidence })
      contextUpdate = null
    },
  }
  const execute = async (name, args) => f.ctx.tools.execute({ callId: randomUUID(), name, arguments: args, agent: f.author, signal: AbortSignal.timeout(10000) })
  const call = async (name, args) => {
    const result = await execute(name, args)
    assert.equal(result.isError, false, canonicalJson(result))
    return structuredClone(result.value)
  }
  loop = await NativeProductionResearch.open(f.ctx, config)
  let nativeStatusOrdinal = 0
  const nativeStatus = async () => {
    await f.author.whenIdle()
    const before = f.authorLLM.requests.length
    f.authorLLM.script.unshift(tool(`qualification-status-${++nativeStatusOrdinal}`, {}, 'research_status'), text('Exact scientific status observed.'))
    f.author.followup(createUserMessage({ content: [{ type: 'text', text: 'Read research_status and its exact scientific discovery.' }], source: { kind: 'user' } }))
    await f.author.whenIdle()
    const request = f.authorLLM.requests[before + 1]
    assert.ok(request)
    const content = request.messages.findLast(row => row.role === 'tool').content
    const value = JSON.parse(content.filter(block => block.type === 'text').map(block => block.text).join(''))
    assert.equal(value.kind, 'research_status_discovery.v1')
    assert.ok(equalIdentity(value.scientific.evidence_index, indexRef))
    assert.ok(equalIdentity(value.scientific.capability_envelope, capabilities))
    assert.ok(equalIdentity(value.scientific.methodology, methodology))
    assert.equal(f.ctx.toolResultPruner.pruneContent(content), null)
    f.ctx.toolResultPruner.pruneSession(f.author.session)
    return value
  }
  await nativeStatus()
  check('bounded-discovery-in-actual-native-author-request')
  const initial = await call('research_status', {})
  assert.equal(initial.scientific_context.lessons[0].lesson.id, 'historical-negative')
  assert.equal((await call('research_evidence', { reference: historical })).complete, true)
  check('author-status-and-immutable-read-expose-old-negative')
  const nonmember = await json('unindexed.json', { fixture: 'Not released to the common index' })
  assert.equal((await execute('research_evidence', { reference: nonmember })).isError, true)
  check('unindexed-read-refused')

  const selected = async (operation, currentCheckpoint) => {
    await nativeStatus()
    await helper.advanceIndex(indexRef)
    const decision = { kind: 'scientific_decision.v1', scope: 'inner_loop', trigger: { kind: 'outcome', checkpoint: currentCheckpoint, evidence: [historical] },
      methodology, evidence_index: indexRef, capability_envelope: capabilities, blocked_decision: 'Which next bounded fixture result is required?',
      alternatives: ['negative', 'positive'].map(id => ({ id, capability_id: id, question: `Evaluate ${id} fixture`, observable: 'Actual valid score',
        feasible: true, unmet_condition: null, outcomes: [{ observation: 'Valid planned result', next_action: 'Advance the protocol' },
          { observation: 'Invalid or unexpected result', next_action: 'Diagnose the fixture' }], protocol_obligation: null,
        legal_exit: 'Settled native fixture', costs: [{ unit: 'CPU seconds', estimate: null, unknown_reason: 'Measure actual native execution' }] })),
      selected: operation, disposition: 'run', reason: 'Explicit native protocol control sequence; scripted scientific selection',
      reused_evidence: [historical], inapplicable_evidence: [], next_checkpoint: 'Settled fixture result' }
    const scientificPlan = await json(`plans/${operation}-${randomUUID()}.json`, { operation, checkpoint: currentCheckpoint })
    const retained = await call('research_decision', { decision_json: JSON.stringify(decision), scientific_plan: scientificPlan })
    return call('research_propose', { operation, plan_revision: operation + '-handoff', checkpoint: currentCheckpoint, feedback_item_id: null,
      design_json: JSON.stringify({ plan_association: retained.plan_association, prerequisites: retained.prerequisites }) })
  }
  const negative = await selected('negative', checkpoint)
  const negativeReview = await call('research_review', { manifest: negative.manifest })
  check('reviewer-receives-exact-separate-plaintext-source-and-common-context')
  const negativeRun = await call('research_run', { manifest: negative.manifest, review: negativeReview.review, expected_revision: negativeReview.state_revision })
  assert.equal(negativeRun.status, 'settled'); await f.author.whenIdle()
  check('first-selected-capability-native-review-and-dispatch')
  const firstStatus = await call('research_status', {})
  assert.equal(firstStatus.scientific_context.lessons.length, 2)
  assert.ok(firstStatus.scientific_context.evidence.some(row => equalIdentity(row.reference, negativeRun.evidence)))
  check('actual-outcome-adds-scoped-lesson-to-both-contexts')
  const counts = [state().consumed_attempts, state().consumed_timeout_ms, state().consumed_review_requests]
  const replay = await call('research_run', { manifest: negative.manifest, review: negativeReview.review, expected_revision: negativeReview.state_revision })
  assert.equal(replay.replay, true); assert.deepEqual([state().consumed_attempts, state().consumed_timeout_ms, state().consumed_review_requests], counts)
  check('old-admission-replay-retains-context-and-charges')
  let positive = await selected('positive', negativeRun.checkpoint)
  let positiveReview = await call('research_review', { manifest: positive.manifest })
  const changedEvidence = await json('contradictory-context.json', { fixture: 'New released condition remains unassessed' })
  const changedLesson = await json('lessons/contradiction.json', { kind: 'scientific_lesson.v1', id: 'contradiction', classification: 'limitation',
    status: 'unresolved', finding: 'A new condition is outside the old planned evidence scope', tested_scope: 'Synthetic context-change fixture',
    uncertainty: 'No physical claim', support: [changedEvidence], invalidation_conditions: ['Condition separately assessed'],
    supersedes: [], applicable_decisions: ['Refresh the planned context'] })
  index = ScientificEvidenceIndexSchema.parse({ ...index, revision: 'contradiction', previous_index: indexRef,
    lessons: [...index.lessons, changedLesson], evidence: [...index.evidence, { reference: changedEvidence,
      purpose: 'Controlled material context change', access: 'released', delivery: 'model_readable' }] })
  contextUpdate = indexRef = await json('indices/contradiction.json', index)
  const beforeStale = [state().consumed_attempts, state().consumed_timeout_ms]
  assert.equal((await execute('research_run', { manifest: positive.manifest, review: positiveReview.review,
    expected_revision: positiveReview.state_revision })).isError, true)
  assert.deepEqual([state().consumed_attempts, state().consumed_timeout_ms], beforeStale)
  check('context-changed-after-review-refuses-before-reservation')
  positive = await selected('positive', negativeRun.checkpoint)
  positiveReview = await call('research_review', { manifest: positive.manifest })
  const positiveRun = await call('research_run', { manifest: positive.manifest, review: positiveReview.review, expected_revision: positiveReview.state_revision })
  assert.equal(positiveRun.status, 'settled'); await f.author.whenIdle()
  check('different-lawful-capability-bound-to-new-index-and-checkpoint')
  loop.close(); loop = await NativeProductionResearch.open(f.ctx, config)
  const reopened = await call('research_status', {})
  assert.equal(reopened.scientific_context.lessons.length, 4)
  assert.equal(reopened.scientific_context.evidence_index.sha256, indexRef.sha256)
  assert.equal(state().consumed_attempts, 2)
  check('reopen-resolves-retained-index-chain-without-new-state-schema-or-dispatch')
  active = false
  assert.equal((await execute('research_decision', { decision_json: '{}' })).isError, true)
  assert.equal(state().consumed_attempts, 2)
  check('stopped-owner-cannot-freeze-decision')
  const requests = adapter => adapter.requests.map(({ provider, model, sessionId, messages }) => ({ provider, model, sessionId, messages }))
  await writeFile(join(root, 'model-requests.json'), JSON.stringify({ author: requests(f.authorLLM), reviewer: requests(f.reviewerLLM) }, null, 2) + '\n', { flag: 'wx' })
  await writeFile(join(root, 'receipt.json'), JSON.stringify({ at: new Date().toISOString(), checks,
    whole_seconds: (performance.now() - started) / 1000, state: state(), index: indexRef,
    scope: 'Native CPU protocol qualification with scripted model outputs; no scientific judgment/productivity claim',
    external_model_calls: 0, scientific_gpu_dispatches: 0, native_evaluator_dispatches: 2,
    model_request_evidence: 'model-requests.json' }, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ passed: checks.length, receipt: join(root, 'receipt.json') }))
} finally { loop?.close(); await f.close() }

// ## Revision History
// 2026-11-20: Qualify native opt-in scientific context, decision binding, two
// released capability paths, lesson evolution and replay/reopen with scripted models.
// 2026-11-20 04:36 -0800: Observe exact selected source and scientific context in
// a separate plaintext block through the actual native reviewer model callback.
// 2026-11-20 14:09 -0800: Qualify compact author discovery, shared exact reviewer
// roots/plaintext, token-meter/pruner boundary and canonical status compatibility.
