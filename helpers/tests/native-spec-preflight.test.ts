import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { LocalBashExecutor } from '@deepseek-ai/dsh-bash-local'
import type { ShellExecSpec, ShellExecutor } from '@deepseek-ai/dsh-shell'
import { SessionId } from '@deepseek-ai/dsh-session'
import { NativeResearchAdapter } from '../src/native.js'
import type { ResearchState } from '../src/admission.js'
import { createCpuFixture } from '../examples/synthetic-cpu/fixture.mjs'
import { createGpuFixture } from '../examples/gpu/fixture.mjs'

type Calls = { jobs: number; execute: number; gpu: number; science: number; verifier: number }

// Use the installed public resolver and real native storage/Session review.
// Only the returned capability spec is perturbed; no admission logic is mirrored here.
function countedShell(base: ShellExecutor, calls: Calls, change: (spec: ShellExecSpec) => ShellExecSpec = spec => spec): ShellExecutor {
  const shell = Object.create(base) as ShellExecutor
  shell.resolve = request => change(base.resolve(request))
  shell.execute = spec => { calls.execute++; return base.execute(spec) }
  return shell
}
function countJobs(f: any, calls: Calls) {
  const start = f.ctx.jobs.start.bind(f.ctx.jobs)
  f.ctx.jobs.start = (options: any) => { calls.jobs++; return start(options) }
}
function assertUnadmitted(f: any, calls: Calls, before: ResearchState) {
  const state = f.table.get(f.config.projectKey)
  assert.deepEqual(state, before, 'known spec refusal must preserve the entire durable authority state')
  assert.equal(state.consumed_attempts, 0)
  assert.equal(state.consumed_review_requests, 0)
  assert.deepEqual(state.consumed_reviews, [])
  assert.equal(state.reserved_timeout_ms, 0)
  assert.deepEqual(state.actions, {})
  assert.deepEqual(calls, { jobs: 0, execute: 0, gpu: 0, science: 0, verifier: 0 })
}
async function scientificRefusalFixture(work: (f: any, config: any, calls: Calls) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-spec-scientific-'))
  const calls: Calls = { jobs: 0, execute: 0, gpu: 0, science: 0, verifier: 0 }
  let f: any, science: any
  try {
    f = await createGpuFixture(join(root, 'project'), { stub: true, timeoutMs: 650000,
      guardFactory: (base: any) => ({ ...base, preflight: async (...args: any[]) => { calls.gpu++; return base.preflight(...args) } }),
      scienceFactory: async (base: any) => {
        const identity = await base.json('snapshots/spec-original-guard.json', { scope: 'Disposable authority guard; no scientific execution' })
        const envelope = await base.json('snapshots/spec-envelope.json', { physical_science: false })
        science = { identity, preflight: async () => { calls.science++; throw new Error('Unexpected original-authority preflight') },
          settle: async () => { calls.science++; throw new Error('Scientific execution is forbidden in this fixture') } }
        return { policy: { authority: base.policy.authority, envelope, guard: identity }, guard: science }
      } })
    countJobs(f, calls)
    const config = { ...f.config, policy: f.policyRef, gpu: f.gpu, science,
      verifier: { ...f.config.verifier, verify: async (...args: any[]) => { calls.verifier++; return f.config.verifier.verify(...args) } } }
    await work(f, config, calls)
  } finally { if (f) await f.close(); await rm(root, { recursive: true, force: true }) }
}

test('public local shell clamps a 650000ms deadline before any native or original-authority admission', async () => {
  await scientificRefusalFixture(async (f, config, calls) => {
    const ctx = new Context()
    try {
      const publicShell = new LocalBashExecutor(ctx, { cwd: { get: () => f.root }, timeoutMs: { get: () => 120000 },
        maxTimeoutMs: { get: () => 600000 }, maxOutputBytes: { get: () => 8192 }, maxSpillBytes: { get: () => 8192 }, graceMs: { get: () => 50 } })
      assert.equal(publicShell.resolve({ command: 'true', timeoutMs: 650000 }).timeoutMs, 600000)
      const adapter = await NativeResearchAdapter.open(f.ctx, { ...config, executionShell: countedShell(publicShell, calls) })
      const packet = await f.prepare()
      const before = structuredClone(f.table.get(f.config.projectKey))
      await assert.rejects(adapter.run(packet.request, f.author, new AbortController().signal), /frozen invocation\/deadline/)
      assertUnadmitted(f, calls, before)
    } finally { await ctx.fiber.dispose() }
  })
})

