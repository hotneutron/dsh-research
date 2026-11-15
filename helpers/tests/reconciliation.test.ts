import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { zstdCompressSync } from 'node:zlib'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { createCpuFixture, text, tool } from '../examples/synthetic-cpu/fixture.mjs'
import { NativeResearchAdapter } from '../src/native.js'
import { ResearchStateSchema } from '../src/admission.js'
import { CheckpointSchema, EvidenceSchema, ReviewSchema } from '../src/records.js'
import type { ArtifactReference } from '../src/records.js'
import { canonicalJson } from '../src/bindings.js'
import { decodeCompleteZstd, reconcileNoDispatch } from '../src/reconciliation.js'
import type { NoDispatchContext, NoDispatchProof, NoDispatchReconciliationConfig, NoDispatchReviewContext } from '../src/reconciliation.js'

const require = createRequire(import.meta.url)
const error = 'Resolved shell spec differs from the frozen invocation/deadline'
const returningProof = (f: any, proof: ArtifactReference): NoDispatchReconciliationConfig => ({ ...f.config,
  guard: { ...f.config.guard, observe: async () => proof } })

/** Actual public tool/Session and SQLite path. Scripted providers and original
 * science read stubs grant no physical GPU, live model or original admission. */
async function fixture(work: (f: any) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-no-dispatch-'))
  let f: any, unregister: (() => void) | undefined
  try {
    f = await createCpuFixture(join(root, 'project'), { timeoutMs: 650000, actionTimeoutMs: 650000,
      maxTotalTimeoutMs: 1300000, maxAttempts: 2 })
    f.unregister()
    let drift = false
    const calls = { jobs: 0, execute: 0, observation: 0, reviewObservation: 0, writer: 0 }
    f.ctx.jobs.start = () => { calls.jobs++; throw new Error('No process publication permitted in this fixture') }
    const base = f.ctx.shell
    const shell = Object.create(base)
    shell.resolve = (args: any) => { const spec = base.resolve(args); return drift ? { ...spec, timeoutMs: 600000 } : spec }
    shell.execute = () => { calls.execute++; throw new Error('No shell process permitted in this fixture') }
    const native = await NativeResearchAdapter.open(f.ctx, { ...f.config, executionShell: shell,
      observe: event => { if (event === 'admission_acknowledged') drift = true } })
    unregister = native.register()
    const packet = await f.prepare('negative')
    f.authorLLM.script.push(tool('actual-original-native-refusal', packet.request), text('Original unknown association retained'))
    f.author.followup(createUserMessage({ content: [{ type: 'text', text: 'Invoke this exact disposable native action once' }], source: { kind: 'user' } }))
    await f.author.whenIdle()
    const before = structuredClone(f.table.get(f.config.projectKey))
    const action = before.actions[packet.manifest.action_id]
    assert.equal(before.hold.reason, error)
    assert.equal(action.phase, 'unknown')
    assert.equal(action.job_id, null)
    assert.equal(action.runtime_facts, null)
    assert.deepEqual([calls.jobs, calls.execute], [0, 0])
    const snapshot = await f.json('snapshots/no-dispatch-original-unknown.json', before)
    const tuple = { action_id: action.action_id, attempt_id: action.attempt_id, dispatch_token: action.dispatch_token,
      admitted_revision: action.admitted_revision, manifest: action.manifest, review: action.review, review_id: action.review_id,
      owner_session_id: action.owner_session_id, timeout_ms: action.timeout_ms }
    const events = f.author.session.snapshotEvents()
    const call = events.find((event: any) => event.type === 'tool/call')
    const result = events.find((event: any) => event.type === 'tool/result')
    const prefix = await f.json('snapshots/no-dispatch-native-prefix.json', { session_id: f.author.id, events })
    const toolCall = await f.json('snapshots/no-dispatch-actual-call.json', call)
    const toolResult = await f.json('snapshots/no-dispatch-actual-result.json', result)
    const sourcePaths = [new URL('../src/native.ts', import.meta.url), require.resolve('@deepseek-ai/dsh-shell'),
      require.resolve('@deepseek-ai/dsh-tools'), require.resolve('@deepseek-ai/dsh-jobs-local'),
      new URL('../src/coordination.ts', import.meta.url), new URL('../src/reconciliation.ts', import.meta.url)]
    const roles = ['native_adapter', 'shell', 'tools', 'jobs', 'hooks', 'parser']
    const pins: { role: string | undefined; content: ArtifactReference }[] = []
    for (let index = 0; index < roles.length; index++) pins.push({ role: roles[index],
      content: await f.artifacts.write(`snapshots/no-dispatch-source-${roles[index]}.txt`, await readFile(sourcePaths[index]!)) })
    const guardIdentity = await f.json('snapshots/no-dispatch-guard-identity.json', {
      scope: 'Disposable fixture source/Session/writer qualification only; no original scientific execution' })
    const qualificationCapture = await f.json('snapshots/no-dispatch-source-acceptance.json', { source_pins: pins,
      observed_failure: error, observed_native_calls: calls, boundary: 'Fixture acceptance only; production source acceptance is independently host owned' })
    const flow = await f.json('snapshots/no-dispatch-control-flow.json', { schema_version: 1, kind: 'no_dispatch_control_flow',
      host_scope: 'disposable-fixture', source_pins: pins, unique_error: error,
      failure_site: { source: pins[0]!.content, description: 'Second resolveExecution refuses the drifted original timeout after admitted acknowledgement' },
      reachable_publications: ['jobs.start', 'shell.execute', 'science.admit', 'deferred_continuation'].map(operation => ({
        operation, source: pins[0]!.content, failure_precedes_publication: true })), all_reachable_publications_covered: true,
      no_deferred_continuation: true, qualification_capture: qualificationCapture })
    const qualification = await f.json('snapshots/no-dispatch-qualification.json', { schema_version: 1, kind: 'no_dispatch_qualification',
      host_scope: 'disposable-fixture', guard: guardIdentity, assurance: 'fixture_verified', source_pins: pins,
      control_flow: flow, qualification_capture: qualificationCapture, complete_prefix_parser_qualified: true,
      original_owner_observation_qualified: true, exclusive_writer_observation_qualified: true, original_no_admission_observation_qualified: true })
    const recovery = { schema_version: 1, kind: 'no_dispatch_recovery_policy', authority: before.authority, binding: before.binding,
      host_scope: 'disposable-fixture', original_policy: f.policyRef, original_snapshot: snapshot, current_snapshot: snapshot,
      tuple, guard: guardIdentity, qualification, source_pins: pins, review_author_session_id: f.author.id,
      bounds: packet.manifest.bounds, prerequisites: [snapshot, qualification], decision: 'settle_never_dispatched_coordination',
      preserve_consumed_attempts_and_timeout: true, scientific_completion: false, execution_cost_refund: false }
    const recoveryRef = await f.json('snapshots/no-dispatch-recovery-policy.json', recovery)
    const reviewId = 'separate-contract-revision-review'
    const reviewRequest = await f.json('snapshots/no-dispatch-review-request.json', { subject_kind: 'contract_revision',
      recovery_policy: recoveryRef, review_id: reviewId, author_session_id: f.author.id, reviewer_session_id: f.reviewer.id })
    const earlierReviewEvents = f.reviewer.session.snapshotEvents()
    f.reviewerLLM.script.push(text(JSON.stringify({ subject_kind: 'contract_revision', decision: 'approve', review_id: reviewId,
      request_sha256: reviewRequest.sha256, recovery_policy_sha256: recoveryRef.sha256 })))
    f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: canonicalJson({ recovery_policy: recoveryRef, request: reviewRequest }) }], source: { kind: 'user' } }))
    await f.reviewer.whenIdle()
    const completion = await f.json('snapshots/no-dispatch-review-completion.json', { session_id: f.reviewer.id,
      provider: f.policy.reviewer.provider, events: f.reviewer.session.snapshotEvents() })
    const review = ReviewSchema.parse({ schema_version: 1, kind: 'review', binding: f.binding, review_id: reviewId,
      subject_kind: 'contract_revision', request: reviewRequest, packet: recoveryRef, subject: recoveryRef, manifest: null,
      checkpoint: null, action_id: null, author_session_id: f.author.id, reviewer: { ...f.policy.reviewer, assurance: 'fixture_verified' },
      completion, status: 'completed', decision: 'approve', reason: 'Separate actual scripted recovery policy approval',
      evidence: [snapshot], scope: { consumable_once: true, proposal: recoveryRef, bounds: packet.manifest.bounds, prerequisites: recovery.prerequisites }, hold: null })
    const reviewRef = await f.json('snapshots/no-dispatch-fresh-review.json', review)
    const ownershipCapture = await f.json('snapshots/no-dispatch-owner-observation.json', {
      original_owner_session_id: f.author.id, original_status: f.author.status, no_pending_continuation: true,
      current_writer_id: before.authority.writer_id, exclusive_writer: true, source: 'Disposable single host SQLite fixture' })
    const scienceCapture = await f.json('snapshots/no-dispatch-science-observation.json', {
      original_scientific_authority: false, admissions_count_scope: 'all_original_authority_history',
      before: { campaign_id: 'fixture-unadmitted-target', state: 'not_admitted', admissions_count: 385 },
      after: { campaign_id: 'fixture-unadmitted-target', state: 'not_admitted', admissions_count: 385 }, original_admission_for_attempt: false })
    const observation = { schema_version: 1, kind: 'no_dispatch_ownership_observation', host_scope: 'disposable-fixture',
      authority: before.authority, current_snapshot: snapshot, tuple, original_science_policy: null,
      original_owner_session_id: f.author.id, original_owner_stopped: true, current_writer_id: before.authority.writer_id,
      exclusive_current_writer: true, no_deferred_continuation: true, ownership_capture: ownershipCapture,
      original_science_capture: scienceCapture, original_science_before: { campaign_id: 'fixture-unadmitted-target', state: 'not_admitted', admissions_count: 385 },
      original_science_after: { campaign_id: 'fixture-unadmitted-target', state: 'not_admitted', admissions_count: 385 },
      original_admission_for_attempt: false, original_admission_delta: 0 }
    const observationRef = await f.json('snapshots/no-dispatch-observation.json', observation)
    const proof: NoDispatchProof = { schema_version: 1, kind: 'qualified_native_no_dispatch', host_scope: 'disposable-fixture',
      authority: before.authority, binding: before.binding, original_policy: f.policyRef, original_snapshot: snapshot,
      current_snapshot: snapshot, recovery_policy: recoveryRef, tuple, guard: guardIdentity, qualification, source_pins: pins as any,
      control_flow_qualification: flow, actual_tool_call_id: 'actual-original-native-refusal', native_prefix: prefix,
      native_prefix_source: prefix, native_prefix_encoding: 'canonical_session',
      tool_call_capture: toolCall, tool_result_capture: toolResult, capture_ref: toolResult, parser_input_sha256: toolResult.sha256,
      parser_source: pins[5]!.content, prefix_complete: true, tool_result_complete: true, observed_unique_error: error,
      observation: observationRef, no_dispatch: true }
    const proofRef = await f.json('snapshots/no-dispatch-qualified-proof.json', proof)
    const config: NoDispatchReconciliationConfig = { artifacts: f.artifacts, table: f.table, projectKey: f.config.projectKey,
      originalPolicy: f.policyRef, hostScope: 'disposable-fixture', guardIdentity, guardQualification: qualification,
      guard: { identity: guardIdentity, qualification, observe: async (_context: NoDispatchContext, signal: AbortSignal) => {
        signal.throwIfAborted(); calls.observation++; assert.equal(f.author.status, 'idle'); return proofRef } },
      observeReview: async (context: NoDispatchReviewContext, signal: AbortSignal) => {
        signal.throwIfAborted(); calls.reviewObservation++
        assert.equal(context.review.review_id, reviewId)
        assert.match(context.reviewRef.sha256, /^[a-f0-9]{64}$/)
        assert.deepEqual(context.recoveryPolicyRef, recoveryRef)
        assert.deepEqual(context.review.request, reviewRequest)
        assert.equal(context.review.reviewer.session_id, f.reviewer.id)
        // This reads the registered live native reviewer, independently of the
        // caller's artifact. Never use the declared completion as this source.
        return { session_id: f.reviewer.id, provider: f.policy.reviewer.provider, events: f.reviewer.session.snapshotEvents() }
      },
      assertCurrentWriter: () => { calls.writer++ }, timeoutMs: 1000 }
    await work({ ...f, config, calls, before, packet, snapshot, recovery, recoveryRef, review, reviewRef, completion,
      proof, proofRef, observation, qualification, pins, events, toolCall, toolResult, earlierReviewEvents,
      request: { recovery_policy: recoveryRef, review: reviewRef }, signal: new AbortController().signal })
  } finally { unregister?.(); if (f) await f.close(); await rm(root, { recursive: true, force: true }) }
}

