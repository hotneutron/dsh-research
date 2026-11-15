import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ShellExecSpec, ShellExecutor } from '@deepseek-ai/dsh-shell'
import { createGpuFixture } from '../examples/gpu/fixture.mjs'
import { text, tool } from '../examples/synthetic-cpu/fixture.mjs'
import { NativeResearchAdapter } from '../src/native.js'
import { ResearchStateSchema, reserveAction } from '../src/admission.js'
import { EvidenceSchema, ManifestSchema, ReviewSchema } from '../src/records.js'
import type { ArtifactReference, Evidence, Manifest, Review } from '../src/records.js'
import { canonicalJson, deriveActionId } from '../src/bindings.js'
import { checkpointFor } from '../src/loop.js'
import { RecoveryPreflightSchema, checkRecoveryPreflight } from '../src/recovery.js'
import type { NativeRecoveryGuard, RecoveryPreflight } from '../src/recovery.js'

type GuardContext = Parameters<NativeRecoveryGuard['preflight']>[0]
type Options = {
  changeProof?: (proof: RecoveryPreflight, f: any) => unknown
  whileGuard?: (context: GuardContext, f: any) => Promise<void>
}

/** Public native tools/Session reviews and SQLite state; all scientific and GPU
 * ports are artifact-only engineering stubs. This does not qualify an H100 host. */
