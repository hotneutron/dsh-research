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

import Subagents, { NO_START_CAPABILITIES } from '@deepseek-ai/dsh-subagent'
import SessionQuery from '@deepseek-ai/dsh-session-query'
const require = createRequire(import.meta.url)
const packageRoot = fileURLToPath(new URL('../../', import.meta.url))
export class ScriptedAdapter extends LlmAdapter {
  script = []
  requests = []
  async resolveModel(provider, model) { return { provider, id: model, name: model } }
  async *stream(options) {
    this.requests.push(options)
    const entry = this.script.shift()
    if (!entry) throw new Error('Synthetic script exhausted; no external provider is available')
    if (entry === 'hang') {
      await new Promise((_, reject) => { if (options.signal.aborted) reject(new Error('aborted')); else options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }) }); return
    }
    const chunks = typeof entry === 'function' ? await entry(options) : entry
    for (const chunk of chunks) yield chunk
  }
}
export const text = value => [{ type: 'block-start', index: 0, blockType: 'text' }, { type: 'text-delta', index: 0, text: value },
  { type: 'block-end', index: 0, block: { type: 'text', text: value } }, { type: 'finish', reason: { kind: 'stop' } }]
export const tool = (id, args, name = 'research_run') => [{ type: 'block-start', index: 0, blockType: 'tool-call' },
  { type: 'tool-call-delta', index: 0, id: ToolCallId(id), name, argumentsDelta: JSON.stringify(args) },
  { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId(id), name, arguments: JSON.stringify(args) } },
  { type: 'finish', reason: { kind: 'tool-calls' } }]
class FaultableBash extends LocalBashExecutor {
  execute(spec) {
    if (spec.command.includes("'unknown-launch'")) throw new Error('Synthetic publication failure: no trustworthy terminal acknowledgement')
    return super.execute(spec)
  }
}


