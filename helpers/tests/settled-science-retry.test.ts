import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { createCpuFixture, text } from '../examples/synthetic-cpu/fixture.mjs'
import { NativeResearchAdapter } from '../src/native.js'
import { ResearchStateSchema } from '../src/admission.js'
import { EvidenceSchema, ManifestSchema, ReviewSchema } from '../src/records.js'
import type { ArtifactReference } from '../src/records.js'
import type { ProjectArtifacts } from '../src/manifest.js'
import { canonicalJson, deriveActionId, sha256, verifyBytes } from '../src/bindings.js'
import type { NativeRecoveryGuard } from '../src/recovery.js'

const originalRoot = '/Users/bytedance/wk/accorde'
const originalDirectory = 'local_artifacts/autoresearch/dsh/accorde-dsh-caller-value-alignment-recovery-v1/action-cc6bec592487d63032eaf07c5c70b60a998553fe26a02f4700537f47b70cdc00'
const originalEvidenceUri = `${originalDirectory}/evidence.json`
const originalCheckpointUri = `${originalDirectory}/checkpoint.json`

/** Read-only actual scientific parent documents in a virtual canonical namespace.
 * New metadata and the public SQLite table are disposable. The authority fence
 * stops the new action after reservation; no original DB, job or GPU is opened. */