async function fixture(work: (f: any) => Promise<void>, options: Options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-qualified-retry-'))
  let f: any, science: any, unregister: (() => void) | undefined
  const calls = { recovery: 0, science: 0, scienceSettlement: 0, gpu: 0, jobs: 0, execute: 0 }
  let serial = 0
  try {
    f = await createGpuFixture(join(root, 'project'), { stub: true, timeoutMs: 650000,
      guardFactory: (base: any) => ({ ...base, preflight: async (...args: any[]) => { calls.gpu++; return base.preflight(...args) } }),
      scienceFactory: async (base: any) => {
        const identity = await base.json('snapshots/retry-original-science-guard.json', { scope: 'Disposable original science port; no real authority' })
        const envelope = await base.json('snapshots/retry-science-envelope.json', { physical_science: false })
        const policy = { authority: base.policy.authority, envelope, guard: identity }
        science = { identity,
          preflight: async (context: any) => {
            calls.science++
            const observation = await base.json(`snapshots/retry-science-observation-${++serial}.json`, { original_admission: false })
            return base.json(`snapshots/retry-science-preflight-${serial}.json`, { schema_version: 1,
              kind: 'scientific_authority_preflight', manifest: context.manifestRef, policy, ready: true, observation })
          },
          settle: async (context: any) => {
            calls.scienceSettlement++
            const source = await base.json(`snapshots/retry-synthetic-science-cost-${++serial}.json`, { synthetic_only: true, wall_seconds: .0001 })
            return base.json(`snapshots/retry-synthetic-science-settlement-${serial}.json`, {
              schema_version: 1, kind: 'scientific_authority_settlement', manifest: context.manifestRef, policy,
              action_id: context.action_id, attempt_id: context.attempt_id, dispatch_token: context.dispatch_token,
              admitted_revision: context.admitted_revision, native_terminal: context.native_terminal, capture: context.capture,
              campaign_id: `fixture-replacement-${context.action_id}`, contract: envelope, admission: source,
              checkpoint: source, authority_observation: source, campaign_state: 'closed', costs: [{
                execution_id: `fixture-scientific-unit-${context.action_id}`, purpose: 'C_science', unit: 'process_elapsed_seconds',
                amount: .0001, source, unresolved_reason: null }] })
          } }
        return { policy, guard: science }
      } })
    const config = { ...f.config, policy: f.policyRef, gpu: f.gpu, science }
    const start = f.ctx.jobs.start.bind(f.ctx.jobs)
    f.ctx.jobs.start = (args: any) => { calls.jobs++; return start(args) }
    const baseShell = f.ctx.shell as ShellExecutor
    const executed: ShellExecSpec[] = []
    const shell = Object.create(baseShell) as ShellExecutor
    let historicalDrift = false
    shell.resolve = request => {
      const spec = baseShell.resolve(request)
      return historicalDrift ? { ...spec, timeoutMs: 600000 } : spec
    }
    shell.execute = spec => { calls.execute++; executed.push(spec); return baseShell.execute(spec) }
    const historical = await NativeResearchAdapter.open(f.ctx, { ...config, executionShell: shell,
      observe: event => { if (event === 'admission_acknowledged') historicalDrift = true } })
    unregister = historical.register({ toolScope: 'author' })
    const parentPacket = await f.prepare('negative')
    const originalCallId = 'actual-engineering-historical-refusal'
    f.authorLLM.script.push(tool(originalCallId, parentPacket.request), text('Historical unknown association retained'))
    f.author.followup(createUserMessage({ content: [{ type: 'text', text: 'Invoke this exact disposable historical action once' }], source: { kind: 'user' } }))
    await f.author.whenIdle()
    unregister(); unregister = undefined
    historicalDrift = false
    const unknown = f.table.get(f.config.projectKey)
    const parent = unknown.actions[parentPacket.manifest.action_id]
    assert.equal(parent.phase, 'unknown')
    assert.equal(parent.timeout_ms, 650000)
    assert.deepEqual([calls.jobs, calls.execute, calls.scienceSettlement], [0, 0, 0])
    const events = f.author.session.snapshotEvents()
    const call = events.find((event: any) => event.type === 'tool/call' && event.data.callId === originalCallId)
    const result = events.find((event: any) => event.type === 'tool/result' && event.data.message.toolCallId === originalCallId)
    assert.ok(call && result, 'the historical failure retains actual public tool events')
    const prefix = await f.json('snapshots/retry-original-native-prefix.json', { session_id: f.author.id, events })
    const capture = await f.json('snapshots/retry-original-tool-result.json', result)
    const settlement = await f.json('snapshots/retry-engineering-no-dispatch-settlement.json', {
      scope: 'Explicitly simulated settled historical failure for engineering tests; no production no-dispatch qualification',
      parent_action_id: parent.action_id, parent_attempt_id: parent.attempt_id, actual_tool_call_id: originalCallId,
      native_prefix: prefix, tool_result: capture, no_dispatch: true })
    const directory = `local_artifacts/autoresearch/dsh/${parentPacket.manifest.goal.id}/${parent.action_id}`
    // The actual native admission is retained by its immutable artifact bytes.
    const admissionBytes = await readFile(join(f.root, `${directory}/admission.json`))
    const actualAdmission = await f.artifacts.write('snapshots/retry-actual-original-admission.json', admissionBytes)
    const identity = await f.json('snapshots/retry-original-identity.json', { manifest_sha256: parentPacket.manifestRef.sha256 })
    const evidence: Evidence = EvidenceSchema.parse({ schema_version: 1, kind: 'evidence', binding: parentPacket.manifest.binding,
      action_id: parent.action_id, attempt_id: parent.attempt_id, manifest: parent.manifest,
      admission: { authority_id: unknown.authority.authority_id, committed_revision: parent.admitted_revision,
        acknowledgement: actualAdmission, action_id: parent.action_id, attempt_id: parent.attempt_id, manifest_sha256: parent.manifest.sha256 },
      native: { owner_session_id: f.author.id, producer: 'engineering_fixture_simulated_no_dispatch', job_id: null, tool_call_id: originalCallId },
      terminal: { status: 'unknown', raw_status: 'retained_actual_pre_dispatch_failure', exit_code: null, signal: null,
        timeout: false, abort: false, ownership_resolved: true, settlement },
      identity: { expected: identity, before: identity, after: null, matches: true },
      capture: { artifact: capture, complete: false, overflow: false, parser_input_sha256: capture.sha256 },
      output_schema: parentPacket.manifest.output, result: {},
      verifier: { identity: parentPacket.manifest.evaluator.verifier, result: null, verdict: 'unavailable' },
      evidence_status: 'invalid', scientific_status: 'ineligible', costs: [],
      remaining: { consumed_attempts: 1, reserved_timeout_ms: 0, costs: [] } })
    const failure = await f.json('snapshots/retry-retained-parent-failure.json', evidence)
    const checkpoint = await f.json('snapshots/retry-retained-parent-checkpoint.json', checkpointFor(parentPacket.manifest,
      evidence, failure, { ...unknown, reserved_timeout_ms: 0 }, parent.review))
    // Only this disposable fixture writer simulates completed historical reconciliation.
    await f.table.update(f.config.projectKey, (state: any) => ResearchStateSchema.parse({ ...state, revision: state.revision + 1,
      reserved_timeout_ms: 0, active_action_id: null, hold: null, actions: { ...state.actions,
        [parent.action_id]: { ...state.actions[parent.action_id], phase: 'settled', reservation_active: false, evidence: failure, checkpoint } } }))
    const retainedParent = structuredClone(f.table.get(f.config.projectKey).actions[parent.action_id])
    const originalUnit = await f.json('snapshots/retry-original-immutable-unit.json', { unit_id: 'original-never-redispatch', manifest: parent.manifest })
    const qualification = await f.json('snapshots/retry-qualification.json', { scope: 'Disposable engineering replacement route only', physical_GPU: false })
    const recoveryPolicy = await f.json('snapshots/retry-recovery-policy.json', { qualification, parent_action_id: parent.action_id,
      original_unit: originalUnit, max_attempts: 2, max_total_timeout_ms: 1300000, scientific_acceptance: false })
    Object.keys(calls).forEach(key => { calls[key as keyof typeof calls] = 0 })
    let packetSerial = 0
    async function prepare(retry = true, omit?: 'qualification' | 'policy') {
      const base = await f.prepare('negative')
      const { action_id: _id, ...subject } = base.manifest
      const state = f.table.get(f.config.projectKey)
      const currentParent = state.actions[parent.action_id]
      const proposal = { ...subject.proposal, prerequisites: [...subject.proposal.prerequisites,
        ...(omit === 'qualification' ? [] : [qualification]), ...(omit === 'policy' ? [] : [recoveryPolicy])],
        retry: retry ? { parent_action_id: parent.action_id, parent_failure: currentParent.evidence, recovery_policy: recoveryPolicy } : null }
      const manifest: Manifest = ManifestSchema.parse({ ...subject, goal: { ...subject.goal, checkpoint: currentParent.checkpoint },
        proposal, action_id: deriveActionId({ ...subject, goal: { ...subject.goal, checkpoint: currentParent.checkpoint }, proposal }) })
      const ordinal = ++packetSerial
      const manifestRef = await f.json(`snapshots/retry-replacement-manifest-${ordinal}.json`, manifest)
      const requestRef = await f.json(`snapshots/retry-replacement-review-request-${ordinal}.json`, { action_id: manifest.action_id, manifest: manifestRef })
      const reviewId = `actual-replacement-review-${ordinal}`
      f.reviewerLLM.script.push(text(JSON.stringify({ decision: 'approve', action_id: manifest.action_id,
        manifest_sha256: manifestRef.sha256, request_sha256: requestRef.sha256, review_id: reviewId })))
      f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: canonicalJson({ manifest: manifestRef, request: requestRef }) }], source: { kind: 'user' } }))
      await f.reviewer.whenIdle()
      const completion = await f.json(`snapshots/retry-replacement-review-completion-${ordinal}.json`, { session_id: f.reviewer.id,
        provider: f.policy.reviewer.provider, events: f.reviewer.session.snapshotEvents() })
      const review: Review = ReviewSchema.parse({ schema_version: 1, kind: 'review', binding: manifest.binding, review_id: reviewId,
        subject_kind: 'scientific_action', request: requestRef, packet: manifestRef, subject: manifestRef, manifest: manifestRef,
        checkpoint: null, action_id: manifest.action_id, author_session_id: f.author.id,
        reviewer: { ...f.policy.reviewer, assurance: 'fixture_verified' }, completion, status: 'completed', decision: 'approve',
        reason: 'Actual separate scripted review of a fresh engineering replacement', evidence: [currentParent.evidence],
        scope: { consumable_once: true, proposal: await f.json(`snapshots/retry-replacement-proposal-${ordinal}.json`, proposal),
          bounds: manifest.bounds, prerequisites: proposal.prerequisites }, hold: null })
      const reviewRef = await f.json(`snapshots/retry-replacement-review-${ordinal}.json`, review)
      const replacementUnit = await f.json(`snapshots/retry-replacement-unit-${ordinal}.json`, { unit_id: `fresh-replacement-${ordinal}`, manifest: manifestRef })
      return { manifest, manifestRef, review, reviewRef, replacementUnit,
        request: { manifest: manifestRef, review: reviewRef, expected_revision: state.revision } }
    }
    const proofFor = (packet: any): RecoveryPreflight => RecoveryPreflightSchema.parse({ schema_version: 1, kind: 'native_recovery_preflight',
      manifest: packet.manifestRef, policy: f.policyRef, recovery_policy: recoveryPolicy, parent_action_id: parent.action_id,
      parent_attempt_id: retainedParent.attempt_id, parent_failure: packet.manifest.proposal.retry?.parent_failure ?? retainedParent.evidence,
      parent_checkpoint: retainedParent.checkpoint, replacement_unit: packet.replacementUnit, original_unit: originalUnit,
      observed_revision: f.table.get(f.config.projectKey).revision, qualification, observation: settlement, ready: true })
    let activePacket: any
    const guard: NativeRecoveryGuard = { identity: recoveryPolicy, qualification, preflight: async (context, signal) => {
      calls.recovery++; signal.throwIfAborted()
      const proof = proofFor(activePacket)
      await options.whileGuard?.(context, { ...f, calls })
      return f.json(`snapshots/retry-preflight-proof-${++serial}.json`, options.changeProof?.(proof, { ...f, originalUnit, retainedParent }) ?? proof)
    } }
    const open = (recovery: NativeRecoveryGuard | null = guard) => NativeResearchAdapter.open(f.ctx,
      { ...config, executionShell: shell, ...(recovery ? { recovery } : {}) })
    const invoke = async (packet: any, adapter?: NativeResearchAdapter) => {
      activePacket = packet
      return (adapter ?? await open()).run(packet.request, f.author, AbortSignal.timeout(10000))
    }
    await work({ ...f, config, calls, executed, parentPacket, prefix, capture, evidence, retainedParent, originalUnit,
      qualification, recoveryPolicy, prepare, proofFor, guard, open, invoke })
  } finally { unregister?.(); if (f) await f.close(); await rm(root, { recursive: true, force: true }) }
}

