import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DevelopmentPolicySchema } from '../src/admission.js'
import { Version2ResearchStateSchema } from '../src/admission.js'
import { auditContinuity } from '../src/qualification.js'
import { createGpuFixture } from '../examples/gpu/fixture.mjs'

async function fixture(options: Record<string, unknown>, work: (f: any) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-gpu-guard-'))
  const f = await createGpuFixture(join(root, 'project'), { stub: true, ...options })
  try { await work(f) } finally { await f.close(); await rm(root, { recursive: true, force: true }) }
}

test('GPU preflight refusal precedes scientific admission and job dispatch', async () => {
  await fixture({ ready: false }, async f => {
    const p = await f.prepare()
    await assert.rejects(f.adapter.run(p.request, f.author, new AbortController().signal), /preflight is unavailable/)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 0)
    assert.equal(f.trace.some((event: any) => event.event === 'native_job_registered'), false)
  })
})
test('GPU guard environment and scientific assurance cannot borrow fixture authority', async () => {
  await fixture({}, async f => {
    assert.equal(DevelopmentPolicySchema.safeParse({ ...f.policy, gpu: { ...f.policy.gpu, environment: {} } }).success, false)
    assert.equal(DevelopmentPolicySchema.safeParse({ ...f.policy, gpu: { ...f.policy.gpu, purpose: 'C_science' } }).success, false)
  })
})
test('GPU native replay retains one admission and verified settlement', async () => {
  await fixture({}, async f => {
    const p = await f.prepare()
    const result = await f.adapter.run(p.request, f.author, new AbortController().signal)
    assert.equal(result.status, 'settled')
    const evidence = (await f.collected(result)).evidence
    assert.equal(evidence.scientific_status, 'eligible')
    const composite = JSON.parse(Buffer.from(await f.artifacts.read(evidence.terminal.settlement)).toString())
    assert.ok(composite.gpu)
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).replay, true)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
  })
})
test('incomplete GPU scheduling unit stays invalid despite normal native exit', async () => {
  await fixture({ completeUnit: false }, async f => {
    const p = await f.prepare()
    const result = await f.adapter.run(p.request, f.author, new AbortController().signal)
    const evidence = (await f.collected(result)).evidence
    assert.equal(evidence.evidence_status, 'invalid')
    assert.equal(evidence.scientific_status, 'ineligible')
    assert.equal(f.table.get(f.config.projectKey).reserved_timeout_ms, 0)
  })
})
test('unknown GPU quiescence retains its charge/reservation and cannot relaunch', async () => {
  await fixture({ quiescent: false }, async f => {
    const p = await f.prepare()
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).status, 'unknown')
    const state = f.table.get(f.config.projectKey)
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.reserved_timeout_ms, f.policy.max_timeout_ms)
    assert.equal(state.actions[p.manifest.action_id].phase, 'unknown')
    assert.ok(state.actions[p.manifest.action_id].runtime_facts?.terminal)
    assert.match(state.hold.reason, /quiescence unresolved/)
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).status, 'unknown')
  })
})
test('GPU settlement is bound to the original admitted native attempt', async () => {
  await fixture({ settlementOverride: { dispatch_token: 'another-dispatch' } }, async f => {
    const p = await f.prepare()
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).status, 'unknown')
    assert.match(f.table.get(f.config.projectKey).hold.reason, /committed native subject/)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
  })
})
test('unresponsive GPU settlement is bounded and remains an unresolved reservation', async () => {
  await fixture({ timeoutMs: 250, guardFactory: (base: any) => ({ ...base, settle: () => new Promise(() => {}) }) }, async f => {
    const p = await f.prepare()
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).status, 'unknown')
    assert.match(f.table.get(f.config.projectKey).hold.reason, /GPU guard deadline/)
    assert.equal(f.table.get(f.config.projectKey).reserved_timeout_ms, 250)
  })
})
test('version-three GPU native facts cannot be dropped by an older encoding', async () => {
  await fixture({ quiescent: false }, async f => {
    const p = await f.prepare()
    await f.adapter.run(p.request, f.author, new AbortController().signal)
    const current = f.table.get(f.config.projectKey)
    const old = Version2ResearchStateSchema.parse({ ...current, schema_version: 2,
      actions: Object.fromEntries(Object.entries(current.actions).map(([id, value]: [string, any]) => {
        const { runtime_facts, ...action } = value; return [id, action]
      })) })
    assert.equal(old.schema_version, 2)
    assert.ok(auditContinuity(current, old).violations.includes(`gpu_native_facts_lost:${p.manifest.action_id}`))
  })
})
test('GPU inspection can retain a later quiescence proof without changing admission or reservation', async () => {
  await fixture({ quiescent: false }, async f => {
    const p = await f.prepare()
    await f.adapter.run(p.request, f.author, new AbortController().signal)
    const original = structuredClone(f.table.get(f.config.projectKey))
    const settle = f.gpu.settle
    f.gpu.settle = async (context: any, signal: AbortSignal) => {
      const prior = await settle(context, signal)
      const receipt = JSON.parse(Buffer.from(await f.artifacts.read(prior)).toString())
      return f.json('local_artifacts/autoresearch/dsh/gpu-qualification/later-quiescence.json', { ...receipt, device_context_quiescent: true })
    }
    assert.equal((await f.adapter.inspectGpuSettlement(p.manifest.action_id, new AbortController().signal)).status, 'quiescent')
    assert.deepEqual(f.table.get(f.config.projectKey), original)
    assert.equal(original.consumed_attempts, 1)
    assert.ok(original.actions[p.manifest.action_id].runtime_facts.capture)
  })
})