async function fixture(work: (f: any) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-settled-science-retry-'))
  let f: any
  try {
    f = await createCpuFixture(join(root, 'project'), { timeoutMs: 650000 })
    f.unregister()
    const retained = async (uri: string) => {
      const bytes = await readFile(join(originalRoot, uri))
      return { bytes, ref: { uri, sha256: sha256(bytes), size_bytes: bytes.length } }
    }
    const actual = await retained(originalEvidenceUri)
    assert.ok(actual.ref.sha256.startsWith('807da9c7'))
    const evidence = EvidenceSchema.parse(JSON.parse(actual.bytes.toString()))
    const actualCheckpoint = await retained(originalCheckpointUri)
    assert.ok(actualCheckpoint.ref.sha256.startsWith('cd4afd0c'))
    const parentManifest = ManifestSchema.parse(JSON.parse((await readFile(join(originalRoot, evidence.manifest.uri))).toString()))
    const ack = JSON.parse((await readFile(join(originalRoot, evidence.admission.acknowledgement.uri))).toString())
    const parent = { ...ack.action, phase: 'settled', reservation_active: false, job_id: evidence.native.job_id,
      evidence: actual.ref, checkpoint: actualCheckpoint.ref, runtime_facts: { admission: evidence.admission.acknowledgement,
        identity: evidence.identity.before, terminal: { ...(await retained(`${originalDirectory}/native-terminal.json`)).ref }, capture: evidence.capture.artifact } }
    const originalState = JSON.parse((await readFile(join(originalRoot,
      'local_artifacts/autoresearch/dsh/accorde-gpu-pilot/science/261113-recovery/remote-worker/original-native-state.json'))).toString()).state
    const firstId = parentManifest.proposal.retry!.parent_action_id
    const first = { ...originalState.actions[firstId], phase: 'settled', reservation_active: false,
      evidence: parentManifest.proposal.retry!.parent_failure, checkpoint: parentManifest.goal.checkpoint }
    const stored = new Map<string, Uint8Array>()
    const json = async (uri: string, value: unknown): Promise<ArtifactReference> => {
      const bytes = Buffer.from(canonicalJson(value)); stored.set(uri, bytes)
      return { uri, sha256: sha256(bytes), size_bytes: bytes.length }
    }
    const virtualRoot = evidence.binding.authority.project_root
    const artifacts = { root: virtualRoot, maxReadBytes: 4 * 1024 * 1024,
      withReadPrefixes: () => artifacts,
      read: async (ref: ArtifactReference): Promise<Uint8Array> => {
        let bytes = stored.get(ref.uri)
        if (!bytes) {
          try { bytes = await readFile(join(originalRoot, ref.uri)) }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; bytes = await f.artifacts.read(ref) }
        }
        assert.ok(bytes); verifyBytes(ref, bytes); return bytes
      },
      write: async (uri: string, bytes: Uint8Array) => {
        assert.equal(stored.has(uri), false, 'New fixture receipts remain immutable')
        stored.set(uri, bytes); return { uri, sha256: sha256(bytes), size_bytes: bytes.length }
      } } as unknown as ProjectArtifacts
    const binding = { ...f.binding, authority: evidence.binding.authority }
    const recoveryPolicy = await json('snapshots/settled-science-recovery-policy.json', { fixture_only: true, parent: actual.ref,
      original_closed_unit: 'accorde-dsh-caller-value-alignment-recovery-v1.unit', max_attempts: 3 })
    const qualification = await json('snapshots/settled-science-recovery-qualification.json', { fixture_only: true, no_live_authority: true })
    const scienceGuard = await json('snapshots/settled-science-next-guard.json', { fixture_only: true })
    const scienceEnvelope = await json('snapshots/settled-science-next-unit.json', { fixture_only: true, unit: 'distinct-next-unit' })
    const gpuGuard = await json('snapshots/settled-science-gpu-guard.json', { fixture_only: true, physical_gpu: false })
    const policy = { ...f.policy, binding, authority: binding.authority, max_attempts: 3, max_timeout_ms: 650000,
      max_total_timeout_ms: 1950000, scope: 'project_gpu_development', gpu: { purpose: 'C_science',
        resource: { host: 'disposable-fixture', device_uuid: 'GPU-c80fe196-e3ba-82ff-7233-d9804f701864' },
        guard: gpuGuard, qualification, budget: qualification, lease_namespace: qualification,
        environment: { CUDA_VISIBLE_DEVICES: 'GPU-c80fe196-e3ba-82ff-7233-d9804f701864' },
        science: { authority: binding.authority, guard: scienceGuard, envelope: scienceEnvelope } } }
    const policyRef = await json('snapshots/settled-science-next-policy.json', policy)
    await f.table.put(f.config.projectKey, ResearchStateSchema.parse({ ...f.table.get(f.config.projectKey), binding, authority: binding.authority,
      policy: policyRef, consumed_attempts: 2, consumed_timeout_ms: 1300000, reserved_timeout_ms: 0, active_action_id: null,
      revision: 40, consumed_reviews: [first.review_id, parent.review_id], actions: { [first.action_id]: first, [parent.action_id]: parent }, hold: null }))
    const calls = { recovery: 0, science: 0, gpu: 0, jobs: 0, execute: 0 }
    let ordinal = 0, selected: any
    const originalUnit = await json('snapshots/settled-science-original-unit.json', { original_unit: evidence.costs[0]!.execution_id })
    const guard: NativeRecoveryGuard = { identity: recoveryPolicy, qualification, parentEvidenceKind: 'settled_scientific_failure',
      preflight: async (context, signal) => {
        signal.throwIfAborted(); calls.recovery++
        assert.deepEqual(context.parent, f.table.get(f.config.projectKey).actions[parent.action_id])
        assert.equal(context.state.consumed_attempts, 2)
        return json(`snapshots/settled-science-preflight-${ordinal}.json`, { schema_version: 1, kind: 'native_recovery_preflight',
          manifest: selected.manifestRef, policy: policyRef, recovery_policy: recoveryPolicy,
          parent_action_id: parent.action_id, parent_attempt_id: parent.attempt_id, parent_failure: selected.manifest.proposal.retry.parent_failure,
          parent_checkpoint: parent.checkpoint, original_unit: originalUnit, replacement_unit: scienceEnvelope,
          observed_revision: context.state.revision, qualification, observation: parent.evidence, ready: true })
      } }
    const adapter = async (recovery: NativeRecoveryGuard = guard) => NativeResearchAdapter.open(f.ctx, { ...f.config,
      artifacts, policy: policyRef, recovery, executionShell: { resolve: (request: any) => f.ctx.shell.resolve(request),
        execute: () => { calls.execute++; throw new Error('No native execution permitted') } } as any,
      assertActiveAuthority: () => { if (f.table.get(f.config.projectKey).consumed_attempts > 2) throw new Error('Disposable fixture stops after qualified reservation') },
      gpu: { identity: gpuGuard, preflight: async (context: any) => { calls.gpu++; return json(`snapshots/settled-science-gpu-${ordinal}.json`, {
        schema_version: 1, kind: 'gpu_preflight', manifest: context.manifestRef, guard: gpuGuard, resource: policy.gpu.resource, ready: true, observation: qualification }) },
        settle: async () => { throw new Error('No GPU settlement permitted') } },
      science: { identity: scienceGuard, preflight: async (context: any) => { calls.science++; return json(`snapshots/settled-science-next-${ordinal}.json`, {
        schema_version: 1, kind: 'scientific_authority_preflight', manifest: context.manifestRef, policy: policy.gpu.science, ready: true, observation: qualification }) },
        settle: async () => { throw new Error('No original scientific dispatch permitted') } } })
    f.ctx.jobs.start = () => { calls.jobs++; throw new Error('No native job publication permitted') }
    const prepare = async () => {
      const subject = await f.makeSubject('negative')
      const input = subject.inputs[0]
      const invocation = { ...subject.invocation, cwd: virtualRoot, env: policy.gpu.environment,
        argv: [resolve(virtualRoot, policy.entrypoint.uri), resolve(virtualRoot, input.artifact.uri), 'negative'] }
      const proposal = { ...subject.proposal, prerequisites: [qualification, recoveryPolicy, scienceEnvelope],
        retry: { parent_action_id: parent.action_id, parent_failure: f.table.get(f.config.projectKey).actions[parent.action_id].evidence, recovery_policy: recoveryPolicy } }
      const replacement = { ...subject, binding, invocation, bounds: { ...subject.bounds, timeout_ms: 650000, max_attempts: 3,
        timeout_reservation_ms: 1950000, resource_policy: policyRef }, inputs: [{ ...input, purpose: 'C_science' }], proposal }
      const manifest = ManifestSchema.parse({ ...replacement, action_id: deriveActionId(replacement) })
      ordinal++
      const manifestRef = await json(`snapshots/settled-science-manifest-${ordinal}.json`, manifest)
      const request = await json(`snapshots/settled-science-review-request-${ordinal}.json`, { manifest: manifestRef, action_id: manifest.action_id })
      const reviewId = `settled-science-review-${ordinal}`
      f.reviewerLLM.script.push(text(JSON.stringify({ decision: 'approve', action_id: manifest.action_id,
        manifest_sha256: manifestRef.sha256, request_sha256: request.sha256, review_id: reviewId })))
      f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: canonicalJson({ manifest: manifestRef, request }) }], source: { kind: 'user' } }))
      await f.reviewer.whenIdle()
      const completion = await json(`snapshots/settled-science-review-completion-${ordinal}.json`, { session_id: f.reviewer.id,
        provider: policy.reviewer.provider, events: f.reviewer.session.snapshotEvents() })
      const review = ReviewSchema.parse({ schema_version: 1, kind: 'review', binding, review_id: reviewId,
        subject_kind: 'scientific_action', request, packet: manifestRef, subject: manifestRef, manifest: manifestRef,
        checkpoint: null, action_id: manifest.action_id, author_session_id: f.author.id, reviewer: { ...policy.reviewer, assurance: 'fixture_verified' },
        completion, status: 'completed', decision: 'approve', reason: 'Actual separate disposable native review', evidence: [parent.evidence],
        scope: { consumable_once: true, proposal: await json(`snapshots/settled-science-proposal-${ordinal}.json`, proposal), bounds: manifest.bounds,
          prerequisites: proposal.prerequisites }, hold: null })
      const reviewRef = await json(`snapshots/settled-science-review-${ordinal}.json`, review)
      return { manifest, manifestRef, review, reviewRef, request: { manifest: manifestRef, review: reviewRef, expected_revision: f.table.get(f.config.projectKey).revision } }
    }
    const invoke = async (packet: any, recovery: NativeRecoveryGuard = guard) => { selected = packet; return (await adapter(recovery)).run(packet.request, f.author, AbortSignal.timeout(5000)) }
    const replaceEvidence = async (changed: unknown) => {
      const ref = await json('snapshots/settled-science-counterexample-evidence.json', changed)
      await f.table.update(f.config.projectKey, (state: any) => ResearchStateSchema.parse({ ...state,
        actions: { ...state.actions, [parent.action_id]: { ...state.actions[parent.action_id], evidence: ref } } }))
    }
    await work({ ...f, artifacts, json, policy, policyRef, parent, evidence, actual, guard, calls, prepare, invoke, replaceEvidence })
  } finally { if (f) await f.close(); await rm(root, { recursive: true, force: true }) }
}

