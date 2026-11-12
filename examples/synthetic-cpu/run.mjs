import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { mountAgentLoopTestDependencies, mountAgentLoopTestHarness } from '@deepseek-ai/dsh-agent-loop-testkit'
import { LlmAdapter, createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import JsonlPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import LocalJobs from '@deepseek-ai/dsh-jobs-local'
import LocalSubprocess from '@deepseek-ai/dsh-subprocess-local'
import { LocalBashExecutor } from '@deepseek-ai/dsh-bash-local'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import Skills from '@deepseek-ai/dsh-skill'
import * as FilesystemSkills from '@deepseek-ai/dsh-skill-filesystem'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { ProjectArtifacts, ManifestSchema, ReviewSchema, ResearchStateSchema, canonicalJson, deriveActionId, sha256 } from 'dsh-research'
import { NativeResearchAdapter, researchDomain } from 'dsh-research/native'

const require = createRequire(import.meta.url)
const packageRoot = fileURLToPath(new URL('../../', import.meta.url))
const outputArg = process.argv[2]
if (!outputArg) throw new Error('Usage: node examples/synthetic-cpu/run.mjs <fresh-output-directory>')
await mkdir(resolve(outputArg), { recursive: false })
const root = await realpath(resolve(outputArg))
const artifacts = await ProjectArtifacts.open(root)
const json = (uri, value) => artifacts.write(uri, Buffer.from(canonicalJson(value)))
const source = async (uri, path) => artifacts.write(uri, await readFile(path))

class ScriptedAdapter extends LlmAdapter {
  script = []
  requests = []
  async resolveModel(provider, model) { return { provider, id: model, name: model } }
  async *stream(options) {
    this.requests.push(options)
    const entry = this.script.shift()
    if (!entry) throw new Error('Synthetic script exhausted; no external provider is available')
    for (const chunk of entry) yield chunk
  }
}
const text = value => [{ type: 'block-start', index: 0, blockType: 'text' }, { type: 'text-delta', index: 0, text: value },
  { type: 'block-end', index: 0, block: { type: 'text', text: value } }, { type: 'finish', reason: { kind: 'stop' } }]
const tool = (id, args) => [{ type: 'block-start', index: 0, blockType: 'tool-call' },
  { type: 'tool-call-delta', index: 0, id: ToolCallId(id), name: 'research_run', argumentsDelta: JSON.stringify(args) },
  { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId(id), name: 'research_run', arguments: JSON.stringify(args) } },
  { type: 'finish', reason: { kind: 'tool-calls' } }]
class FaultableBash extends LocalBashExecutor {
  execute(spec) {
    if (spec.command.includes("'unknown-launch'")) throw new Error('Synthetic publication failure: no trustworthy terminal acknowledgement')
    return super.execute(spec)
  }
}