function assertNoReplacement(f: any, before: any) {
  assert.deepEqual(f.table.get(f.config.projectKey), before)
  assert.deepEqual(f.calls, { recovery: f.calls.recovery, science: 0, scienceSettlement: 0, gpu: 0, jobs: 0, execute: 0 })
  assert.equal(before.consumed_attempts, 1)
  assert.equal(before.consumed_timeout_ms, 650000)
  assert.equal(before.reserved_timeout_ms, 0)
}

test('qualified fresh replacement preserves the settled parent and global 2/1300000 allowance with replay only', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const outcome = await f.invoke(packet)
    assert.equal(outcome.status, 'settled')
    const state = f.table.get(f.config.projectKey)
    assert.deepEqual(state.actions[f.retainedParent.action_id], f.retainedParent)
    assert.equal(state.consumed_attempts, 2)
    assert.equal(state.consumed_timeout_ms, 1300000)
    assert.equal(state.reserved_timeout_ms, 0)
    assert.deepEqual(state.consumed_reviews, [f.retainedParent.review_id, packet.review.review_id])
    const replacement = state.actions[packet.manifest.action_id]
    assert.notEqual(replacement.action_id, f.retainedParent.action_id)
    assert.notEqual(replacement.attempt_id, f.retainedParent.attempt_id)
    assert.notEqual(replacement.dispatch_token, f.retainedParent.dispatch_token)
    assert.deepEqual(f.calls, { recovery: 1, science: 1, scienceSettlement: 1, gpu: 1, jobs: 1, execute: 1 })
    assert.equal(f.executed.length, 1)
    assert.ok(f.executed[0].command.includes(packet.manifest.invocation.argv[1]))
    assert.equal(f.executed[0].command.includes(f.parentPacket.manifest.invocation.argv[1]), false)
    const settled = structuredClone(state)
    assert.equal((await f.invoke(packet)).replay, true)
    assert.equal((await f.invoke(f.parentPacket)).replay, true)
    assert.deepEqual(f.table.get(f.config.projectKey), settled)
    assert.equal(f.calls.recovery, 1)
    assert.equal(f.calls.jobs, 1)
    const third = await f.prepare()
    await assert.rejects(f.invoke(third), /allowance is exhausted/)
    assert.deepEqual(f.table.get(f.config.projectKey), settled)
    assert.equal(f.calls.jobs, 1)
    assert.equal(f.calls.execute, 1)
  })
})

