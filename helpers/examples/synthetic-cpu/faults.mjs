import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { NativeCoordinationTools, NativeReviewDriver, NativeResearchAdapter } from 'dsh-research/native'
import { auditCoverage, auditContinuity, PropertyId, progressReport } from 'dsh-research'
import { createCpuFixture, text } from './fixture.mjs'

const output = process.argv[2]
if (!output) throw new Error('Usage: node examples/synthetic-cpu/faults.mjs <fresh-output-directory>')
await mkdir(resolve(output), { recursive: false })
const root = resolve(output)
const tools = ['research_run', 'research_review', 'research_propose', 'research_feedback']
const results = []
async function setup(path, options = {}) {
  const f = await createCpuFixture(path, { automaticReview: true, authorTools: tools, ...options })
  const coordination = new NativeCoordinationTools(f.ctx, { artifacts: f.artifacts, table: f.table, projectKey: f.config.projectKey, authorSessionId: f.author.id,
    propose: args => f.makeSubject(args.operation, args) })
  const driver = await NativeReviewDriver.open(f.ctx, { artifacts: f.artifacts, table: options.reviewTable?.(f.table) ?? f.table, projectKey: f.config.projectKey,
    policy: f.policyRef, authorSessionId: f.author.id, deniedTools: tools, observe: (event, detail) => f.trace.push({ event, detail }) })
  const disposers = coordination.tools().map(definition => f.ctx.tools.register(definition))
  disposers.push(f.ctx.tools.register(driver.tool()), f.adapter.register())
  return { f, coordination, driver, close: async () => { for (const dispose of disposers.reverse()) dispose(); await f.close() } }
}
const timeout = await setup(join(root, 'review-timeout'), { reviewTimeout: 100 })
try {
  const { f, coordination, driver } = timeout
  const scope = await f.json('snapshots/qualification-scope.json', { fixture: 'review timeout', confirmation: 'off', observation: 'public native interfaces only' })
  const budget = await f.json('snapshots/qualification-budget.json', { max_evaluator_dispatches: 0, max_reviewer_dispatches: 1 })
  const matrix = { id: 'all-properties-review-timeout', binding: f.binding, scope, qualification_budget_ref: budget,
    cells: ['AUTH-1', 'LOOP-3'].map(property => ({ id: `${property}:rejecting`, property, kind: 'rejecting',
      assurance: 'fixture_verified', assertions: { predicate: true }, applicability_rule: null })) }
  const matrixRef = await f.json('snapshots/qualification-matrix.json', matrix) // Frozen before reviewer dispatch.
  f.reviewerLLM.script.push('hang')
  const proposal = await coordination.propose({ operation: 'negative', plan_revision: 'timeout', checkpoint: null, feedback_item_id: null }, f.author)
  const result = await driver.review(proposal.manifest, f.author, new AbortController().signal)
  assert.equal(result.status, 'unavailable')
  const state = f.table.get(f.config.projectKey)
  assert.equal(state.consumed_attempts, 0); assert.equal(state.consumed_review_requests, 1)
  assert.equal(state.hold.kind, 'review_unavailable')
  assert.equal(progressReport('operational_hold', state.hold.reason).human_action, null)
  const duplicate = await driver.review(proposal.manifest, f.author, new AbortController().signal)
  assert.equal(duplicate.replay, true); assert.equal(f.table.get(f.config.projectKey).consumed_review_requests, 1)
  const evidence = await f.json('snapshots/reviewer-timeout-evidence.json', { result, state, trace: f.trace })
  const observations = [{ cell_id: 'AUTH-1:rejecting', binding: f.binding, scope, assurance: 'fixture_verified', evidence, assertions: { predicate: state.consumed_attempts === 0 }, applicability_rule: null },
    { cell_id: 'LOOP-3:rejecting', binding: f.binding, scope, assurance: 'fixture_verified', evidence, assertions: { predicate: progressReport('operational_hold', 'native hold').human_action === null }, applicability_rule: null }]
  const coverage = auditCoverage(matrix, observations)
  assert.equal(coverage.complete, true)
  results.push({ fixture: 'review-timeout', matrix: matrixRef, coverage, evidence,
    limitation: 'This observed hold cannot satisfy missing scientific or live qualification cells.' })
} finally { await timeout.close() }