const ctx = new Context()
let domain
let backend
let removeBackend
let unregister
const trace = []
const cases = []
try {
  await mountAgentLoopTestDependencies(ctx, { workingDirectory: true })
  await ctx.plugin(JsonlPersistence, { root: join(root, '.autoresearch/dsh/sessions'), compression: 'none' })
  await ctx.plugin(LocalJobs, { maxConcurrentJobsPerOwner: 1 })
  await ctx.plugin(LocalSubprocess)
  await ctx.plugin(FaultableBash, { cwd: root, timeoutMs: 2000, maxTimeoutMs: 2000, graceMs: 50 })
  await ctx.plugin(Storage)
  backend = new SqliteStorageBackend({ path: join(root, '.autoresearch/dsh/state.sqlite3'), journalMode: 'wal' })
  removeBackend = ctx.storage.backend.register('sqlite', backend)
  const facility = new DomainFacility(ctx, { backend: 'sqlite' })
  domain = await facility.open(researchDomain)
  const table = domain.table('projects')
  await ctx.plugin(Skills)
  await ctx.plugin(FilesystemSkills, { includeDefaultRoots: false, customSkillDirs: [join(packageRoot, 'skills')], watch: false })
  const skill = await ctx.skills.get('research', { cwd: root })
  assert.ok(skill && skill.content.includes('research_run'))
  cases.push({ id: 'filesystem-skill-loading', outcome: 'passed', path: skill.path, body_sha256: sha256(skill.content) })

  const harness = await mountAgentLoopTestHarness(ctx)
  const authorLLM = new ScriptedAdapter()
  const reviewerLLM = new ScriptedAdapter()
  ctx.llm.registerAdapter(['synthetic-author'], authorLLM)
  ctx.llm.registerAdapter(['synthetic-reviewer'], reviewerLLM)
  const author = await harness.create(SessionId('m2-author'), { provider: 'synthetic-author', model: 'scripted' }, { cwd: root })
  const reviewer = await harness.create(SessionId('m2-reviewer'), { provider: 'synthetic-reviewer', model: 'scripted' }, { cwd: root })

  const contract = await source('snapshots/contracts.md', join(packageRoot, 'docs/contracts.md'))
  const registerBytes = await readFile(join(packageRoot, 'docs/compatibility.json'))
  const register = JSON.parse(registerBytes.toString())
  const registerRef = await artifacts.write('snapshots/compatibility.json', registerBytes)
  const row = register.rows.at(-1)
  const packageJson = JSON.parse((await readFile(join(packageRoot, 'package.json'))).toString())
  const releaseNames = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-agent-loop', '@deepseek-ai/dsh-shell', '@deepseek-ai/dsh-bash-local', '@deepseek-ai/dsh-subprocess-local', '@deepseek-ai/dsh-jobs-local', '@deepseek-ai/dsh-storage-domain', '@deepseek-ai/dsh-storage-sqlite', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-skill-filesystem', '@deepseek-ai/dsh-session-persistence-jsonl']
  const releases = []
  for (const name of releaseNames) {
    const bytes = await readFile(require.resolve(`${name}/package.json`))
    releases.push({ name, version: JSON.parse(bytes.toString()).version, content: await artifacts.write(`snapshots/releases/${name}/package.json`, bytes) })
  }
  releases.push({ name: 'dsh-research', version: packageJson.version, content: await source('snapshots/package.json', join(packageRoot, 'package.json')) })
  const moduleHashes = {}
  for (const module of ['records', 'bindings', 'manifest', 'admission', 'evaluate', 'loop', 'native']) moduleHashes[module] = sha256(await readFile(join(packageRoot, `dist/${module}.js`)))
  const profile = await json('snapshots/profile.json', { scope: 'synthetic_released_cpu', confirmation: 'off', author_tools: ['research_run'], reviewer_tools: [], maxConcurrentJobsPerOwner: 1,
    package_modules: moduleHashes, example_driver_sha256: sha256(await readFile(fileURLToPath(import.meta.url))) })
  const registration = await json('snapshots/registration.json', { project_root: root, authority_id: 'synthetic-m2', writer_id: 'synthetic-host', scope: 'synthetic development only' })
  const authority = { project_id: 'synthetic-m2', project_root: root, authority_id: 'synthetic-m2', writer_id: 'synthetic-host', registration }
  const lock = await source('snapshots/lock.yaml', join(packageRoot, 'dist/qualification-lock.yaml'))
  const binding = { contract_ref: { id: 'dsh-research/research-loop', version: row.contract_version, artifact: contract },
    compatibility_row_ref: { register: registerRef, contract_version: row.contract_version, row_id: row.row_id, row_sha256: sha256(canonicalJson(row)), table_sha256: register.table_sha256 },
    authority, profile: { revision: 'synthetic-m2-v1', effective: profile, lock, releases, confirmation: 'off', assurance: 'implemented' } }
  const evaluator = await source('snapshots/evaluate.mjs', join(packageRoot, 'examples/synthetic-cpu/evaluate.mjs'))
  const verifier = await source('snapshots/verifier.mjs', join(packageRoot, 'examples/synthetic-cpu/verifier.mjs'))
  const verifyDomain = (await import(pathToFileURL(join(root, verifier.uri)).href)).verify
  const domainPolicy = await json('snapshots/domain-policy.json', { scope: 'synthetic released inputs only', score_meaning: 'positive/negative support relative to a zero synthetic baseline', verifier })
  const reviewerPreset = await json('snapshots/reviewer-preset.json', { session_id: reviewer.id, provider: 'synthetic-reviewer', model: 'scripted' })
  const permissions = await json('snapshots/reviewer-permissions.json', { tools: [], boundary: 'native tool guard; trusted same account' })
  const policy = { scope: 'synthetic_released_cpu', authority, binding, goal_id: 'synthetic-cpu', goal_revision: 'r1', max_attempts: 8,
    max_timeout_ms: 2000, max_total_timeout_ms: 16000, max_output_bytes: 8192, allowed_executables: [process.execPath],
    allowed_operations: ['negative', 'positive', 'timeout-zero', 'invalid-output', 'drift', 'unknown-launch'], domain_policy: domainPolicy, verifier, entrypoint: evaluator,
    reviewer: { session_id: reviewer.id, provider: 'synthetic-reviewer', preset: reviewerPreset, permissions },
    allowed_read_prefixes: ['snapshots/', 'local_artifacts/autoresearch/dsh/'] }
  const policyRef = await json('snapshots/policy.json', policy)
  await table.put('synthetic-m2', ResearchStateSchema.parse({ schema_version: 1, authority, binding, policy: policyRef,
    revision: 0, stopped: false, consumed_attempts: 0, consumed_timeout_ms: 0, reserved_timeout_ms: 0, consumed_reviews: [], active_action_id: null, actions: {}, hold: null }))
  const config = { artifacts, table, projectKey: 'synthetic-m2', policy: policyRef, authorSessionId: author.id,
    verifier: { identity: verifier, verify: verifyDomain }, observe: (event, detail) => trace.push({ event, detail }) }
  const adapter = await NativeResearchAdapter.open(ctx, config)
  unregister = adapter.register()
  const context = await json('snapshots/context.json', { purpose: 'M2 qualification; no scientific project data' })
  const interpreter = await json('snapshots/interpreter.json', { executable: process.execPath, version: process.version, platform: process.platform, arch: process.arch })
  const environment = await json('snapshots/environment.json', { cwd: root, explicit_env: {} })
  const inventory = await json('snapshots/inventory.json', { files: [
    { artifact: evaluator, mode: (await stat(join(root, evaluator.uri))).mode & 0o777 },
    { artifact: verifier, mode: (await stat(join(root, verifier.uri))).mode & 0o777 }], relevant_untracked: true, submodules: [] })
  const outputSchema = await json('snapshots/output-schema.json', { score: 'finite_number', additional_fields: false })
  let ordinal = 0
  async function prepare(mode) {
    ordinal++
    const input = await json(`snapshots/input-${ordinal}.json`, { values: [1, 2, 3] })
    const subject = { schema_version: 1, kind: 'manifest', binding, author_session_id: author.id, original_prompt: `Run the frozen synthetic CPU ${mode} case`,
      goal: { id: 'synthetic-cpu', revision: 'r1', context, checkpoint: null }, plan: { revision: `case-${ordinal}`, snapshot: context, purpose: 'deliberate' }, architecture: profile,
      candidate: { commit: 'synthetic-frozen-content', tree: evaluator, configuration: context, snapshot_kind: 'content_snapshot', content_inventory: inventory },
      evaluator: { verifier, interpreter, environment }, inputs: [{ artifact: input, version: String(ordinal), split: 'synthetic', purpose: 'C_qual', access: 'released' }],
      invocation: { executable: process.execPath, argv: [join(root, evaluator.uri), join(root, input.uri), mode], cwd: root, env: {} },
      bounds: { timeout_ms: mode === 'timeout-zero' ? 200 : 2000, max_attempts: 8, timeout_reservation_ms: 16000, concurrency: 1, resource_policy: policyRef },
      output: { schema: outputSchema, required_fields: { score: 'finite_number' }, additional_fields: false }, domain_policy: domainPolicy,
      proposal: { decision: 'continue', operation: mode, prerequisites: [], retry: null } }
    const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
    const manifestRef = await json(`snapshots/manifest-${ordinal}.json`, manifest)
    const request = await json(`snapshots/review-request-${ordinal}.json`, { subject_kind: 'scientific_action', action_id: manifest.action_id, manifest_sha256: manifestRef.sha256 })
    const reviewId = `synthetic-review-${ordinal}`
    reviewerLLM.script.push(text(JSON.stringify({ decision: 'approve', action_id: manifest.action_id, manifest_sha256: manifestRef.sha256, request_sha256: request.sha256, review_id: reviewId })))
    reviewer.followup(createUserMessage({ content: [{ type: 'text', text: `Review exact synthetic request ${canonicalJson(request)} and manifest ${canonicalJson(manifestRef)}` }], source: { kind: 'user' } }))
    await reviewer.whenIdle()
    const completion = await json(`snapshots/review-completion-${ordinal}.json`, { session_id: reviewer.id, provider: 'synthetic-reviewer', events: reviewer.session.snapshotEvents() })
    const proposalRef = await json(`snapshots/proposal-${ordinal}.json`, manifest.proposal)
    const review = ReviewSchema.parse({ schema_version: 1, kind: 'review', binding, review_id: reviewId, subject_kind: 'scientific_action', request, packet: manifestRef, subject: manifestRef,
      manifest: manifestRef, checkpoint: null, action_id: manifest.action_id, author_session_id: author.id,
      reviewer: { session_id: reviewer.id, provider: 'synthetic-reviewer', preset: reviewerPreset, permissions, assurance: 'implemented' },
      completion, status: 'completed', decision: 'approve', reason: 'Scripted exact-subject fixture approval', evidence: [],
      scope: { consumable_once: true, proposal: proposalRef, bounds: manifest.bounds, prerequisites: [] }, hold: null })
    return { manifest, manifestRef, request: { manifest: manifestRef, review: await json(`snapshots/review-${ordinal}.json`, review), expected_revision: table.get('synthetic-m2').revision } }
  }
  async function collected(association) {
    return { evidence: association.evidence && JSON.parse(Buffer.from(await artifacts.read(association.evidence)).toString()), checkpoint: association.checkpoint && JSON.parse(Buffer.from(await artifacts.read(association.checkpoint)).toString()) }
  }
  const negative = await prepare('negative')
  const validReview = JSON.parse(Buffer.from(await artifacts.read(negative.request.review)).toString())
  const unavailableReview = ReviewSchema.parse({ ...validReview, status: 'unavailable', completion: null, decision: 'defer',
    hold: { kind: 'review_unavailable', owner: author.id, reason: 'Controlled unavailable review witness', evidence: [], affected: [negative.manifest.action_id],
      exit_condition: 'Exact native completion becomes available', next_check: 'Existing completion', reassess_at: new Date(Date.now() + 60_000).toISOString() } })
  const unavailableRef = await json('snapshots/unavailable-review.json', unavailableReview)
  await assert.rejects(adapter.run({ ...negative.request, review: unavailableRef }, author, new AbortController().signal), /completed native receipt/)
  assert.equal(table.get('synthetic-m2').hold.kind, 'review_unavailable')
  assert.equal(table.get('synthetic-m2').consumed_attempts, 0)
  negative.request.expected_revision = table.get('synthetic-m2').revision
  cases.push({ id: 'unavailable-review-owned-hold-no-admission', outcome: 'passed' })
  let bypassCalls = 0
  const unregisterBypass = ctx.tools.register(defineTool({ name: 'bash', description: 'Controlled bypass witness; must never execute', parameters: {},
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: async () => { bypassCalls++; return 'violation' } }))
  const deniedAuthor = await ctx.tools.execute({ name: 'bash', arguments: {}, agent: author, callId: ToolCallId('deny-bypass'), signal: new AbortController().signal })
  const deniedReviewer = await ctx.tools.execute({ name: 'research_run', arguments: negative.request, agent: reviewer, callId: ToolCallId('deny-reviewer'), signal: new AbortController().signal })
  const deniedExtra = await ctx.tools.execute({ name: 'research_run', arguments: { ...negative.request, argv: ['substitute'] }, agent: author, callId: ToolCallId('deny-argv'), signal: new AbortController().signal })
  assert.ok(deniedAuthor.error && deniedReviewer.error && deniedExtra.error)
  assert.equal(bypassCalls, 0)
  assert.equal(table.get('synthetic-m2').consumed_attempts, 0)
  unregisterBypass()
  cases.push({ id: 'author-bypass-reviewer-launch-and-argv-refusal', outcome: 'passed' })
  authorLLM.script.push(tool('m2-negative', negative.request), text('Retain the valid negative and prepare fresh review for a diagnostic.'))
  author.followup(createUserMessage({ content: [{ type: 'text', text: `${negative.manifest.original_prompt}; use only the exact frozen references ${JSON.stringify(negative.request)}` }], source: { kind: 'user' } }))
  await author.whenIdle()
  const first = table.get('synthetic-m2').actions[negative.manifest.action_id]
  assert.equal(first.phase, 'settled')
  const firstRead = await collected(first)
  assert.equal(firstRead.evidence.evidence_status, 'valid')
  assert.equal(firstRead.evidence.verifier.verdict, 'negative')
  assert.equal(firstRead.checkpoint.scientific_outcome, 'negative')
  cases.push({ id: 'ordinary-worker-valid-negative', outcome: 'passed', action: first })
  const beforeReplay = table.get('synthetic-m2').consumed_attempts
  const replay = await adapter.run(negative.request, author, new AbortController().signal)
  assert.equal(replay.replay, true)
  assert.equal(replay.job_id, first.job_id)
  assert.equal(table.get('synthetic-m2').consumed_attempts, beforeReplay)
  cases.push({ id: 'duplicate-no-consumption-or-execution', outcome: 'passed' })
  const positive = await prepare('positive')
  const pair = await Promise.all([adapter.run(positive.request, author, new AbortController().signal), adapter.run(positive.request, author, new AbortController().signal)])
  assert.equal(pair.filter(value => !value.replay).length, 1)
  assert.equal(table.get('synthetic-m2').consumed_attempts, 2)
  cases.push({ id: 'concurrent-duplicate-one-dispatch', outcome: 'passed' })
  for (const mode of ['timeout-zero', 'invalid-output', 'drift']) {
    const prepared = await prepare(mode)
    const result = await adapter.run(prepared.request, author, new AbortController().signal)
    const captured = await collected(result)
    assert.equal(result.status, 'settled')
    assert.equal(captured.evidence.evidence_status, 'invalid')
    assert.equal(captured.evidence.scientific_status, 'ineligible')
    if (mode === 'timeout-zero') { assert.equal(captured.evidence.terminal.timeout, true); assert.equal(captured.evidence.terminal.exit_code, 0) }
    if (mode === 'drift') assert.equal(captured.evidence.identity.matches, false)
    cases.push({ id: mode, outcome: 'passed', action: result })
  }
  const unknown = await prepare('unknown-launch')
  const unknownResult = await adapter.run(unknown.request, author, new AbortController().signal)
  assert.equal(unknownResult.status, 'unknown')
  const beforeReopen = table.get('synthetic-m2')
  assert.equal(beforeReopen.reserved_timeout_ms, 2000)
  assert.equal(beforeReopen.consumed_attempts, 6)
  const repeatedUnknown = await adapter.run(unknown.request, author, new AbortController().signal)
  assert.equal(repeatedUnknown.replay, true)
  cases.push({ id: 'unknown-publication-retains-reservation', outcome: 'passed' })
  unregister(); unregister = null
  await domain.close(); removeBackend(); await backend.close()
  backend = new SqliteStorageBackend({ path: join(root, '.autoresearch/dsh/state.sqlite3'), journalMode: 'wal' })
  removeBackend = ctx.storage.backend.register('sqlite', backend)
  const reopenedFacility = new DomainFacility(ctx, { backend: 'sqlite' })
  domain = await reopenedFacility.open(researchDomain)
  const reopenedTable = domain.table('projects')
  assert.deepEqual(reopenedTable.get('synthetic-m2'), beforeReopen)
  const reopenedAdapter = await NativeResearchAdapter.open(ctx, { ...config, table: reopenedTable })
  const afterReopen = await reopenedAdapter.run(unknown.request, author, new AbortController().signal)
  assert.equal(afterReopen.replay, true)
  assert.equal(afterReopen.status, 'unknown')
  cases.push({ id: 'reopen-preserves-consumption-and-unknown-hold', outcome: 'passed' })
  const receipt = { schema_version: 1, timestamp: new Date().toISOString(), scope: 'M2 synthetic public-native development, independent qualification pending', binding,
    cases, trace, state: reopenedTable.get('synthetic-m2'), author_events: author.session.snapshotEvents(), reviewer_events: reviewer.session.snapshotEvents(),
    external_model_calls: 0, scientific_project_attempts: 0, synthetic_admitted_attempts: 6, synthetic_evaluator_dispatches: 5,
    limits: ['Native jobs are process-local; unknown launch is held after reopen', 'Scripted approval is not qualified live scientific review', 'Profile supports synthetic released CPU only', 'No protected-input access, GPU or cloud publication'] }
  await writeFile(join(root, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ receipt: join(root, 'receipt.json'), cases: cases.length, synthetic_admitted_attempts: 6, status: 'passed' }))
} catch (error) {
  let state = null
  try { state = domain?.table('projects').get('synthetic-m2') ?? null } catch {}
  await writeFile(join(root, 'failure.json'), JSON.stringify({ timestamp: new Date().toISOString(), message: String(error), cases, trace, state,
    sessions: ctx.agents ? [...ctx.agents.values()].map(agent => ({ id: agent.id, events: agent.session.snapshotEvents() })) : [] }, null, 2) + '\n', { flag: 'wx' })
  throw error
} finally {
  unregister?.()
  await domain?.close()
  await backend?.close()
  removeBackend?.()
  await ctx.fiber.dispose()
}