test('explicit host-qualified settled scientific retry retains two attempts and reserves the third exactly once', async () => {
  await fixture(async f => {
    const before = structuredClone(f.table.get(f.config.projectKey))
    const originalBytes = await f.artifacts.read(f.actual.ref)
    const packet = await f.prepare()
    const outcome = await f.invoke(packet)
    assert.equal(outcome.status, 'unknown', 'the disposable authority fence stops before publication')
    const state = structuredClone(f.table.get(f.config.projectKey))
    assert.equal(state.consumed_attempts, 3)
    assert.equal(state.consumed_timeout_ms, 1950000)
    assert.equal(state.reserved_timeout_ms, 650000)
    assert.deepEqual(state.actions[f.parent.action_id], before.actions[f.parent.action_id])
    assert.deepEqual(state.consumed_reviews, [...before.consumed_reviews, packet.review.review_id])
    assert.deepEqual(f.calls, { recovery: 1, science: 1, gpu: 1, jobs: 0, execute: 0 })
    assert.deepEqual(await f.artifacts.read(f.actual.ref), originalBytes)
    assert.equal(f.evidence.costs.find((cost: any) => cost.purpose === 'C_science').amount, 31.429030936968047)
    assert.equal(f.evidence.costs.find((cost: any) => cost.purpose === 'C_run').amount, 27.323981170031956)
    assert.deepEqual(await f.invoke(packet), { ...outcome, replay: true })
    assert.deepEqual(f.table.get(f.config.projectKey), state)
    assert.equal(Object.keys(state.actions).length, 3)
    assert.equal(f.calls.recovery, 1)
  })
})