let failAssociation = true
const interrupted = await setup(join(root, 'association-and-ack'), { reviewTable: table => ({
  get: key => table.get(key),
  update: (key, transform) => table.update(key, current => {
    const next = transform(current)
    if (failAssociation && Object.values(next.review_requests).some(r => r.phase === 'observed')) { failAssociation = false; throw new Error('Controlled loss before reviewer association commit') }
    return next
  }),
}) })
try {
  const { f, coordination, driver } = interrupted
  const before = structuredClone(f.table.get(f.config.projectKey))
  f.reviewerLLM.script.push(options => {
    const block = options.messages.flatMap(m => m.content ?? []).findLast(b => b.type === 'text' && b.text.includes('REVIEW_PACKET_JSON\n'))
    const packet = JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1))
    return text(JSON.stringify({ decision: 'approve', reason: 'Exact synthetic scope', review_id: packet.review_id, action_id: packet.action_id,
      manifest_sha256: packet.manifest_sha256, request_sha256: packet.request_sha256 }))
  })
  const proposal = await coordination.propose({ operation: 'negative', plan_revision: 'association', checkpoint: null, feedback_item_id: null }, f.author)
  const unknown = await driver.review(proposal.manifest, f.author, new AbortController().signal)
  assert.equal(unknown.status, 'unknown')
  await f.ctx.subagents.waitForChildren(f.author)
  const reconciled = await driver.review(proposal.manifest, f.author, new AbortController().signal)
  assert.equal(reconciled.replay, true); assert.equal(reconciled.decision, 'approve')
  assert.equal(f.table.get(f.config.projectKey).consumed_review_requests, 1)
  const gate = Promise.withResolvers()
  const entered = Promise.withResolvers()
  let delayed = false
  const delayedTable = { get: key => f.table.get(key), update: async (key, transform) => {
    const previous = f.table.get(key).consumed_attempts
    const committed = await f.table.update(key, transform)
    if (!delayed && committed.consumed_attempts > previous) { delayed = true; entered.resolve(); await gate.promise }
    return committed
  } }
  const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, table: delayedTable })
  const run = adapter.run({ manifest: proposal.manifest, review: reconciled.review, expected_revision: f.table.get(f.config.projectKey).revision }, f.author, new AbortController().signal)
  await entered.promise
  assert.equal(f.ctx.jobs.list(f.author.id).length, 0)
  assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
  gate.resolve()
  const completed = await run
  assert.equal(completed.status, 'settled')
  const repeated = await adapter.run({ manifest: proposal.manifest, review: reconciled.review, expected_revision: 0 }, f.author, new AbortController().signal)
  assert.equal(repeated.job_id, completed.job_id); assert.equal(repeated.replay, true)
  const after = structuredClone(f.table.get(f.config.projectKey))
  assert.equal(auditContinuity(before, after).preserved, true)
  assert.equal(auditContinuity(after, before).preserved, false)
  results.push({ fixture: 'association-and-ack', recovered_review: reconciled, completed, state: after, trace: f.trace,
    assertions: { no_duplicate_reviewer: true, no_dispatch_before_ack: true, one_scientific_attempt: true, stale_rollback_refused: true } })
} finally { await interrupted.close() }
await writeFile(join(root, 'receipt.json'), JSON.stringify({ schema_version: 1, timestamp: new Date().toISOString(), results,
  synthetic_evaluator_dispatches: 1, external_model_calls: 0, global_qualification: 'incomplete; this fault stratum does not close the full accepted route matrix', required_property_ids: PropertyId.options }, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ receipt: join(root, 'receipt.json'), fixtures: results.length, evaluator_dispatches: 1, status: 'passed' }))