test('unregistered recovery guard refuses the exact reviewed retry before science and admission', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet, await f.open(null)), /host-registered guard/)
    assert.equal(f.calls.recovery, 0)
    assertNoReplacement(f, before)
  })
})

test('a registered guard with another recovery identity cannot authorize the reviewed replacement', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    const adapter = await f.open({ ...f.guard, identity: f.qualification })
    await assert.rejects(f.invoke(packet, adapter), /host-registered guard/)
    assert.equal(f.calls.recovery, 0)
    assertNoReplacement(f, before)
  })
})

test('host-registered qualification must match the returned recovery proof', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    const adapter = await f.open({ ...f.guard, qualification: f.originalUnit })
    await assert.rejects(f.invoke(packet, adapter), /qualification\/revision is unavailable/)
    assert.equal(f.calls.recovery, 1)
    assertNoReplacement(f, before)
  })
})

for (const omitted of ['qualification', 'policy'] as const)
  test('a fresh native review without recovery '+omitted+' prerequisites does not admit the replacement', async () => {
    await fixture(async f => {
      const packet = await f.prepare(true, omitted)
      const before = structuredClone(f.table.get(f.config.projectKey))
      await assert.rejects(f.invoke(packet), /reviewed manifest prerequisites/)
      assert.equal(f.calls.recovery, 1)
      assertNoReplacement(f, before)
    })
  })