test('qualified public SQLite settlement retains the consumed 650000ms and actual original tool facts, without process metrics', async () => {
  await fixture(async f => {
    const originalBytes = await f.artifacts.read(f.snapshot)
    const actualResultBytes = await f.artifacts.read(f.toolResult)
    const outcome = await reconcileNoDispatch(f.config, f.request, f.signal)
    const state = f.table.get(f.config.projectKey)
    const action = state.actions[outcome.action_id]
    assert.equal(outcome.status, 'settled')
    assert.equal(outcome.replay, false)
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.consumed_timeout_ms, 650000)
    assert.equal(state.reserved_timeout_ms, 0)
    assert.equal(state.active_action_id, null)
    assert.equal(state.hold, null)
    assert.equal(action.phase, 'settled')
    assert.equal(action.reservation_active, false)
    assert.deepEqual(action, { ...f.before.actions[action.action_id], phase: 'settled', reservation_active: false,
      evidence: outcome.evidence, checkpoint: outcome.checkpoint })
    assert.deepEqual(state, { ...f.before, revision: f.before.revision + 1, active_action_id: null,
      reserved_timeout_ms: 0, hold: null, actions: { ...f.before.actions, [action.action_id]: action } })
    const evidence = EvidenceSchema.parse(JSON.parse(Buffer.from(await f.artifacts.read(outcome.evidence)).toString()))
    const checkpoint = CheckpointSchema.parse(JSON.parse(Buffer.from(await f.artifacts.read(outcome.checkpoint)).toString()))
    assert.equal(evidence.native.job_id, null)
    assert.equal(evidence.native.tool_call_id, f.proof.actual_tool_call_id)
    assert.deepEqual(evidence.terminal, { status: 'unknown', raw_status: 'raw_pre_dispatch_refusal', exit_code: null,
      signal: null, timeout: false, abort: false, ownership_resolved: true, settlement: f.proofRef })
    assert.equal(evidence.capture.complete, false)
    assert.deepEqual(evidence.capture.artifact, f.toolResult)
    assert.equal(evidence.evidence_status, 'invalid')
    assert.equal(evidence.scientific_status, 'ineligible')
    assert.deepEqual(evidence.result, {})
    assert.deepEqual(evidence.verifier, { identity: f.packet.manifest.evaluator.verifier, result: null, verdict: 'unavailable' })
    assert.equal(evidence.costs.length, 1)
    assert.equal(evidence.costs[0]!.purpose, 'C_run')
    assert.equal(evidence.costs[0]!.amount, null)
    assert.equal(evidence.costs[0]!.source, null)
    assert.ok(evidence.costs[0]!.unresolved_reason)
    assert.equal(checkpoint.decision, 'defer')
    assert.equal(checkpoint.scientific_outcome, 'unavailable')
    assert.equal(checkpoint.next_action, null)
    assert.deepEqual(checkpoint.reviews, [f.packet.request.review, f.reviewRef])
    assert.deepEqual(await f.artifacts.read(f.snapshot), originalBytes)
    assert.deepEqual(await f.artifacts.read(f.toolResult), actualResultBytes)
    assert.deepEqual([f.calls.jobs, f.calls.execute], [0, 0])
    const replay = await reconcileNoDispatch(f.config, { ...f.request, proof: f.proofRef }, f.signal)
    assert.deepEqual(replay, { ...outcome, replay: true })
    assert.deepEqual(f.table.get(f.config.projectKey), state)
    assert.equal(f.calls.observation, 1)
  })
})