export async function createCpuFixture(outputArg, options = {}) {
  if (!options.context) await mkdir(resolve(outputArg), { recursive: false })
  else if (!options.author || !options.authorLLM) throw new Error('External default-worker qualification requires its exact live author and scripted provider')
  const root = await realpath(resolve(outputArg))
  if (options.context) {
    const marker = JSON.parse(await readFile(join(root, 'disposable-qualification.json'), 'utf8'))
    if (marker.scientific_authority !== false) throw new Error('Existing-context synthetic setup requires an explicit disposable qualification marker')
  }
  const artifacts = await ProjectArtifacts.open(root)
  const json = (uri, value) => artifacts.write(uri, Buffer.from(canonicalJson(value)))
  const source = async (uri, path) => artifacts.write(uri, await readFile(path))
  const ctx = options.context ?? new Context()
  let domain, backend, removeBackend, unregister
  const trace = [], cases = []
  try {
  if (!options.context) {
  await mountAgentLoopTestDependencies(ctx, { workingDirectory: true })
  await ctx.plugin(JsonlPersistence, { root: join(root, '.autoresearch/dsh/sessions'), compression: 'none' })
  await ctx.plugin(LocalJobs, { maxConcurrentJobsPerOwner: 1 })
  await ctx.plugin(LocalSubprocess)
  await ctx.plugin(FaultableBash, { cwd: root, timeoutMs: options.timeoutMs ?? 2000, maxTimeoutMs: options.timeoutMs ?? 2000, graceMs: 50 })
  await ctx.plugin(Storage)
  }
  backend = new SqliteStorageBackend({ path: join(root, '.autoresearch/dsh/state.sqlite3'), journalMode: 'wal' })
  removeBackend = ctx.storage.backend.register('sqlite', backend)
  const facility = new DomainFacility(ctx, { backend: 'sqlite' })
  domain = await facility.open(researchDomain)
  const table = domain.table('projects')
  if (!options.context) await ctx.plugin(Skills)
  await ctx.plugin(FilesystemSkills, { includeDefaultRoots: false, customSkillDirs: [join(packageRoot, 'dist/skills')], watch: false })
  const skill = await ctx.skills.get('research', { cwd: root })
  assert.ok(skill && skill.content.includes('research_run'))
  cases.push({ id: 'filesystem-skill-loading', outcome: 'passed', path: skill.path, body_sha256: sha256(skill.content) })

  const harness = options.context ? ctx.agentLoop : await mountAgentLoopTestHarness(ctx)
  const authorLLM = options.authorLLM ?? new ScriptedAdapter()
  const reviewerLLM = new ScriptedAdapter()
  ctx.llm.registerAdapter([options.authorProvider ?? 'synthetic-author'], authorLLM)
  ctx.llm.registerAdapter(['synthetic-reviewer'], reviewerLLM)
  const author = options.author ?? await harness.create(SessionId('m2-author'), { provider: options.authorProvider ?? 'synthetic-author', model: options.authorModel ?? 'scripted' }, { cwd: root })
  const reviewerId = 'm2-reviewer'
  const reviewer = options.automaticReview ? null : await harness.create(SessionId(reviewerId), { provider: 'synthetic-reviewer', model: 'scripted' }, { cwd: root })
  if (options.automaticReview && !options.nativeReview) {
    class ReadOnlyQuery extends SessionQuery { async searchSessions() { throw new Error('Search not supported in fixture') }; async searchEvents() { throw new Error('Search not supported in fixture') } }
    await ctx.plugin(ReadOnlyQuery, {})
    await ctx.plugin(Subagents, { maxDepth: 1, maxActiveSubagents: 1 })
    ctx.subagents.registerProvider({ name: 'synthetic-review', capabilities: { ...NO_START_CAPABILITIES, agentOptions: true, toolFilter: true, persona: true, depthLimit: true }, inheritsParentContext: false, prepareContinuable: async () => ({}) })
  }
  if (options.nativeReview) {
    if (!options.context || !options.automaticReview) throw new Error('Native review reuse requires the disposable default context and automatic review')
    const provider = ctx.subagents.getProvider(options.nativeReview.provider)
    if (!provider?.prepareContinuable || provider.inheritsParentContext !== false
      || !['agentOptions', 'toolFilter', 'persona', 'depthLimit'].every(key => provider.capabilities[key]))
      throw new Error('Installed reviewer provider lacks the required isolated native capabilities')
  }

  const contract = await source('snapshots/contracts.md', join(packageRoot, 'dist/docs/contracts.md'))
  const registerBytes = await readFile(join(packageRoot, 'dist/docs/compatibility.json'))
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
  for (const module of ['records', 'bindings', 'manifest', 'admission', 'evaluate', 'loop', 'native', 'collaboration', 'coordination', 'publication', 'review', 'gpu']) moduleHashes[module] = sha256(await readFile(join(packageRoot, `dist/${module}.js`)))
  const profile = await json('snapshots/profile.json', { scope: 'synthetic_released_cpu', confirmation: 'off', author_tools: options.authorTools ?? ['research_run'], reviewer_tools: [], maxConcurrentJobsPerOwner: 1,
    tool_registration: options.registration ?? { toolScope: 'host' }, default_worker: Boolean(options.context),
    native_review: options.nativeReview ?? null,
    execution_sandbox: options.executionSandbox ?? null,
    qualification_limits: { max_attempts: options.maxAttempts ?? 8, max_review_requests: options.maxReviews ?? 8, max_total_timeout_ms: options.maxTotalTimeoutMs ?? 16000 },
    package_modules: moduleHashes, example_driver_sha256: sha256(await readFile(fileURLToPath(import.meta.url))) })
  const registration = await json('snapshots/registration.json', { project_root: root, authority_id: 'synthetic-m2', writer_id: 'synthetic-host', scope: 'synthetic development only' })
  const authority = { project_id: 'synthetic-m2', project_root: root, authority_id: 'synthetic-m2', writer_id: 'synthetic-host', registration }
  const lock = await source('snapshots/lock.yaml', join(packageRoot, 'dist/qualification-lock.yaml'))
  const binding = { contract_ref: { id: 'dsh-research/research-loop', version: row.contract_version, artifact: contract },
    compatibility_row_ref: { register: registerRef, contract_version: row.contract_version, row_id: row.row_id, row_sha256: sha256(canonicalJson(row)), table_sha256: register.table_sha256 },
    authority, profile: { revision: 'synthetic-m2-v1', effective: profile, lock, releases, confirmation: 'off', assurance: 'implemented' } }
  const evaluator = await source('snapshots/evaluate.mjs', options.evaluatorPath ?? join(packageRoot, 'examples/synthetic-cpu/evaluate.mjs'))
  const verifier = await source('snapshots/verifier.mjs', join(packageRoot, 'examples/synthetic-cpu/verifier.mjs'))
  const verifyDomain = (await import(pathToFileURL(join(root, verifier.uri)).href)).verify
  const domainPolicy = await json('snapshots/domain-policy.json', { scope: 'synthetic released inputs only', score_meaning: 'positive/negative support relative to a zero synthetic baseline', verifier })
  const reviewerPreset = await json('snapshots/reviewer-preset.json', { session_id: reviewerId, provider: 'synthetic-reviewer', model: 'scripted' })
  const permissions = await json('snapshots/reviewer-permissions.json', { tools: [], boundary: 'native tool guard; trusted same account' })
  const policy = { scope: 'synthetic_released_cpu', authority, binding, goal_id: 'synthetic-cpu', goal_revision: 'r1', max_attempts: options.maxAttempts ?? 8,
    max_timeout_ms: options.actionTimeoutMs ?? 2000, max_total_timeout_ms: options.maxTotalTimeoutMs ?? 16000, max_output_bytes: 8192, allowed_executables: [process.execPath],
    allowed_operations: options.allowedOperations ?? ['negative', 'positive', 'timeout-zero', 'invalid-output', 'drift', 'unknown-launch', 'baseline'], domain_policy: domainPolicy, verifier, entrypoint: evaluator,
    reviewer: { session_id: reviewerId, provider: 'synthetic-reviewer', preset: reviewerPreset, permissions },
    ...(options.automaticReview ? { review_limits: { max_requests: options.maxReviews ?? 8, timeout_ms: options.reviewTimeout ?? 2000, subagent_provider: options.reviewProvider ?? options.nativeReview?.provider ?? 'synthetic-review', model: 'scripted' } } : {}),
    allowed_read_prefixes: ['snapshots/', 'local_artifacts/autoresearch/dsh/'] }
  const policyRef = await json('snapshots/policy.json', policy)
  if (table.get('synthetic-m2')) throw new Error('Synthetic fixture cannot overwrite an existing authority; use retained-state reopen')
  await table.put('synthetic-m2', ResearchStateSchema.parse({ schema_version: 3, consumed_review_requests: 0, review_requests: {}, rejected_subjects: {}, feedback: { cursors: {}, items: {} }, publications: {}, authority, binding, policy: policyRef,
    revision: 0, stopped: false, consumed_attempts: 0, consumed_timeout_ms: 0, reserved_timeout_ms: 0, consumed_reviews: [], active_action_id: null, actions: {}, hold: null }))
  const config = { artifacts, table, projectKey: 'synthetic-m2', policy: policyRef, authorSessionId: author.id, authorTools: options.authorTools ?? ['research_run'],
    ...(options.context ? { executionShell: options.executionShell ?? author.ctx.shell, assertActiveAuthority: options.assertActiveAuthority } : {}),
    verifier: { identity: verifier, verify: verifyDomain }, observe: (event, detail) => trace.push({ event, detail }) }
  if (options.executionSandboxResolver) config.executionSandbox = { profile: binding.profile.effective, resolve: options.executionSandboxResolver }
  const adapter = await NativeResearchAdapter.open(ctx, config)
  if (!options.automaticReview) unregister = adapter.register(options.registration)
  const context = await json('snapshots/context.json', { purpose: 'M2 qualification; no scientific project data' })
  const interpreter = await json('snapshots/interpreter.json', { executable: process.execPath, version: process.version, platform: process.platform, arch: process.arch })
  const environment = await json('snapshots/environment.json', { cwd: root, explicit_env: {} })
  const inventory = await json('snapshots/inventory.json', { files: [
    { artifact: evaluator, mode: (await stat(join(root, evaluator.uri))).mode & 0o777 },
    { artifact: verifier, mode: (await stat(join(root, verifier.uri))).mode & 0o777 }], relevant_untracked: true, submodules: [] })
  const outputSchema = await json('snapshots/output-schema.json', { score: 'finite_number', additional_fields: false })
  let ordinal = 0
  async function makeSubject(mode, extra = {}) {
    ordinal++
    const planRevision = extra.plan_revision ?? `case-${ordinal}`
    const inputUri = `snapshots/input-${sha256(planRevision + mode)}.json`
    const inputBytes = Buffer.from(canonicalJson({ values: [1, 2, 3], ...(options.inputMetadata ?? {}) }))
    const input = { uri: inputUri, sha256: sha256(inputBytes), size_bytes: inputBytes.length }
    try { await artifacts.write(inputUri, inputBytes) } catch (error) { if (error.code !== 'EEXIST') throw error; await artifacts.read(input) }
    const subject = { schema_version: 1, kind: 'manifest', binding, author_session_id: author.id, original_prompt: options.originalPrompt ?? `Run the frozen synthetic CPU ${mode} case`,
      goal: { id: 'synthetic-cpu', revision: 'r1', context, checkpoint: extra.checkpoint ?? null }, plan: { revision: planRevision, snapshot: context, purpose: 'deliberate' }, architecture: profile,
      candidate: { commit: 'synthetic-frozen-content', tree: evaluator, configuration: context, snapshot_kind: 'content_snapshot', content_inventory: inventory },
      evaluator: { verifier, interpreter, environment }, inputs: [{ artifact: input, version: 'synthetic-v1', split: 'synthetic', purpose: 'C_qual', access: 'released' }],
      invocation: { executable: process.execPath, argv: [join(root, evaluator.uri), join(root, input.uri), mode], cwd: root, env: {} },
      bounds: { timeout_ms: mode === 'timeout-zero' ? (options.deadlineMs ?? 200) : policy.max_timeout_ms, max_attempts: policy.max_attempts, timeout_reservation_ms: policy.max_total_timeout_ms, concurrency: 1, resource_policy: policyRef },
      output: { schema: outputSchema, required_fields: { score: 'finite_number' }, additional_fields: false }, domain_policy: domainPolicy,
      proposal: { decision: 'continue', operation: mode, prerequisites: [], retry: null } }
    return subject
  }
  async function prepare(mode) {
    const subject = await makeSubject(mode)
    const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
    const manifestRef = await json(`snapshots/manifest-${ordinal}.json`, manifest)
    const request = await json(`snapshots/review-request-${ordinal}.json`, { subject_kind: 'scientific_action', action_id: manifest.action_id, manifest_sha256: manifestRef.sha256 })
    const reviewId = `synthetic-review-${ordinal}`
    reviewerLLM.script.push(text(JSON.stringify({ decision: 'approve', action_id: manifest.action_id, manifest_sha256: manifestRef.sha256, request_sha256: request.sha256, review_id: reviewId })))
    reviewer.followup(createUserMessage({ content: [{ type: 'text', text: `Review exact synthetic request ${canonicalJson(request)} and manifest ${canonicalJson(manifestRef)}` }], source: { kind: 'user' } }))
    await reviewer.whenIdle()
    const completion = await json(`snapshots/review-completion-${ordinal}.json`, { session_id: reviewerId, provider: 'synthetic-reviewer', events: reviewer.session.snapshotEvents() })
    const proposalRef = await json(`snapshots/proposal-${ordinal}.json`, manifest.proposal)
    const review = ReviewSchema.parse({ schema_version: 1, kind: 'review', binding, review_id: reviewId, subject_kind: 'scientific_action', request, packet: manifestRef, subject: manifestRef,
      manifest: manifestRef, checkpoint: null, action_id: manifest.action_id, author_session_id: author.id,
      reviewer: { session_id: reviewerId, provider: 'synthetic-reviewer', preset: reviewerPreset, permissions, assurance: 'implemented' },
      completion, status: 'completed', decision: 'approve', reason: 'Scripted exact-subject fixture approval', evidence: [],
      scope: { consumable_once: true, proposal: proposalRef, bounds: manifest.bounds, prerequisites: [] }, hold: null })
    return { manifest, manifestRef, request: { manifest: manifestRef, review: await json(`snapshots/review-${ordinal}.json`, review), expected_revision: table.get('synthetic-m2').revision } }
  }
  async function collected(association) {
    return { evidence: association.evidence && JSON.parse(Buffer.from(await artifacts.read(association.evidence)).toString()), checkpoint: association.checkpoint && JSON.parse(Buffer.from(await artifacts.read(association.checkpoint)).toString()) }
  }

  return { root, artifacts, ctx, table, domain, backend, removeBackend, unregister, config, adapter, binding, policy, policyRef, author, reviewer, reviewerId, authorLLM, reviewerLLM, trace, cases, json, prepare, collected, makeSubject,
    close: async () => { unregister?.(); await domain.close(); await backend.close(); removeBackend?.(); if (!options.context) await ctx.fiber.dispose() } }
  } catch (error) { unregister?.(); await domain?.close(); await backend?.close(); removeBackend?.(); if (!options.context) await ctx.fiber.dispose(); throw error }
}
