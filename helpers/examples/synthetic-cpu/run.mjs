import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ToolCallId, createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import { ReviewSchema } from 'dsh-research'
import { NativeResearchAdapter, researchDomain } from 'dsh-research/native'
import { createCpuFixture, text, tool } from './fixture.mjs'

const outputArg = process.argv[2]
if (!outputArg) throw new Error('Usage: node examples/synthetic-cpu/run.mjs <fresh-output-directory>')
const fixture = await createCpuFixture(outputArg)
const { root, artifacts, ctx, table, adapter, config, binding, author, reviewer, authorLLM, trace, cases, json, prepare, collected } = fixture
let { domain, backend, removeBackend, unregister } = fixture
try {
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
    sessions: [author, reviewer].filter(Boolean).map(agent => ({ id: agent.id, events: agent.session.snapshotEvents() })) }, null, 2) + '\n', { flag: 'wx' })
  throw error
} finally {
  unregister?.()
  await domain?.close()
  await backend?.close()
  removeBackend?.()
  await ctx.fiber.dispose()
}