for (const [name, changed] of [
  ['dispatch tuple', (f: any) => ({ ...f.proof, tuple: { ...f.proof.tuple, dispatch_token: 'different-original-dispatch' } })],
  ['tool identity', (f: any) => ({ ...f.proof, actual_tool_call_id: 'different-actual-call' })],
  ['source pin', (f: any) => ({ ...f.proof, source_pins: f.proof.source_pins.map((pin: any) => pin.role === 'native_adapter' ? { ...pin, content: f.snapshot } : pin) })],
  ['qualification', (f: any) => ({ ...f.proof, qualification: f.snapshot })],
  ['missing tool prefix', (f: any) => ({ ...f.proof, native_prefix: f.snapshot })],
  ['missing original raw bytes', (f: any) => ({ ...f.proof, native_prefix: { ...f.proof.native_prefix, uri: 'snapshots/unavailable-original-prefix.json' } })],
  ['incomplete proof', (f: any) => ({ ...f.proof, prefix_complete: false })],
  ['result parser bytes', (f: any) => ({ ...f.proof, parser_input_sha256: f.snapshot.sha256 })],
  ['model assertion only', (f: any) => ({ no_dispatch: true, reason: 'A model says no job or GPU was seen', snapshot: f.snapshot })],
] as const) test('public SQLite refuses '+name+' and preserves the entire unknown authority record', async () => {
  await fixture(async f => {
    const bad = await f.json('snapshots/no-dispatch-counterexample.json', changed(f))
    await assert.rejects(reconcileNoDispatch(returningProof(f, bad), { ...f.request, proof: bad }, f.signal))
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
    assert.deepEqual([f.calls.jobs, f.calls.execute], [0, 0])
  })
})