for (const [name, change, reason] of [
  ['command', (spec: ShellExecSpec) => ({ ...spec, command: spec.command + ' ; true' }), /frozen invocation\/deadline/],
  ['cwd', (spec: ShellExecSpec) => ({ ...spec, workdir: tmpdir() }), /frozen invocation\/deadline/],
  ['onExpiry', (spec: ShellExecSpec) => ({ ...spec, onExpiry: 'none' as const }), /frozen invocation\/deadline/],
  ['output limit', (spec: ShellExecSpec) => ({ ...spec, stdoutMaxBytes: spec.stdoutMaxBytes + 1 }), /output\/environment\/cancellation/],
  ['environment', (spec: ShellExecSpec) => ({ ...spec, env: { ...spec.env, CUDA_VISIBLE_DEVICES: 'another-device' } }), /output\/environment\/cancellation/],
  ['cancellation', (spec: ShellExecSpec) => ({ ...spec, signal: new AbortController().signal }), /output\/environment\/cancellation/],
] as const) test('known public-shell '+name+' drift refuses before review consumption or scientific calls', async () => {
  await scientificRefusalFixture(async (f, config, calls) => {
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...config, executionShell: countedShell(f.ctx.shell, calls, change) })
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(adapter.run(packet.request, f.author, new AbortController().signal), reason)
    assertUnadmitted(f, calls, before)
  })
})

test('known sandbox profile mismatch refuses before native reservation and scientific preflight', async () => {
  await scientificRefusalFixture(async (f, config, calls) => {
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...config, executionShell: countedShell(f.ctx.shell, calls),
      executionSandbox: { profile: f.policyRef, resolve: () => ({ mode: 'workspace-write', workspaceRoot: f.root, sessionId: f.author.id }) } })
    const packet = await f.prepare()
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(adapter.run(packet.request, f.author, new AbortController().signal), /Sandbox profile identity differs/)
    assertUnadmitted(f, calls, before)
  })
})

async function cpuFixture(work: (f: any, calls: Calls) => Promise<void>, sandbox = false) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-spec-cpu-')))
  const project = join(root, 'project')
  const policy: NonNullable<ShellExecSpec['sandboxPolicy']> = { mode: 'workspace-write', workspaceRoot: project, sessionId: SessionId('m2-author') }
  let f: any
  const calls: Calls = { jobs: 0, execute: 0, gpu: 0, science: 0, verifier: 0 }
  try {
    f = await createCpuFixture(project, sandbox ? { executionSandbox: policy, executionSandboxResolver: () => policy } : {})
    countJobs(f, calls)
    await work(f, calls)
  } finally { if (f) await f.close(); await rm(root, { recursive: true, force: true }) }
}

test('matching frozen sandbox and public shell execute the validated immutable spec once', async () => {
  await cpuFixture(async (f, calls) => {
    const base = f.ctx.shell as ShellExecutor
    let first: ShellExecSpec | undefined, executed: ShellExecSpec | undefined
    const shell = countedShell(base, calls, spec => { first ??= spec; return spec })
    shell.execute = spec => { calls.execute++; executed = spec; return base.execute(spec) }
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, executionShell: shell })
    const packet = await f.prepare('negative')
    const outcome = await adapter.run(packet.request, f.author, new AbortController().signal)
    assert.equal(outcome.status, 'settled')
    assert.ok(first && executed)
    assert.deepEqual(executed, first)
    assert.notEqual(executed, first)
    assert.notEqual(executed.sandboxPolicy, first.sandboxPolicy)
    assert.ok(Object.isFrozen(executed) && Object.isFrozen(executed.env) && Object.isFrozen(executed.sandboxPolicy))
    assert.equal(calls.jobs, 1)
    assert.equal(calls.execute, 1)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
    assert.equal(f.table.get(f.config.projectKey).reserved_timeout_ms, 0)
    assert.equal((await adapter.run(packet.request, f.author, new AbortController().signal)).replay, true)
    assert.equal(calls.execute, 1)
  }, true)
})

