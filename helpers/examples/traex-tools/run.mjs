// Real model-selected native research call on disposable engineering authority.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { TraexToolAdapter } from 'dsh-research/traex-tools'
import { sha256 } from 'dsh-research'
import { createCpuFixture } from '../synthetic-cpu/fixture.mjs'

const root = resolve(process.argv[2] ?? '')
const executable = process.argv[3]
if (!process.argv[2] || !executable) throw new Error('Usage: run.mjs <fresh-output-root> <authenticated-traecli>')
const model = new TraexToolAdapter({ executable, projectRoot: root, artifactsRoot: join(root, 'private-model-requests'),
  model: 'DeepSeek-V4.1-Flash', timeoutMs: 120000, maxRequests: 4, maxToolCallsPerTurn: 1 })
const f = await createCpuFixture(root, { authorLLM: model, authorProvider: 'traex-native-tools', authorModel: 'DeepSeek-V4.1-Flash',
  maxAttempts: 1, maxTotalTimeoutMs: 2000, allowedOperations: ['negative'],
  originalPrompt: 'Qualify one model-selected native guarded research call on disposable engineering inputs.' })
try {
  const prepared = await f.prepare('negative')
  f.author.followup(createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text:
    'This is disposable software qualification, not Accorde GPU science. Call research_run once with exactly ' +
    JSON.stringify(prepared.request) + '. The frozen synthetic manifest already has separate scripted native review. ' +
    'After the actual tool result, finish with a concise truthful interpretation of the retained evidence, including the negative result. ' +
    'Do not invent results, call other tools, ask a human, change arguments or launch another action.' }] }))
  await f.author.whenIdle()
  const state = f.table.get('synthetic-m2')
  const action = state.actions[prepared.manifest.action_id]
  assert.equal(action?.phase, 'settled')
  const captured = await f.collected(action)
  assert.equal(captured.evidence.evidence_status, 'valid')
  assert.equal(captured.evidence.verifier.verdict, 'negative')
  assert.equal(state.consumed_attempts, 1)
  assert.equal(state.reserved_timeout_ms, 0)
  const events = f.author.session.snapshotEvents()
  const calls = events.filter(e => e.type === 'tool/call' && e.data.name === 'research_run')
  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].data.arguments), prepared.request)
  assert.ok(model.receipts.length >= 2 && model.receipts.length <= 4)
  assert.equal(model.receipts.flatMap(r => r.calls).length, 1)
  const replay = await f.adapter.run(prepared.request, f.author, new AbortController().signal)
  assert.equal(replay.replay, true)
  assert.equal(f.table.get('synthetic-m2').consumed_attempts, 1)
  const pins = {}
  for (const name of ['src/traex-tools.ts', 'src/traex.ts', 'src/native.ts', 'examples/synthetic-cpu/fixture.mjs', 'examples/traex-tools/run.mjs'])
    pins[name] = sha256(await readFile(new URL('../../' + name, import.meta.url)))
  const receipt = { schema_version: 1, timestamp: new Date().toISOString(), status: 'passed',
    scope: 'Real DeepSeek-V4.1-Flash structured text projected to one guarded native research tool; disposable engineering only',
    source_pins: pins, bounds: { model_requests: 4, per_request_ms: 120000, native_calls_per_turn: 1, synthetic_admissions: 1, evaluator_ms: 2000 },
    actual_model_requests: model.receipts.length, model_receipts: model.receipts, native_events: events,
    scripted_reviewer_events: f.reviewer.session.snapshotEvents(), action, evidence: captured.evidence, checkpoint: captured.checkpoint,
    assertions: { exact_model_selected_native_call: true, valid_negative: true, replay_preserves_charge: true, usage_before_finish: true },
    scientific_project_dispatches: 0, output_token_cap: null, production_default_worker_qualified: false,
    limitations: ['Native author on public AgentLoop test harness; no default production deployment',
      'Exact review completion is scripted; live scientific review remains unqualified', 'No GPU dispatch or existing-project authority adoption'] }
  await writeFile(join(root, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: 'passed', receipt: join(root, 'receipt.json'), model_calls: model.receipts.length, native_calls: calls.length }))
} catch (error) {
  await writeFile(join(root, 'failure.json'), JSON.stringify({ timestamp: new Date().toISOString(), error: String(error),
    state: f.table.get('synthetic-m2'), model_receipts: model.receipts, native_events: f.author.session.snapshotEvents() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  throw error
} finally { await f.close() }