test('legacy recovery guard refuses the actual dispatched scientific parent before preflight or reservation', async () => {
  await fixture(async f => {
    const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
    const { parentEvidenceKind: _kind, ...legacy } = f.guard
    await assert.rejects(f.invoke(packet, legacy), /qualified pre-dispatch failure/)
    assert.deepEqual(f.table.get(f.config.projectKey), before)
    assert.equal(f.calls.recovery, 0)
  })
})

for (const [name, change] of [
  ['mismatched job', (e: any) => ({ ...e, native: { ...e.native, job_id: 'different-native-job' } })],
  ['missing native job', (e: any) => ({ ...e, native: { ...e.native, job_id: null, tool_call_id: 'cannot-relabel-science-as-no-dispatch' } })],
  ['unresolved ownership', (e: any) => ({ ...e, terminal: { ...e.terminal, ownership_resolved: false } })],
  ['missing scientific settlement', (e: any) => ({ ...e, terminal: { ...e.terminal, settlement: null } })],
  ['wrong scientific settlement', (e: any) => ({ ...e, terminal: { ...e.terminal, settlement: e.capture.artifact } })],
  ['missing scientific charge', (e: any) => ({ ...e, costs: e.costs.filter((cost: any) => cost.purpose !== 'C_science') })],
  ['unresolved scientific charge', (e: any) => ({ ...e, costs: e.costs.map((cost: any) => cost.purpose === 'C_science'
    ? { ...cost, amount: null, unresolved_reason: 'Unknown original scientific charge' } : cost) })],
  ['refunded scientific charge', (e: any) => ({ ...e, costs: e.costs.map((cost: any) => cost.purpose === 'C_science'
    ? { ...cost, amount: 0 } : cost) })],
  ['missing scientific charge source', (e: any) => ({ ...e, costs: e.costs.map((cost: any) => cost.purpose === 'C_science'
    ? { ...cost, source: null } : cost) })],
  ['mismatched scientific charge source', (e: any) => ({ ...e, costs: e.costs.map((cost: any) => cost.purpose === 'C_science'
    ? { ...cost, source: e.capture.artifact } : cost) })],
  ['mismatched admission capture', (e: any) => ({ ...e, admission: { ...e.admission, acknowledgement: e.capture.artifact } })],
] as const) test('settled scientific '+name+' refuses before guard or reservation', async () => {
  await fixture(async f => {
    await f.replaceEvidence(change(f.evidence))
    const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet))
    assert.deepEqual(f.table.get(f.config.projectKey), before)
    assert.deepEqual(f.calls, { recovery: 0, science: 0, gpu: 0, jobs: 0, execute: 0 })
  })
})

