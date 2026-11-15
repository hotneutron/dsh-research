import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createGpuFixture } from '../examples/gpu/fixture.mjs'
import { NativeResearchAdapter } from '../src/native.js'
import { ResearchStateSchema } from '../src/admission.js'
import { ScienceSettlementSchema } from '../src/science.js'

async function fixture(options: Record<string, any>, work: (f: any, calls: Record<string, number>) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-science-guard-'))
  const calls = { preflight: 0, settle: 0 }
  let f: any
  try {
    f = await createGpuFixture(join(root, 'project'), { stub: true, scienceFactory: async (base: any) => {
      const identity = await base.json('snapshots/original-authority-guard.json', { scope: 'Disposable original-authority port fixture only' })
      const envelope = await base.json('snapshots/scientific-envelope.json', { qualified: false, physical_science: false })
      const policy = { authority: base.policy.authority, envelope, guard: identity }
      const guard = { identity,
        async preflight(context: any) {
          calls.preflight++
          await options.inspectPreflight?.(context, base)
          if (options.stopDuringPreflight) await base.table.update(base.config.projectKey, (s: any) => ResearchStateSchema.parse({ ...s, stopped: true, revision: s.revision + 1 }))
          const observation = await base.json('local_artifacts/autoresearch/dsh/science-observation-'+randomUUID()+'.json', { original_gate_ready: options.ready ?? true })
          return base.json('local_artifacts/autoresearch/dsh/science-preflight-'+randomUUID()+'.json', { schema_version: 1, kind: 'scientific_authority_preflight', manifest: context.manifestRef, policy, ready: options.ready ?? true, observation })
        },
        async settle(context: any) {
          calls.settle++
          const source = await base.json('local_artifacts/autoresearch/dsh/original-cost-'+randomUUID()+'.json', { scope: 'synthetic fixture', wall_seconds: options.cost ?? .001 })
          return base.json('local_artifacts/autoresearch/dsh/science-settlement-'+randomUUID()+'.json', {
            schema_version: 1, kind: 'scientific_authority_settlement', manifest: context.manifestRef, policy,
            action_id: context.action_id, attempt_id: context.attempt_id, dispatch_token: context.dispatch_token,
            admitted_revision: context.admitted_revision, native_terminal: context.native_terminal, capture: context.capture,
            campaign_id: 'disposable-original-campaign', contract: envelope, admission: source,
            checkpoint: options.missingCheckpoint ? { ...source, uri: 'snapshots/unavailable-checkpoint.json' } : source,
            authority_observation: source, campaign_state: 'closed',
            costs: [{ execution_id: 'disposable-original-unit', purpose: 'C_science', unit: 'process_elapsed_seconds', amount: options.cost ?? .001, source, unresolved_reason: null }],
            ...(options.settlementOverride ?? {}),
          })
        },
      }
      return { policy, guard }
    } })
    await work(f, calls)
  } finally { if (f) await f.close(); await rm(root, { recursive: true, force: true }) }
}