for (const [name, changed] of [
  ['writer identity', (f: any) => ({ ...f.observation, current_writer_id: 'different-host-writer' })],
  ['original owner running', (f: any) => ({ ...f.observation, original_owner_stopped: false })],
  ['writer not exclusive', (f: any) => ({ ...f.observation, exclusive_current_writer: false })],
  ['deferred continuation', (f: any) => ({ ...f.observation, no_deferred_continuation: false })],
  ['original science admission', (f: any) => ({ ...f.observation, original_admission_for_attempt: true })],
  ['fabricated closed target campaign', (f: any) => ({ ...f.observation,
    original_science_before: { ...f.observation.original_science_before, state: 'closed' },
    original_science_after: { ...f.observation.original_science_after, state: 'closed' } })],
  ['science count changed', (f: any) => ({ ...f.observation, original_science_after: { ...f.observation.original_science_after, admissions_count: 386 } })],
] as const) test('public SQLite refuses '+name+' despite an observed unique native error', async () => {
  await fixture(async f => {
    const observation = await f.json('snapshots/no-dispatch-bad-observation.json', changed(f))
    const proof = await f.json('snapshots/no-dispatch-bad-observation-proof.json', { ...f.proof, observation })
    await assert.rejects(reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal))
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

for (const field of ['job_id', 'runtime_facts', 'evidence', 'dispatch_token', 'reservation_active'] as const)
  test('public SQLite refuses existing or changed '+field+' facts without replacing them', async () => {
    await fixture(async f => {
      const values = { job_id: 'existing-native-job', runtime_facts: { admission: f.snapshot, identity: f.snapshot, terminal: f.toolResult, capture: f.toolResult },
        evidence: f.snapshot, dispatch_token: 'different-retained-token', reservation_active: false }
      const changed = await f.table.update(f.config.projectKey, (state: any) => ResearchStateSchema.parse({ ...state,
        revision: state.revision + 1, ...(field === 'reservation_active' ? { reserved_timeout_ms: 0, active_action_id: null } : {}),
        actions: { ...state.actions, [f.packet.manifest.action_id]: { ...state.actions[f.packet.manifest.action_id], [field]: values[field] } } }))
      await assert.rejects(reconcileNoDispatch(f.config, f.request, f.signal), /current serialized state differs/)
      assert.deepEqual(f.table.get(f.config.projectKey), changed)
    })
  })

test('fresh contract revision native review is mandatory and the original run approval is refused', async () => {
  await fixture(async f => {
    await assert.rejects(reconcileNoDispatch(f.config, { ...f.request, review: f.packet.request.review }, f.signal), /fresh separate contract_revision/)
    const bad = await f.json('snapshots/no-dispatch-reused-review.json', { ...f.review, completion: f.packet.request.review })
    await assert.rejects(reconcileNoDispatch(f.config, { ...f.request, review: bad }, f.signal))
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('current host scope and registered source qualification cannot be supplied by proof data', async () => {
  await fixture(async f => {
    await assert.rejects(reconcileNoDispatch({ ...f.config, hostScope: 'unqualified-other-host' }, f.request, f.signal), /host scope/)
    await assert.rejects(reconcileNoDispatch({ ...f.config, guard: { ...f.config.guard, qualification: f.snapshot } }, f.request, f.signal), /host-registered/)
    await assert.rejects(reconcileNoDispatch({ ...f.config, guard: undefined } as any, f.request, f.signal), /host-registered/)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('qualified proof cannot release a reservation after a concurrent serialized writer/state update', async () => {
  await fixture(async f => {
    let raced: any
    const config = { ...f.config, assertCurrentWriter: async () => {
      raced ??= await f.table.update(f.config.projectKey, (state: any) => ({ ...state, revision: state.revision + 1, stopped: true }))
    } }
    await assert.rejects(reconcileNoDispatch(config, f.request, f.signal), /concurrent state\/writer\/policy\/action/)
    assert.deepEqual(f.table.get(f.config.projectKey), raced)
    assert.equal(raced.reserved_timeout_ms, 650000)
    assert.equal(raced.actions[f.packet.manifest.action_id].phase, 'unknown')
  })
})

test('concurrent identical proof settlements release once and retain one immutable association', async () => {
  await fixture(async f => {
    const results = await Promise.all([reconcileNoDispatch(f.config, { ...f.request, proof: f.proofRef }, f.signal),
      reconcileNoDispatch(f.config, { ...f.request, proof: f.proofRef }, f.signal)])
    assert.deepEqual(results.map(result => result.replay).sort(), [false, true])
    assert.deepEqual(results[0], { ...results[1], replay: results[0]!.replay })
    const state = f.table.get(f.config.projectKey)
    assert.equal(state.revision, f.before.revision + 1)
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.consumed_timeout_ms, 650000)
    assert.equal(state.reserved_timeout_ms, 0)
    const different = await f.json('snapshots/no-dispatch-different-replay.json', { ...f.proof, actual_tool_call_id: 'another-call' })
    await assert.rejects(reconcileNoDispatch(f.config, { ...f.request, proof: different }, f.signal), /replay differs/)
    assert.deepEqual(f.table.get(f.config.projectKey), state)
  })
})

test('an unresponsive no-dispatch guard is bounded and retains the original reservation', async () => {
  await fixture(async f => {
    const config = { ...f.config, timeoutMs: 20, guard: { ...f.config.guard, observe: () => new Promise<never>(() => {}) } }
    await assert.rejects(reconcileNoDispatch(config, f.request, f.signal), /No-dispatch guard deadline/)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('original full native Session v4 compressed bytes must match the complete normalized prefix', async () => {
  await fixture(async f => {
    const header = { type: 'session', version: 4, id: f.author.id }
    const raw = Buffer.from([header, ...f.events].map(value => canonicalJson(value)).join('\n') + '\n')
    const source = await f.artifacts.write('snapshots/no-dispatch-full-original-session.zstd', zstdCompressSync(raw))
    const prefix = await f.json('snapshots/no-dispatch-complete-session-view.json', { session_id: f.author.id, header, events: f.events })
    const proof = await f.json('snapshots/no-dispatch-full-source-proof.json', { ...f.proof, native_prefix: prefix,
      native_prefix_source: source, native_prefix_encoding: 'session_v4_jsonl_zstd' })
    const outcome = await reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal)
    assert.equal(outcome.status, 'settled')
    assert.equal(outcome.job_id, null)
  })
})

test('all concatenated original native Session row frames are decoded before public SQLite settlement', async () => {
  await fixture(async f => {
    const header = { type: 'session', version: 4, id: f.author.id }
    const rows = [header, ...f.events].map(value => Buffer.from(canonicalJson(value) + '\n'))
    const compressed = Buffer.concat(rows.map(row => zstdCompressSync(row)))
    assert.deepEqual(decodeCompleteZstd(compressed, f.artifacts.maxReadBytes), Buffer.concat(rows))
    const source = await f.artifacts.write('snapshots/no-dispatch-concatenated-original-session.zstd', compressed)
    const prefix = await f.json('snapshots/no-dispatch-concatenated-session-view.json', { session_id: f.author.id, header, events: f.events })
    const proof = await f.json('snapshots/no-dispatch-concatenated-source-proof.json', { ...f.proof, native_prefix: prefix,
      native_prefix_source: source, native_prefix_encoding: 'session_v4_jsonl_zstd' })
    const outcome = await reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal)
    assert.equal(outcome.status, 'settled')
    assert.equal(f.table.get(f.config.projectKey).consumed_timeout_ms, 650000)
    assert.equal(f.table.get(f.config.projectKey).reserved_timeout_ms, 0)
  })
})

for (const [name, alter] of [
  ['truncated last frame', (compressed: Buffer) => compressed.subarray(0, -1)],
  ['trailing junk', (compressed: Buffer) => Buffer.concat([compressed, Buffer.from('unqualified trailing input')])],
  ['trailing skippable frame', (compressed: Buffer) => Buffer.concat([compressed, Buffer.from([0x50, 0x2a, 0x4d, 0x18, 0, 0, 0, 0])])],
] as const) test('concatenated native Session '+name+' refuses without releasing original authority', async () => {
  await fixture(async f => {
    const header = { type: 'session', version: 4, id: f.author.id }
    const rows = [header, ...f.events].map(value => Buffer.from(canonicalJson(value) + '\n'))
    const malformed = alter(Buffer.concat(rows.map(row => zstdCompressSync(row))))
    assert.throws(() => decodeCompleteZstd(malformed, f.artifacts.maxReadBytes))
    const source = await f.artifacts.write('snapshots/no-dispatch-invalid-concatenated-session.zstd', malformed)
    const prefix = await f.json('snapshots/no-dispatch-invalid-concatenated-view.json', { session_id: f.author.id, header, events: f.events })
    const proof = await f.json('snapshots/no-dispatch-invalid-concatenated-proof.json', { ...f.proof, native_prefix: prefix,
      native_prefix_source: source, native_prefix_encoding: 'session_v4_jsonl_zstd' })
    await assert.rejects(reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal))
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('concatenated native Session aggregate output is bounded across individually bounded frames', async () => {
  await fixture(async f => {
    const header = { type: 'session', version: 4, id: f.author.id }
    const raw = Buffer.from([header, ...f.events].map(value => canonicalJson(value)).join('\n') + '\n')
    const maximum = f.artifacts.maxReadBytes
    const padding = Buffer.alloc(maximum, 0x20)
    const compressed = Buffer.concat([zstdCompressSync(raw), zstdCompressSync(padding)])
    assert.ok(raw.length < maximum)
    assert.equal(decodeCompleteZstd(zstdCompressSync(padding), maximum).length, maximum)
    assert.throws(() => decodeCompleteZstd(compressed, maximum))
    const source = await f.artifacts.write('snapshots/no-dispatch-aggregate-overflow-session.zstd', compressed)
    const prefix = await f.json('snapshots/no-dispatch-aggregate-overflow-view.json', { session_id: f.author.id, header, events: f.events })
    const proof = await f.json('snapshots/no-dispatch-aggregate-overflow-proof.json', { ...f.proof, native_prefix: prefix,
      native_prefix_source: source, native_prefix_encoding: 'session_v4_jsonl_zstd' })
    await assert.rejects(reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal))
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('a prefix ending at the actual refusal result cannot stand in for the complete original native Session', async () => {
  await fixture(async f => {
    const header = { type: 'session', version: 4, id: f.author.id }
    const result = f.events.find((event: any) => event.type === 'tool/result')
    const events = f.events.filter((event: any) => event.seq <= result.seq)
    const prefix = await f.artifacts.write('snapshots/no-dispatch-through-result-only.jsonl',
      Buffer.from([header, ...events].map(value => canonicalJson(value)).join('\n') + '\n'))
    const proof = await f.json('snapshots/no-dispatch-partial-source-proof.json', { ...f.proof, native_prefix: prefix,
      native_prefix_source: prefix, native_prefix_encoding: 'session_v4_jsonl' })
    await assert.rejects(reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal), /complete original native Session turn\/end/)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('qualified parser cannot replace raw source bytes with a different Session prefix view', async () => {
  await fixture(async f => {
    const altered = await f.json('snapshots/no-dispatch-altered-prefix.json', { session_id: f.author.id,
      events: f.events.map((event: any) => event.type === 'tool/result' ? { ...event, time: event.time + 1 } : event) })
    const proof = await f.json('snapshots/no-dispatch-altered-prefix-proof.json', { ...f.proof, native_prefix: altered })
    await assert.rejects(reconcileNoDispatch(returningProof(f, proof), { ...f.request, proof }, f.signal), /differs from original raw Session/)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('requesting a proof cannot bypass the independently registered host observer', async () => {
  await fixture(async f => {
    const forged = await f.json('snapshots/no-dispatch-proof-identity-label-only.json', { ...f.proof, observation: f.snapshot })
    await assert.rejects(reconcileNoDispatch(f.config, { ...f.request, proof: forged }, f.signal), /not verified and returned/)
    assert.equal(f.calls.observation, 1)
    const config = { ...f.config, guard: { ...f.config.guard, observe: async () => { throw new Error('Existing host owner observation unavailable') } } }
    await assert.rejects(reconcileNoDispatch(config, { ...f.request, proof: f.proofRef }, f.signal), /owner observation unavailable/)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('caller-authored approval completion with copied IDs cannot authenticate against the actual registered reviewer', async () => {
  await fixture(async f => {
    const actualEvents = f.reviewer.session.snapshotEvents()
    const forgedEvents = actualEvents.map((event: any) => event.type === 'assistant/message'
      ? { ...event, time: event.time + 1, data: { ...event.data, message: { ...event.data.message, id: 'caller-authored-completion' } } }
      : event)
    const completion = await f.json('snapshots/no-dispatch-forged-native-review-completion.json', {
      session_id: f.reviewer.id, provider: f.policy.reviewer.provider, events: forgedEvents })
    const review = await f.json('snapshots/no-dispatch-forged-native-review.json', { ...f.review, completion })
    await assert.rejects(reconcileNoDispatch(f.config, { ...f.request, review }, f.signal), /actual registered native Session prefix/)
    assert.equal(f.calls.reviewObservation, 1)
    assert.equal(f.calls.observation, 0)
    assert.equal(f.calls.writer, 0)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('the native reviewer observation port is mandatory and cannot fall back to completion metadata', async () => {
  await fixture(async f => {
    await assert.rejects(reconcileNoDispatch({ ...f.config, observeReview: undefined } as any, f.request, f.signal), /mandatory host-registered native review/)
    const unavailable = { ...f.config, observeReview: async () => { throw new Error('Registered native reviewer Session service unavailable') } }
    await assert.rejects(reconcileNoDispatch(unavailable, f.request, f.signal), /native reviewer Session service unavailable/)
    assert.equal(f.calls.observation, 0)
    assert.equal(f.calls.writer, 0)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

for (const [name, eventsFor] of [
  ['stale different request', (f: any) => f.earlierReviewEvents],
  ['missing original native events', (f: any) => f.reviewer.session.snapshotEvents().slice(1)],
  ['different raw native event fields', (f: any) => f.reviewer.session.snapshotEvents().map((event: any) => event.type === 'turn/end'
    ? { ...event, sourceAcceptedExtra: 'A field absent from the declared raw prefix' } : event)],
] as const) test('actual reviewer '+name+' refuses even with a valid native no-dispatch guard', async () => {
  await fixture(async f => {
    const config = { ...f.config, observeReview: async () => ({ session_id: f.reviewer.id, provider: f.policy.reviewer.provider, events: eventsFor(f) }) }
    await assert.rejects(reconcileNoDispatch(config, f.request, f.signal), /actual registered native Session prefix/)
    assert.equal(f.calls.observation, 0)
    assert.equal(f.calls.writer, 0)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('a native approval for a different request is refused even when declared and actually observed prefixes match', async () => {
  await fixture(async f => {
    f.reviewerLLM.script.push(text(JSON.stringify({ subject_kind: 'contract_revision', decision: 'approve',
      review_id: f.review.review_id, request_sha256: f.snapshot.sha256, recovery_policy_sha256: f.recoveryRef.sha256 })))
    f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: 'A different disposable request without settlement authority' }], source: { kind: 'user' } }))
    await f.reviewer.whenIdle()
    const completion = await f.json('snapshots/no-dispatch-real-different-request-completion.json', {
      session_id: f.reviewer.id, provider: f.policy.reviewer.provider, events: f.reviewer.session.snapshotEvents() })
    const review = await f.json('snapshots/no-dispatch-real-different-request-review.json', { ...f.review, completion })
    await assert.rejects(reconcileNoDispatch(f.config, { ...f.request, review }, f.signal), /does not approve this recovery policy\/request/)
    assert.equal(f.calls.observation, 0)
    assert.equal(f.calls.writer, 0)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('an unresponsive native reviewer observation is bounded without reserving or releasing authority', async () => {
  await fixture(async f => {
    const config = { ...f.config, timeoutMs: 20, observeReview: () => new Promise<never>(() => {}) }
    await assert.rejects(reconcileNoDispatch(config, f.request, f.signal), /No-dispatch guard deadline/)
    assert.equal(f.calls.observation, 0)
    assert.equal(f.calls.writer, 0)
    assert.deepEqual(f.table.get(f.config.projectKey), f.before)
  })
})

test('settled replay authenticates its retained reviewer prefix after a legitimate appended native turn', async () => {
  await fixture(async f => {
    const outcome = await reconcileNoDispatch(f.config, f.request, f.signal)
    const settled = structuredClone(f.table.get(f.config.projectKey))
    const originalEventCount = f.reviewer.session.snapshotEvents().length
    const writerChecks = f.calls.writer
    f.reviewerLLM.script.push(text('Later completed native reviewer turn for an unrelated request'))
    f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: 'An unrelated later review without original settlement authority' }], source: { kind: 'user' } }))
    await f.reviewer.whenIdle()
    assert.ok(f.reviewer.session.snapshotEvents().length > originalEventCount)
    const replay = await reconcileNoDispatch(f.config, { ...f.request, proof: f.proofRef }, f.signal)
    assert.deepEqual(replay, { ...outcome, replay: true })
    assert.equal(f.calls.reviewObservation, 2)
    assert.equal(f.calls.observation, 1)
    assert.equal(f.calls.writer, writerChecks)
    assert.deepEqual(f.table.get(f.config.projectKey), settled)
    assert.equal(settled.reserved_timeout_ms, 0)
    assert.equal(settled.consumed_timeout_ms, 650000)
  })
})