for (const field of ['admission', 'terminal', 'capture'] as const)
  test('mismatched retained runtime '+field+' refuses before settled scientific preflight', async () => {
    await fixture(async f => {
      await f.table.update(f.config.projectKey, (state: any) => ({ ...state, actions: { ...state.actions,
        [f.parent.action_id]: { ...state.actions[f.parent.action_id], runtime_facts: { ...state.actions[f.parent.action_id].runtime_facts,
          [field]: f.evidence.identity.before } } } }))
      const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
      await assert.rejects(f.invoke(packet))
      assert.deepEqual(f.table.get(f.config.projectKey), before)
      assert.deepEqual(f.calls, { recovery: 0, science: 0, gpu: 0, jobs: 0, execute: 0 })
    })
  })

test('author arguments cannot select the host-only settled scientific parent mode', async () => {
  await fixture(async f => {
    const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
    const { parentEvidenceKind: _kind, ...legacy } = f.guard
    await assert.rejects(f.invoke({ ...packet, request: { ...packet.request, parentEvidenceKind: 'settled_scientific_failure' } }, legacy), /Unrecognized key/)
    assert.deepEqual(f.table.get(f.config.projectKey), before)
    assert.equal(f.calls.recovery, 0)
  })
})

test('scientific settlement policy must match the original parent C_science policy rather than copied charges', async () => {
  await fixture(async f => {
    const wrapper = JSON.parse(Buffer.from(await f.artifacts.read(f.evidence.terminal.settlement)).toString())
    const original = JSON.parse(Buffer.from(await f.artifacts.read(wrapper.science)).toString())
    const foreignEnvelope = await f.json('snapshots/settled-science-foreign-envelope.json', { unrelated_scientific_scope: true })
    const science = await f.json('snapshots/settled-science-foreign-policy-receipt.json', { ...original,
      policy: { ...original.policy, envelope: foreignEnvelope } })
    const settlement = await f.json('snapshots/settled-science-foreign-policy-wrapper.json', { ...wrapper, science })
    await f.replaceEvidence({ ...f.evidence, terminal: { ...f.evidence.terminal, settlement } })
    const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet), /settlement\/charges differ/)
    assert.deepEqual(f.table.get(f.config.projectKey), before)
    assert.deepEqual(f.calls, { recovery: 0, science: 0, gpu: 0, jobs: 0, execute: 0 })
  })
})

test('missing runtime facts refuse the settled scientific retry without changing retained parent cost', async () => {
  await fixture(async f => {
    await f.table.update(f.config.projectKey, (state: any) => ({ ...state, actions: { ...state.actions,
      [f.parent.action_id]: { ...state.actions[f.parent.action_id], runtime_facts: null } } }))
    const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(f.invoke(packet), /exact retained native job\/admission\/capture\/ownership facts/)
    assert.deepEqual(f.table.get(f.config.projectKey), before)
    assert.equal(f.calls.recovery, 0)
  })
})

test('copied approval labels cannot authorize a settled scientific retry before native review authentication', async () => {
  await fixture(async f => {
    const packet = await f.prepare(), before = structuredClone(f.table.get(f.config.projectKey))
    const original = JSON.parse(Buffer.from(await f.artifacts.read(packet.review.completion)).toString())
    const forged = await f.json('snapshots/settled-science-forged-review-completion.json', { ...original,
      events: original.events.map((event: any) => event.type === 'assistant/message' ? { ...event, time: event.time + 1 } : event) })
    const review = await f.json('snapshots/settled-science-forged-review.json', { ...packet.review, completion: forged })
    await assert.rejects(f.invoke({ ...packet, request: { ...packet.request, review } }), /actual native Session prefix bytes/)
    assert.deepEqual(f.table.get(f.config.projectKey), before)
    assert.deepEqual(f.calls, { recovery: 0, science: 0, gpu: 0, jobs: 0, execute: 0 })
  })
})