test('C_science requires its separately registered original-authority guard', async () => {
  await fixture({}, async f => {
    await assert.rejects(NativeResearchAdapter.open(f.ctx, { ...f.config, policy: f.policyRef, gpu: f.gpu }), /original scientific authority guard/)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 0)
  })
})
test('original scientific gate refusal precedes native reservation and dispatch', async () => {
  await fixture({ ready: false }, async f => {
    const p = await f.prepare()
    await assert.rejects(f.adapter.run(p.request, f.author, new AbortController().signal), /does not permit/)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 0)
    assert.equal(f.trace.some((x: any) => x.event === 'native_job_registered'), false)
  })
})
test('stop during original-authority preflight prevents reservation', async () => {
  await fixture({ stopDuringPreflight: true }, async f => {
    const p = await f.prepare()
    await assert.rejects(f.adapter.run(p.request, f.author, new AbortController().signal))
    assert.equal(f.table.get(f.config.projectKey).stopped, true)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 0)
  })
})
test('original gate receives the exact authenticated review before reservation without mutating admission inputs', async () => {
  let packet: any, expected: any
  await fixture({ inspectPreflight: async (context: any, base: any) => {
    assert.deepEqual(context.approvedReviewRef, packet.request.review)
    assert.deepEqual(context.approvedReview, expected)
    assert.equal(context.approvedReview.manifest.sha256, packet.request.manifest.sha256)
    assert.equal(base.table.get(base.config.projectKey).consumed_attempts, 0)
    context.approvedReview.review_id = 'guard-mutated-copy'
    context.approvedReviewRef.uri = 'snapshots/guard-mutated-reference.json'
  } }, async f => {
    packet = await f.prepare()
    expected = JSON.parse(Buffer.from(await f.artifacts.read(packet.request.review)).toString())
    const result = await f.adapter.run(packet.request, f.author, new AbortController().signal)
    assert.equal(result.status, 'settled')
    const action = f.table.get(f.config.projectKey).actions[packet.manifest.action_id]
    assert.equal(action.review_id, expected.review_id)
    assert.deepEqual(action.review, packet.request.review)
  })
})
test('unauthenticated review cannot invoke original gate metadata preflight', async () => {
  await fixture({}, async (f, calls) => {
    const packet = await f.prepare()
    const review = JSON.parse(Buffer.from(await f.artifacts.read(packet.request.review)).toString())
    const completion = await f.json('snapshots/forged-original-gate-completion.json', {
      session_id: f.policy.reviewer.session_id, provider: f.policy.reviewer.provider, events: [],
    })
    const forged = await f.json('snapshots/forged-original-gate-review.json', { ...review, completion })
    await assert.rejects(f.adapter.run({ ...packet.request, review: forged }, f.author, new AbortController().signal))
    assert.equal(calls.preflight, 0)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 0)
  })
})
test('scientific settlement preserves original cost identity and separates containing coordination time', async () => {
  await fixture({}, async (f, calls) => {
    const p = await f.prepare()
    const outcome = await f.adapter.run(p.request, f.author, new AbortController().signal)
    assert.equal(outcome.status, 'settled')
    const evidence = (await f.collected(outcome)).evidence
    assert.equal(evidence.costs.length, 2)
    assert.equal(evidence.costs[0].execution_id, 'disposable-original-unit')
    assert.equal(evidence.costs[0].purpose, 'C_science')
    assert.equal(evidence.costs[0].amount, .001)
    assert.equal(evidence.costs[1].purpose, 'C_run')
    const terminal = JSON.parse(Buffer.from(await f.artifacts.read(evidence.costs[1].source)).toString())
    assert.equal(evidence.costs.reduce((s: number, c: any) => s+c.amount, 0), terminal.process_elapsed_seconds)
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).replay, true)
    assert.deepEqual(calls, { preflight: 1, settle: 1 })
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
  })
})
for (const [name, options, reason] of [
  ['wrong native association', { settlementOverride: { dispatch_token: 'unrelated-dispatch' } }, /committed native attempt/],
  ['missing original checkpoint', { missingCheckpoint: true }, /ENOENT/],
  ['incompatible original time interval', { cost: 100 }, /containing native process interval/],
] as const) test('unresolved science settlement retains reservation: '+name, async () => {
  await fixture(options, async f => {
    const p = await f.prepare()
    const outcome = await f.adapter.run(p.request, f.author, new AbortController().signal)
    assert.equal(outcome.status, 'unknown')
    const state = f.table.get(f.config.projectKey)
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.reserved_timeout_ms, f.policy.max_timeout_ms)
    assert.ok(state.actions[p.manifest.action_id].runtime_facts.capture)
    assert.match(state.hold.reason, reason)
    assert.equal((await f.adapter.run(p.request, f.author, new AbortController().signal)).replay, true)
  })
})

test('one-unit scientific scope rejects summed overlapping or multiple original process costs', async () => {
  await fixture({}, async f => {
    const p=await f.prepare()
    const result=await f.adapter.run(p.request,f.author,new AbortController().signal)
    const evidence=(await f.collected(result)).evidence
    const composite=JSON.parse(Buffer.from(await f.artifacts.read(evidence.terminal.settlement)).toString())
    const original=JSON.parse(Buffer.from(await f.artifacts.read(composite.science)).toString())
    assert.equal(ScienceSettlementSchema.safeParse({ ...original,costs:[original.costs[0],{ ...original.costs[0],execution_id:'overlapping-second-process' }] }).success,false)
  })
})