for (const [name, change] of [
  ['malformed proof', () => ({ ready: true })],
  ['wrong parent action', (p: RecoveryPreflight) => ({ ...p, parent_action_id: 'another-parent' })],
  ['wrong replacement manifest', (p: RecoveryPreflight) => ({ ...p, manifest: p.original_unit })],
  ['wrong parent attempt', (p: RecoveryPreflight) => ({ ...p, parent_attempt_id: 'another-attempt' })],
  ['wrong parent failure', (p: RecoveryPreflight) => ({ ...p, parent_failure: p.observation })],
  ['wrong parent checkpoint', (p: RecoveryPreflight) => ({ ...p, parent_checkpoint: p.observation })],
  ['stale revision', (p: RecoveryPreflight) => ({ ...p, observed_revision: p.observed_revision - 1 })],
  ['wrong current policy', (p: RecoveryPreflight) => ({ ...p, policy: p.recovery_policy })],
  ['wrong qualification', (p: RecoveryPreflight) => ({ ...p, qualification: p.recovery_policy })],
  ['unchanged original unit', (p: RecoveryPreflight) => ({ ...p, replacement_unit: p.original_unit })],
  ['unready proof', (p: RecoveryPreflight) => ({ ...p, ready: false })],
] as const) test('qualified recovery refuses '+name+' before science/reservation/jobs', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet))
    assert.equal(f.calls.recovery, 1)
    assertNoReplacement(f, before)
  }, { changeProof: change })
})

test('copying original immutable unit bytes to a different artifact URI cannot authorize replacement', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const renamed = await f.artifacts.write('snapshots/renamed-original-unit.json', await f.artifacts.read(f.originalUnit))
    assert.notEqual(renamed.uri, f.originalUnit.uri)
    assert.equal(renamed.sha256, f.originalUnit.sha256)
    const original = f.guard.preflight.bind(f.guard)
    const guard: NativeRecoveryGuard = { ...f.guard, preflight: async (context, signal) => {
      const ref = await original(context, signal)
      const proof = JSON.parse(Buffer.from(await f.artifacts.read(ref)).toString())
      return f.json('snapshots/renamed-unit-recovery-proof.json', { ...proof, replacement_unit: renamed })
    } }
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet, await f.open(guard)), /original immutable unit cannot be redispatched/)
    assert.equal(f.calls.recovery, 1)
    assertNoReplacement(f, before)
  })
})

for (const [name, stopped] of [['revision drift', false], ['stop', true]] as const)
  test('state '+name+' while recovery preflight awaits refuses before science and preserves the changed state', async () => {
    let changed: any
    await fixture(async f => {
      const packet = await f.prepare()
      await assert.rejects(f.invoke(packet), /revision is unavailable/)
      assertNoReplacement(f, changed)
      assert.equal(f.table.get(f.config.projectKey).stopped, stopped)
    }, { whileGuard: async (_context, f) => {
      changed = await f.table.update(f.config.projectKey, (state: any) => ({ ...state, revision: state.revision + 1, stopped }))
    } })
  })