test('the default context shell retains one provider across fresh public service proxies', async () => {
  await cpuFixture(async (f, calls) => {
    assert.notEqual(f.ctx.shell, f.ctx.shell, 'the installed public Context returns fresh service proxies')
    const adapter = await NativeResearchAdapter.open(f.ctx, f.config)
    const packet = await f.prepare('negative')
    const outcome = await adapter.run(packet.request, f.author, new AbortController().signal)
    assert.equal(outcome.status, 'settled')
    assert.equal(calls.jobs, 1)
    assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
    assert.equal(f.table.get(f.config.projectKey).reserved_timeout_ms, 0)
    assert.equal((await adapter.run(packet.request, f.author, new AbortController().signal)).replay, true)
    assert.equal(calls.jobs, 1)
  })
})

test('resolved sandbox drift is refused while the matching Session profile remains frozen', async () => {
  await cpuFixture(async (f, calls) => {
    const shell = countedShell(f.ctx.shell, calls, spec => ({ ...spec,
      sandboxPolicy: { ...spec.sandboxPolicy!, sessionId: SessionId('another-session') } }))
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, executionShell: shell })
    const packet = await f.prepare('negative')
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(adapter.run(packet.request, f.author, new AbortController().signal), /Resolved shell sandbox policy differs/)
    assertUnadmitted(f, calls, before)
  }, true)
})

test('configuration drift during the final pre-admission authority check consumes no review or attempt', async () => {
  await cpuFixture(async (f, calls) => {
    let authorityChecks = 0, drift = false
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config,
      executionShell: countedShell(f.ctx.shell, calls, spec => drift ? { ...spec, onExpiry: 'none' } : spec),
      assertActiveAuthority: async () => { if (++authorityChecks === 2) drift = true } })
    const packet = await f.prepare('negative')
    const before = structuredClone(f.table.get(f.config.projectKey))
    await assert.rejects(adapter.run(packet.request, f.author, new AbortController().signal), /configuration changed before admission/)
    assertUnadmitted(f, calls, before)
  })
})

for (const point of ['acknowledgement', 'final authority check'] as const) test('shell configuration drift during '+point+' holds the original reservation without dispatch or replay', async () => {
  await cpuFixture(async (f, calls) => {
    let drift = false
    const shell = countedShell(f.ctx.shell, calls, spec => drift ? { ...spec, onExpiry: 'none' } : spec)
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, executionShell: shell,
      observe: (event: string) => { if (point === 'acknowledgement' && event === 'admission_acknowledged') drift = true },
      assertActiveAuthority: async () => { if (point === 'final authority check' && f.table.get(f.config.projectKey).consumed_attempts) drift = true } })
    const packet = await f.prepare('negative')
    const outcome = await adapter.run(packet.request, f.author, new AbortController().signal)
    assert.equal(outcome.status, 'unknown')
    const state = structuredClone(f.table.get(f.config.projectKey))
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.consumed_reviews.length, 1)
    assert.equal(state.reserved_timeout_ms, packet.manifest.bounds.timeout_ms)
    assert.equal(state.actions[packet.manifest.action_id].reservation_active, true)
    assert.equal(state.actions[packet.manifest.action_id].job_id, null)
    assert.equal(calls.jobs, 0)
    assert.equal(calls.execute, 0)
    drift = false
    const replay = await adapter.run(packet.request, f.author, new AbortController().signal)
    assert.equal(replay.status, 'unknown')
    assert.equal(replay.replay, true)
    assert.deepEqual(f.table.get(f.config.projectKey), state)
    assert.equal(calls.jobs, 0)
  })
})

test('stop while the final native authority check awaits retains admission and prevents jobs.start', async () => {
  await cpuFixture(async (f, calls) => {
    const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>()
    try {
      const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, executionShell: countedShell(f.ctx.shell, calls),
        assertActiveAuthority: async () => { if (f.table.get(f.config.projectKey).consumed_attempts) { entered.resolve(); await release.promise } } })
      const packet = await f.prepare('negative')
      const running = adapter.run(packet.request, f.author, new AbortController().signal)
      await entered.promise
      await f.table.update(f.config.projectKey, (state: any) => ({ ...state, revision: state.revision + 1, stopped: true }))
      release.resolve()
      assert.equal((await running).status, 'unknown')
      const state = f.table.get(f.config.projectKey)
      assert.equal(state.stopped, true)
      assert.equal(state.consumed_attempts, 1)
      assert.equal(state.reserved_timeout_ms, packet.manifest.bounds.timeout_ms)
      assert.equal(state.actions[packet.manifest.action_id].job_id, null)
      assert.equal(calls.jobs, 0)
      assert.equal(calls.execute, 0)
    } finally { release.resolve() }
  })
})