test('retained failure evidence for a different action cannot qualify the stored parent', async () => {
  await fixture(async f => {
    const evidence = EvidenceSchema.parse({ ...f.evidence, action_id: 'unrelated-failed-action',
      admission: { ...f.evidence.admission, action_id: 'unrelated-failed-action' } })
    const different = await f.json('snapshots/retry-unrelated-parent-evidence.json', evidence)
    await f.table.update(f.config.projectKey, (state: any) => ResearchStateSchema.parse({ ...state, revision: state.revision + 1,
      actions: { ...state.actions, [f.retainedParent.action_id]: { ...state.actions[f.retainedParent.action_id], evidence: different } } }))
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet), /parent|failure|evidence/i)
    assert.equal(f.calls.recovery, 0)
    assertNoReplacement(f, before)
  })
})

for (const [name, change] of [
  ['non-invalid evidence', (e: Evidence) => ({ ...e, evidence_status: 'unresolved' })],
  ['unresolved scientific status', (e: Evidence) => ({ ...e, scientific_status: 'unresolved' })],
  ['native job publication', (e: Evidence) => ({ ...e, native: { ...e.native, job_id: 'actually-published-other-job' } })],
  ['missing actual tool identity', (e: Evidence) => ({ ...e, native: { ...e.native, tool_call_id: null } })],
  ['unresolved ownership', (e: Evidence) => ({ ...e, terminal: { ...e.terminal, ownership_resolved: false } })],
  ['missing settlement', (e: Evidence) => ({ ...e, terminal: { ...e.terminal, settlement: null } })],
] as const) test('retained parent '+name+' cannot use the qualified no-dispatch replacement route', async () => {
  await fixture(async f => {
    const evidence = await f.json('snapshots/retry-ineligible-parent-counterexample.json', change(f.evidence))
    await f.table.update(f.config.projectKey, (state: any) => ResearchStateSchema.parse({ ...state, revision: state.revision + 1,
      actions: { ...state.actions, [f.retainedParent.action_id]: { ...state.actions[f.retainedParent.action_id], evidence } } }))
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet))
    assert.equal(f.calls.recovery, 0)
    assertNoReplacement(f, before)
  })
})

test('pure coupled admission requires qualified recovery and refuses extra proof on a normal action', async () => {
  await fixture(async f => {
    const packet = await f.prepare()
    const state = structuredClone(f.table.get(f.config.projectKey))
    const reserve = (p = packet, proof?: RecoveryPreflight) => reserveAction(state, p.manifest, p.manifestRef, p.review,
      p.reviewRef, f.policy, f.policyRef, state.revision, 'independent-fixture-dispatch', proof)
    await assert.rejects(async () => reserve(), /not yet qualified/)
    const proof = f.proofFor(packet)
    assert.deepEqual(checkRecoveryPreflight(proof, state, packet.manifest, packet.manifestRef, f.policyRef, f.qualification), proof)
    const admitted = reserve(packet, proof)
    assert.equal(admitted.consumed_attempts, 2)
    assert.equal(admitted.consumed_timeout_ms, 1300000)
    assert.equal(admitted.reserved_timeout_ms, 650000)
    assert.deepEqual(admitted.actions[f.retainedParent.action_id], f.retainedParent)
    assert.deepEqual(reserveAction(admitted, packet.manifest, packet.manifestRef, packet.review, packet.reviewRef,
      f.policy, f.policyRef, state.revision, 'another-fixture-dispatch', proof), admitted,
    'a duplicate coupled recovery update retains the original claim even with its earlier revision')
    assert.deepEqual(f.table.get(f.config.projectKey), state, 'the pure coupled update does not mutate SQLite')
    const normal = await f.prepare(false)
    assert.throws(() => reserve(normal, { ...proof, manifest: normal.manifestRef }), /unrelated fresh action/)
    assert.deepEqual(f.calls, { recovery: 0, science: 0, scienceSettlement: 0, gpu: 0, jobs: 0, execute: 0 })
  })
})
